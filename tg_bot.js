const fs = require('fs');
const path = require('path');
const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN || '8676877978:AAGmD-92Sza4tH8U03RdnWoj0WWnP-cYQqE';
const SITE_URL = 'https://sasbov.online';

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const ADMINS_FILE = path.join(DATA_DIR, 'admin_users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// Ensure essential directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Optional Redis sync
let redisClient = null;
async function getRedis() {
  if (redisClient && redisClient.isOpen) return redisClient;
  try {
    let url = process.env.REDIS_URL;
    if (!url && fs.existsSync(path.join(ROOT_DIR, '.env.development.local'))) {
      const env = fs.readFileSync(path.join(ROOT_DIR, '.env.development.local'), 'utf8');
      const m = env.match(/REDIS_URL=["']?([^"'\r\n]+)/);
      if (m) url = m[1].trim();
    }
    if (!url) return null;
    const { createClient } = require('redis');
    redisClient = createClient({ url });
    redisClient.on('error', () => {});
    await redisClient.connect();
    return redisClient;
  } catch (e) {
    return null;
  }
}

async function syncToRedis(list) {
  try {
    const r = await getRedis();
    if (r) {
      await r.set('sasbov_market_products_v1', JSON.stringify(list));
      console.log(`[TG Bot] Synced ${list.length} products to Redis.`);
    }
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// Admin Authorization & Unbreakable Anti-Brute-Force Password Store
// ---------------------------------------------------------------------------
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin_config.json');
const failedAttempts = new Map(); // userId -> { count: number, lockedUntil: number }

function loadAdminConfig() {
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {
    password: process.env.ADMIN_BOT_PASSWORD || 'SASBOV_2026_ADMIN_SECURE',
    authorized_ids: [],
    users: {}
  };
}

function saveAdminConfig(data) {
  try {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

let adminConfig = loadAdminConfig();

function isAuthorized(userId) {
  const uid = Number(userId);
  return Array.isArray(adminConfig.authorized_ids) && adminConfig.authorized_ids.includes(uid);
}

function authorizeUser(user) {
  const uid = Number(user.id);
  if (!Array.isArray(adminConfig.authorized_ids)) adminConfig.authorized_ids = [];
  if (!adminConfig.authorized_ids.includes(uid)) {
    adminConfig.authorized_ids.push(uid);
  }
  if (!adminConfig.users) adminConfig.users = {};
  adminConfig.users[uid] = {
    id: uid,
    username: user.username || '',
    first_name: user.first_name || '',
    authorized_at: new Date().toISOString()
  };
  saveAdminConfig(adminConfig);
  failedAttempts.delete(uid);
}

function deauthorizeUser(userId) {
  const uid = Number(userId);
  if (Array.isArray(adminConfig.authorized_ids)) {
    adminConfig.authorized_ids = adminConfig.authorized_ids.filter(id => id !== uid);
  }
  if (adminConfig.users && adminConfig.users[uid]) {
    delete adminConfig.users[uid];
  }
  saveAdminConfig(adminConfig);
}

function isLockedOut(userId) {
  const entry = failedAttempts.get(Number(userId));
  if (!entry || !entry.lockedUntil) return false;
  if (Date.now() < entry.lockedUntil) return true;
  failedAttempts.delete(Number(userId));
  return false;
}

function getLockoutMinutes(userId) {
  const entry = failedAttempts.get(Number(userId));
  if (!entry || !entry.lockedUntil) return 0;
  return Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 60000));
}

function registerFailedAttempt(userId) {
  const uid = Number(userId);
  const entry = failedAttempts.get(uid) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 3) {
    entry.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 min lockout
  }
  failedAttempts.set(uid, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Telegram API Client (With Strict Sockets Timeout to Prevent Freezing)
// ---------------------------------------------------------------------------
function callTelegram(method, data, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data || {});
    const req = https.request(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch (e) {
          resolve({ ok: false, error: 'JSON parse error', raw: chunks });
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout: ${method} exceeded ${timeoutMs}ms`));
    });

    req.on('error', err => {
      resolve({ ok: false, error: err.message });
    });

    req.write(body);
    req.end();
  });
}

// Download photo from Telegram to uploads/
async function downloadTelegramPhoto(fileId, prefix = 'item') {
  const fileRes = await callTelegram('getFile', { file_id: fileId });
  if (!fileRes.ok || !fileRes.result || !fileRes.result.file_path) {
    throw new Error('Не удалось получить файл от Telegram');
  }

  const filePath = fileRes.result.file_path;
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const ext = path.extname(filePath) || '.jpg';
  const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
  const dest = path.join(UPLOADS_DIR, filename);

  await new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error('Ошибка загрузки: ' + res.statusCode));
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', reject);
  });

  return `/uploads/${filename}`;
}

// ---------------------------------------------------------------------------
// Search Tags & Item Type Taxonomy Helpers
// ---------------------------------------------------------------------------
function getItemTypeTags(itemType) {
  const norm = (itemType || '').toLowerCase().trim();
  const map = {
    'зип-худи': ['зип-худи', 'зипхуди', 'zip hoodie', 'zip-hoodie', 'zip', 'худи', 'hoodie', 'одежда'],
    'худи': ['худи', 'hoodie', 'толстовка', 'одежда'],
    'свитшот': ['свитшот', 'sweatshirt', 'кофта', 'одежда'],
    'футболка': ['футболка', 'футболки', 'tee', 't-shirt', 't shirt', 'тишка', 'одежда'],
    'лонгслив': ['лонгслив', 'longsleeve', 'одежда'],
    'джинсы': ['джинсы', 'джинс', 'jeans', 'denim', 'штаны', 'одежда'],
    'штаны': ['штаны', 'брюки', 'pants', 'trousers', 'одежда'],
    'свитпэнтс': ['свитпэнтс', 'sweatpants', 'джоггеры', 'штаны', 'одежда'],
    'шорты': ['шорты', 'shorts', 'одежда'],
    'ветровка': ['ветровка', 'ветровки', 'windbreaker', 'куртка', 'одежда'],
    'куртка': ['куртка', 'куртки', 'jacket', 'одежда'],
    'пуховик': ['пуховик', 'пуховики', 'puffer', 'down jacket', 'куртка', 'одежда'],
    'жилетка': ['жилетка', 'жилетки', 'vest', 'одежда'],
    'очки': ['очки', 'sunglasses', 'glasses', 'аксессуары'],
    'часы': ['часы', 'watch', 'watches', 'аксессуары'],
    'карты': ['карты', 'колода карт', 'playing cards', 'cards', 'deck', 'аксессуары'],
    'пепельница': ['пепельница', 'пепельницы', 'ashtray', 'аксессуары'],
    'ковёр': ['ковёр', 'ковер', 'ковры', 'rug', 'carpet', 'аксессуары'],
    'бритва': ['бритва', 'бритвы', 'razor', 'аксессуары'],
    'игрушки': ['игрушки', 'игрушка', 'toy', 'figure', 'bearbrick', 'аксессуары'],
    'кроссовки': ['кроссовки', 'кроссы', 'sneakers', 'shoes', 'обувь'],
    'кеды': ['кеды', 'skate shoes', 'обувь'],
    'ботинки': ['ботинки', 'boots', 'обувь'],
    'тапки': ['тапки', 'мюли', 'slippers', 'mules', 'slides', 'обувь'],
    'сумка': ['сумка', 'сумки', 'bag', 'рюкзак', 'backpack', 'аксессуары'],
    'ремень': ['ремень', 'ремни', 'belt', 'аксессуары'],
    'кепка': ['кепка', 'кепки', 'шапка', 'cap', 'beanie', 'hat', 'аксессуары']
  };

  for (const [key, tags] of Object.entries(map)) {
    if (norm.includes(key) || tags.some(t => norm.includes(t))) {
      return Array.from(new Set([norm, ...tags]));
    }
  }
  return [norm];
}

function deduceCategoryFromItemType(itemType) {
  const norm = (itemType || '').toLowerCase().trim();
  const footwear = ['кроссовки', 'кеды', 'ботинки', 'тапки', 'мюли', 'shoes', 'sneakers', 'boots'];
  const accessories = ['очки', 'часы', 'карты', 'пепельниц', 'ков', 'бритв', 'игрушк', 'сумк', 'ремен', 'кепк', 'шапк', 'glasses', 'watch', 'ashtray', 'rug', 'toy', 'bag', 'belt', 'cap'];

  if (footwear.some(w => norm.includes(w))) return 'footwear';
  if (accessories.some(w => norm.includes(w))) return 'accessories';
  return 'clothing';
}

// ---------------------------------------------------------------------------
// Products Data Persistence & Backups
// ---------------------------------------------------------------------------
function loadProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveProducts(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
  const backupFile = path.join(BACKUPS_DIR, `products_${Date.now()}.json`);
  try {
    fs.writeFileSync(backupFile, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {}
  syncToRedis(products);
}

// ---------------------------------------------------------------------------
// Step-by-Step Manual Sessions
// ---------------------------------------------------------------------------
const userSessions = new Map();

function getSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, { step: 'idle', draft: { images: [] } });
  }
  return userSessions.get(chatId);
}

function clearSession(chatId) {
  userSessions.delete(chatId);
}

// Main Keyboard
const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: '➕ Добавить товар' }, { text: '📦 Каталог товаров' }],
    [{ text: '🔍 Поиск товара' }, { text: '📊 Статистика' }],
    [{ text: '🌐 Открыть сайт' }, { text: '🔒 Выйти (Logout)' }]
  ],
  resize_keyboard: true
};

// Top popular brands keyboard for quick 1-tap select
const POPULAR_BRANDS_KEYBOARD = [
  [
    { text: 'Arc\'teryx', callback_data: 'quick_brand:Arc\'teryx' },
    { text: 'Chrome Hearts', callback_data: 'quick_brand:Chrome Hearts' },
    { text: 'Denim Tears', callback_data: 'quick_brand:Denim Tears' }
  ],
  [
    { text: 'Sp5der', callback_data: 'quick_brand:Sp5der' },
    { text: 'Stone Island', callback_data: 'quick_brand:Stone Island' },
    { text: 'Rick Owens', callback_data: 'quick_brand:Rick Owens' }
  ],
  [
    { text: 'Balenciaga', callback_data: 'quick_brand:Balenciaga' },
    { text: 'Hellstar', callback_data: 'quick_brand:Hellstar' },
    { text: 'Travis Scott x Jordan', callback_data: 'quick_brand:Travis Scott x Jordan' }
  ],
  [
    { text: 'Corteiz', callback_data: 'quick_brand:Corteiz' },
    { text: 'Gallery Dept', callback_data: 'quick_brand:Gallery Dept' },
    { text: 'Stussy', callback_data: 'quick_brand:Stussy' }
  ],
  [
    { text: '❌ Отменить черновик', callback_data: 'cancel_draft' }
  ]
];

// Streetwear Item Types Taxonomy Keyboard
const ITEM_TYPES_KEYBOARD = [
  [
    { text: '🧥 Зип-худи', callback_data: 'quick_type:Зип-худи' },
    { text: '🧥 Худи', callback_data: 'quick_type:Худи' },
    { text: '👕 Футболка', callback_data: 'quick_type:Футболка' }
  ],
  [
    { text: '👖 Джинсы', callback_data: 'quick_type:Джинсы' },
    { text: '👖 Штаны', callback_data: 'quick_type:Штаны' },
    { text: '👖 Свитпэнтс', callback_data: 'quick_type:Свитпэнтс' }
  ],
  [
    { text: '🧥 Пуховик', callback_data: 'quick_type:Пуховик' },
    { text: '🧥 Куртка', callback_data: 'quick_type:Куртка' },
    { text: '🧥 Ветровка', callback_data: 'quick_type:Ветровка' }
  ],
  [
    { text: '🦺 Жилетка', callback_data: 'quick_type:Жилетка' },
    { text: '👟 Кроссовки', callback_data: 'quick_type:Кроссовки' },
    { text: '👟 Кеды', callback_data: 'quick_type:Кеды' }
  ],
  [
    { text: '🕶 Очки', callback_data: 'quick_type:Очки' },
    { text: '⌚ Часы', callback_data: 'quick_type:Часы' },
    { text: '🃏 Карты', callback_data: 'quick_type:Карты' }
  ],
  [
    { text: '🚬 Пепельница', callback_data: 'quick_type:Пепельница' },
    { text: '🧶 Ковёр', callback_data: 'quick_type:Ковёр' },
    { text: '🪒 Бритва', callback_data: 'quick_type:Бритва' }
  ],
  [
    { text: '🧸 Игрушки', callback_data: 'quick_type:Игрушки' },
    { text: '👜 Сумка/Рюкзак', callback_data: 'quick_type:Сумка' },
    { text: '🥋 Ремень', callback_data: 'quick_type:Ремень' }
  ],
  [
    { text: '⬅️ Назад к модели', callback_data: 'wiz_back_to_model' },
    { text: '❌ Отменить', callback_data: 'cancel_draft' }
  ]
];

// Helper: Ask Step 1 (Brand)
function askBrand(chatId, draft, prefix = '') {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `${prefix}🏷 **ШАГ 1 ИЗ 9: БРЕНД ТОВАРА**\n\n` +
          `Введите **только название бренда** текстом\n` +
          `*(например: \`Chrome Hearts\`, \`Denim Tears\`, \`Arc'teryx\`, \`Stone Island\`, \`Rick Owens\`)*\n` +
          `либо выберите быстрый вариант ниже:\n\n` +
          `💡 *Также вы можете прикрепить фото в любой момент!*`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: POPULAR_BRANDS_KEYBOARD
    }
  });
}

// Helper: Ask Step 2 (Model)
function askModel(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `✅ Бренд зафиксирован: **${draft.brand}**\n\n` +
          `📝 **ШАГ 2 ИЗ 9: НАЗВАНИЕ МОДЕЛИ**\n\n` +
          `Введите название конкретной модели:\n` +
          `*(например: \`Beta LT\`, \`Cotton Wreath 501\`, \`Cross Patch\`, \`Track 3 White\`)*:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Назад к бренду', callback_data: 'wiz_back_to_brand' }],
        [{ text: '❌ Отменить', callback_data: 'cancel_draft' }]
      ]
    }
  });
}

// Helper: Ask Step 3 (Item Type / Search Tag)
function askItemType(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `✅ Бренд: **${draft.brand}**\n` +
          `✅ Модель: **${draft.name}**\n\n` +
          `🔖 **ШАГ 3 ИЗ 9: ТИП ВЕЩИ (ТЕГ ДЛЯ ПОИСКА)**\n\n` +
          `Выберите тип айтема кнопкой ниже либо напишите свой вариант текстом:\n` +
          `*(штаны, джинсы, свитпэнтс, футболки, худи, зипхуди, ветровки, куртки, пуховики, жилетки, очки, часы, карты, пепельницы, ковры, бритвы, игрушки)*\n\n` +
          `🔍 *По этому тегу покупатели будут находить вещь в поиске на сайте!*`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: ITEM_TYPES_KEYBOARD
    }
  });
}

// Helper: Ask Step 4 (Photos)
function askPhotos(chatId, draft) {
  const count = (draft.images || []).length;
  let text = `✅ Бренд: **${draft.brand}**\n` +
             `✅ Модель: **${draft.name}**\n` +
             `✅ Тип вещи: **${draft.itemType}**\n\n` +
             `📸 **ШАГ 4 ИЗ 9: ФОТОГРАФИИ ТОВАРА**\n\n` +
             `Прикрепите и отправьте фотографии вещи.\n` +
             `*(Можно отправить сразу несколько фото альбомом или по одной)*.\n`;
             `*(Можно отправить сразу несколько фото альбомом или по одной)*.\n`;

  const inlineKeyboard = [];

  if (count > 0) {
    text += `\n📦 Уже загружено фото: **${count} шт.**`;
    inlineKeyboard.push([{ text: `✅ Фото готовы (${count} шт.) ➡️ К описанию`, callback_data: 'wiz_photos_done' }]);
    inlineKeyboard.push([
      { text: '🔄 Очистить фото', callback_data: 'photos_clear' },
      { text: '⬅️ Назад к типу вещи', callback_data: 'wiz_back_to_itemtype' }
    ]);
  } else {
    inlineKeyboard.push([
      { text: '⬅️ Назад к типу вещи', callback_data: 'wiz_back_to_itemtype' },
      { text: '❌ Отменить', callback_data: 'cancel_draft' }
    ]);
  }

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// Helper: Ask Step 5 (Description - NEW)
function askDescription(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `📸 Фотографий в карточке: **${(draft.images || []).length} шт.**\n\n` +
          `📝 **ШАГ 5 ИЗ 9: ОПИСАНИЕ ТОВАРА**\n\n` +
          `Введите текстовое описание для карточки товара:\n` +
          `*(материал, особенности кроя, посадка, комплектность, состояние деталей)*\n\n` +
          `Либо нажмите **«⏩ Пропустить (авто-описание)»**, чтобы использовать фирменное описание SASBOV MARKET:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⏩ Пропустить (авто-описание)', callback_data: 'wiz_skip_description' }],
        [{ text: '⬅️ Назад к фото', callback_data: 'wiz_back_to_photos' }],
        [{ text: '❌ Отменить', callback_data: 'cancel_draft' }]
      ]
    }
  });
}

// Helper: Ask Step 6 (Price)
function askPrice(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `📝 Описание: **${(draft.description ? draft.description.slice(0, 80) + '...' : 'Авто-генерация')}**\n\n` +
          `💰 **ШАГ 6 ИЗ 9: ЦЕНА В РУБЛЯХ**\n\n` +
          `Введите цену в рублях (только цифры, например: \`45000\` или \`128000\`):`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Назад к описанию', callback_data: 'wiz_back_to_desc' }],
        [{ text: '❌ Отменить', callback_data: 'cancel_draft' }]
      ]
    }
  });
}

// Helper: Ask Step 7 (Sizes)
function askSizes(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `✅ Цена: **${Number(draft.price).toLocaleString('ru-RU')} ₽**\n\n` +
          `📏 **ШАГ 7 ИЗ 9: ДОСТУПНЫЕ РАЗМЕРЫ**\n\n` +
          `Введите размеры через запятую *(например: \`41, 42, 43 EU\` или \`S, M, L, XL\`)*\n` +
          `или нажмите быструю кнопку:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '👟 Обувь: 40, 41, 42, 43, 44 EU', callback_data: 'wiz_size_shoes' }],
        [{ text: '👕 Одежда: S, M, L, XL', callback_data: 'wiz_size_clothes' }],
        [{ text: '🎒 ONE SIZE (Аксессуары)', callback_data: 'wiz_size_onesize' }],
        [
          { text: '⬅️ Назад к цене', callback_data: 'wiz_back_to_price' },
          { text: '❌ Отменить', callback_data: 'cancel_draft' }
        ]
      ]
    }
  });
}

// Helper: Ask Step 8 (Condition)
function askCondition(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `✅ Размеры: **${(draft.sizes || []).join(', ')}**\n\n` +
          `✨ **ШАГ 8 ИЗ 9: СОСТОЯНИЕ ВЕЩИ:**`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✨ NEW // DEADSTOCK (Абсолютно новое)', callback_data: 'wiz_cond_new' }],
        [{ text: '💎 9.5/10 (Идеальное / Примерка)', callback_data: 'wiz_cond_95' }],
        [{ text: '⚡ 9/10 (Отличное состояние)', callback_data: 'wiz_cond_90' }],
        [{ text: '👍 8.5/10 (Хорошее состояние)', callback_data: 'wiz_cond_85' }],
        [{ text: '🔥 7/10 (Винтаж / Дистресс)', callback_data: 'wiz_cond_70' }],
        [{ text: '⬅️ Назад к размерам', callback_data: 'wiz_back_to_sizes' }]
      ]
    }
  });
}

// Helper: Ask Step 9 (Location & Stock)
function askLocation(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `📍 **ШАГ 9 ИЗ 9: ЛОКАЦИЯ, НАЛИЧИЕ ИЛИ ТРАНЗИТ:**\n\n` +
          `Выберите фактический статус товара:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🟢 В наличии в СПб (Шоурум Балконский, Невский просп., 110В)', callback_data: 'wiz_loc_spb' }],
        [{ text: '🚛 В пути из Китая в СПб (~5–8 дней / Бронь)', callback_data: 'wiz_loc_tr_spb' }],
        [{ text: '🚛 В пути из Китая в Иркутск (~3–6 дней / Бронь)', callback_data: 'wiz_loc_tr_irk' }],
        [{ text: '🇨🇳 Предзаказ на всю РФ (Китай / Poizon, 7–12 дней)', callback_data: 'wiz_loc_cn' }],
        [{ text: '🇯🇵 Предзаказ на всю РФ (Япония / Mercari JP, 7–14 дней)', callback_data: 'wiz_loc_jp' }],
        [{ text: '🌍 Предзаказ на всю РФ (Европа / Grailed, 10–16 дней)', callback_data: 'wiz_loc_glb' }],
        [{ text: '⬅️ Назад к состоянию', callback_data: 'wiz_back_to_condition' }]
      ]
    }
  });
}

// ---------------------------------------------------------------------------
// Send Final Confirmation Preview with In-Place Field Editing
// ---------------------------------------------------------------------------
async function sendFinalConfirmation(chatId, draft) {
  let statusBadge = '✈️ ПРЕДЗАКАЗ НА ВСЮ РФ';
  if (draft.stockType === 'instock') statusBadge = '🟢 В НАЛИЧИИ В СПБ';
  else if (draft.stockType === 'transit_spb') statusBadge = '🚛 В ПУТИ В СПБ (~5–8 ДН)';
  else if (draft.stockType === 'transit_irkutsk') statusBadge = '🚛 В ПУТИ В ИРКУТСК (~3–6 ДН)';

  const photosCount = (draft.images && draft.images.length) ? draft.images.length : (draft.image ? 1 : 0);
  const catLabel = draft.category === 'footwear' ? 'Обувь' : draft.category === 'clothing' ? 'Одежда' : 'Аксессуары';

  const summary = `🔍 **ПРЕДПРОСМОТР КАРТОЧКИ ТОВАРА:**\n\n` +
    `🏷 **Бренд:** ${draft.brand}\n` +
    `📦 **Модель:** ${draft.name}\n` +
    `🔖 **Тип вещи:** ${draft.itemType || 'Одежда'}\n` +
    `📸 **Фото:** ${photosCount} шт.\n` +
    `📝 **Описание:** ${draft.description || '(будет сгенерировано автоматически)'}\n` +
    `💰 **Цена:** ${Number(draft.price).toLocaleString('ru-RU')} ₽\n` +
    `📏 **Размеры:** ${(draft.sizes || []).join(', ')}\n` +
    `📁 **Категория:** ${catLabel}\n` +
    `✨ **Состояние:** ${draft.condition || 'NEW // DEADSTOCK'}\n` +
    `📍 **Логистика:** ${statusBadge}\n` +
    `⏱ **Срок:** ${draft.deliveryTime || '7–12 дней'}\n\n` +
    `👇 **Всё верно?** Нажмите **«🚀 ОПУБЛИКОВАТЬ НА САЙТ»**, либо выберите любой пункт ниже для быстрого исправления:`;

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: summary,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 ОПУБЛИКОВАТЬ НА САЙТ', callback_data: 'wiz_confirm_publish' }],
        [
          { text: '✏️ Бренд', callback_data: 'edit_field_brand' },
          { text: '✏️ Модель', callback_data: 'edit_field_model' }
        ],
        [
          { text: '🔖 Тип вещи', callback_data: 'edit_field_itemtype' },
          { text: `📸 Фото (${photosCount})`, callback_data: 'edit_field_photos' }
        ],
        [
          { text: '📝 Описание', callback_data: 'edit_field_desc' },
          { text: '💰 Цена', callback_data: 'edit_field_price' }
        ],
        [
          { text: '📏 Размеры', callback_data: 'edit_field_sizes' },
          { text: '✨ Состояние', callback_data: 'edit_field_condition' }
        ],
        [
          { text: '📍 Локация', callback_data: 'edit_field_location' },
          { text: '❌ Отменить черновик', callback_data: 'cancel_draft' }
        ]
      ]
    }
  });
}

// ---------------------------------------------------------------------------
// Message Handler
// ---------------------------------------------------------------------------
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const user = msg.from || msg.chat;
  const userId = Number(user.id);
  const text = (msg.text || '').trim();
  const session = getSession(chatId);

  console.log(`[TG INCOMING] User ${user.first_name || user.id} (@${user.username || 'unknown'}) [step: ${session.step}]: ${text || (msg.photo ? '[Photo]' : '[Media]')}`);

  // 1. Anti-Brute-Force Lockout Gate
  if (isLockedOut(userId)) {
    const minLeft = getLockoutMinutes(userId);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `⛔ **ДОСТУП ЗАБЛОКИРОВАН**\n\n` +
            `Превышен лимит попыток ввода пароля (3 из 3).\n` +
            `Система безопасности заблокировала доступ на **${minLeft} мин.** во избежание подбора.\n` +
            `Пожалуйста, подождите.`,
      parse_mode: 'Markdown'
    });
  }

  // 2. Strict Password Authentication Check
  if (!isAuthorized(userId)) {
    if (text === adminConfig.password) {
      authorizeUser(user);
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `🔓 **ПАРОЛЬ ПРИНЯТ! ДОСТУП РАЗРЕШЁН.**\n\n` +
              `Добро пожаловать в защищённую админ-панель **SASBOV MARKET**.\n` +
              `Все функции управления каталогом, архивом и добавлением товаров разблокированы.`,
        parse_mode: 'Markdown',
        reply_markup: MAIN_KEYBOARD
      });
    }

    const entry = registerFailedAttempt(userId);
    if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `⛔ **ПРЕВЫШЕН ЛИМИТ ПОПЫТОК (3 из 3)**\n\n` +
              `Доступ к админ-боту заблокирован на **30 минут** во избежание подбора пароля.`,
        parse_mode: 'Markdown'
      });
    }

    const attemptsLeft = 3 - entry.count;
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔒 **АДМИНИСТРАТИВНЫЙ ДОСТУП ЗАЩИЩЕН**\n\n` +
            `❌ Неверный пароль. Осталось попыток: **${attemptsLeft} из 3**.\n\n` +
            `Введите мастер-пароль админа для разблокировки доступа:`,
      parse_mode: 'Markdown'
    });
  }

  // 3. Admin Logout
  if (text === '🔒 Выйти (Logout)' || text === '/logout') {
    deauthorizeUser(userId);
    clearSession(chatId);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔒 **ВЫ ВЫШЛИ ИЗ АДМИН-ПАНЕЛИ**\n\nСессия успешно завершена. Для повторного входа потребуется мастер-пароль.`,
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });
  }

  // 4. Change Master Password
  if (text.startsWith('/setpassword')) {
    const parts = text.split(/\s+/);
    if (parts.length < 2 || parts[1].length < 6) {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `⚠️ **Формат команды:** \`/setpassword НОВЫЙ_ПАРОЛЬ\`\n*(Пароль должен содержать не менее 6 символов)*`,
        parse_mode: 'Markdown'
      });
    }
    const newPass = parts[1];
    adminConfig.password = newPass;
    saveAdminConfig(adminConfig);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔑 **МАСТЕР-ПАРОЛЬ УСПЕШНО ИЗМЕНЕН!**\n\nНовый пароль: \`${newPass}\`\nСохраните его в надежном месте.`,
      parse_mode: 'Markdown'
    });
  }

  // /start or /menu command
  if (text === '/start' || text === '/menu' || text.toLowerCase() === 'меню' || text.toLowerCase() === 'главная') {
    clearSession(chatId);

    callTelegram('setChatMenuButton', {
      chat_id: chatId,
      menu_button: { type: 'default' }
    }).catch(() => {});

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `👋 **ПРИВЕТ, ${user.first_name || 'АДМИНИСТРАТОР'}!**\n\n` +
            `Админ-панель **SASBOV MARKET** готова к работе.\n\n` +
            `• Пошаговое добавление товаров: Бренд, Модель, Тип вещи, Фото, **Описание**, Цена, Размеры, Состояние, Локация;\n` +
            `• Синхронизированный каталог: фильтры (СПб, В пути, Предзаказ, Архив);\n` +
            `• Редактирование цены, размеров, описания и локации в один клик;\n` +
            `• Архивация и восстановление товаров;\n` +
            `• **Готовые посты для Telegram и ВКонтакте** (копирование в 1 тап);\n` +
            `• Локации:\n` +
            `  - 🟢 **В наличии в СПб** (Шоурум Балконский, Невский 110В)\n` +
            `  - 🚛 **В пути из Китая в СПб** (~5–8 дней)\n` +
            `  - 🚛 **В пути из Китая в Иркутск** (~3–6 дней)\n` +
            `  - ✈️ **Предзаказ на всю РФ** (Poizon / Mercari, 7–12 дней)\n\n` +
            `👇 Выберите действие:`,
      parse_mode: 'Markdown',
      reply_markup: MAIN_KEYBOARD
    });
  }

  if (text === '🌐 Открыть сайт' || text === '/site') {
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🌐 **SASBOV MARKET В ОНЛАЙНЕ:**\n\n` +
            `• Главная: ${SITE_URL}\n` +
            `• Каталог: ${SITE_URL}/catalog.html\n` +
            `• Блог & Статьи: ${SITE_URL}/blog.html\n` +
            `• FAQ & Ответы: ${SITE_URL}/faq.html`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Открыть каталог на сайте', url: `${SITE_URL}/catalog.html` }]
        ]
      }
    });
  }

  if (text === '📊 Статистика' || text === '/stats') {
    const products = loadProducts();
    const active = products.filter(p => !p.archived);
    const archived = products.filter(p => p.archived);
    const instock = active.filter(p => p.stockType === 'instock' || p.region === 'spb').length;
    const transitSpb = active.filter(p => p.stockType === 'transit_spb' || p.region === 'transit_spb').length;
    const transitIrk = active.filter(p => p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk').length;
    const preorder = active.filter(p => p.stockType === 'preorder' || (!p.stockType && p.region !== 'spb')).length;

    const categories = {
      footwear: active.filter(p => p.category === 'footwear').length,
      clothing: active.filter(p => p.category === 'clothing').length,
      accessories: active.filter(p => p.category === 'accessories').length
    };

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📊 **СТАТИСТИКА SASBOV MARKET**\n\n` +
            `📦 Всего товаров в базе: **${products.length}**\n` +
            `🟢 Активных на витрине: **${active.length}**\n` +
            `📁 В архиве (скрыты): **${archived.length}**\n\n` +
            `• 🟢 В наличии в СПб (Балконский Стор): **${instock}**\n` +
            `• 🚛 В пути из Китая в СПб: **${transitSpb}**\n` +
            `• 🚛 В пути из Китая в Иркутск: **${transitIrk}**\n` +
            `• ✈️ Предзаказ на всю РФ: **${preorder}**\n\n` +
            `👟 Обувь: **${categories.footwear}** | 🧥 Одежда: **${categories.clothing}** | 🎒 Аксессуары: **${categories.accessories}**\n\n` +
            `🟢 Домен: **https://sasbov.online** (Активен)`,
      parse_mode: 'Markdown'
    });
  }

  if (text === '📦 Каталог товаров' || text === '/list' || text === '/catalog') {
    clearSession(chatId);
    return sendCatalogPage(chatId, 0, 'all');
  }

  if (text === '🔍 Поиск товара' || text === '/search') {
    session.step = 'awaiting_catalog_search';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔍 **ПОИСК ТОВАРА В КАТАЛОГЕ**\n\n` +
            `Введите поисковый запрос (название бренда, модели, типа вещи, артикула SKU или слова из описания):`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 Открыть весь каталог', callback_data: 'back_to_catalog' }],
          [{ text: '❌ Отмена', callback_data: 'cancel_draft' }]
        ]
      }
    });
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 1 (Start)
  // -------------------------------------------------------------------------
  if (text === '➕ Добавить товар' || text === '/new' || text === '/add') {
    session.step = 'awaiting_brand';
    session.draft = {
      id: `sasbov-card-${Date.now()}`,
      images: []
    };
    return askBrand(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // Photo Upload Handler (Accepts multiple photos at any stage)
  // -------------------------------------------------------------------------
  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    const bestPhoto = msg.photo[msg.photo.length - 1];
    callTelegram('sendChatAction', { chat_id: chatId, action: 'upload_photo' });

    let localPhotoPath = null;
    try {
      localPhotoPath = await downloadTelegramPhoto(bestPhoto.file_id, 'item');
    } catch (err) {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `⚠️ Ошибка загрузки фото: ${err.message}`
      });
    }

    if (!session.draft) {
      session.draft = { id: `sasbov-card-${Date.now()}`, images: [] };
    }
    if (!session.draft.images) session.draft.images = [];
    session.draft.images.push(localPhotoPath);
    session.draft.image = session.draft.images[0];

    const count = session.draft.images.length;

    // If currently editing photos from confirmation
    if (session.step === 'editing_photos') {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `📸 Фото добавлено! Всего в карточке: **${count} шт.**\n\nОтправьте ещё фото или вернитесь в предпросмотр:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Вернуться в предпросмотр', callback_data: 'back_to_preview' }],
            [{ text: '🔄 Очистить все фото', callback_data: 'photos_clear' }]
          ]
        }
      });
    }

    // If in photo step
    if (session.step === 'awaiting_photos') {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `📸 **Фото №${count} успешно сохранено!**\n\n` +
              `Можете отправить ещё фото *(детали, бирки, подошва)* или перейти к цене:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: `✅ Фото готовы (${count} шт.) ➡️ К описанию`, callback_data: 'wiz_photos_done' }],
            [
              { text: '🔄 Очистить фото', callback_data: 'photos_clear' },
              { text: '⬅️ Назад к типу вещи', callback_data: 'wiz_back_to_itemtype' }
            ]
          ]
        }
      });
    }

    // If user sent photo at Step 1 (Brand)
    if (session.step === 'awaiting_brand' || session.step === 'idle') {
      session.step = 'awaiting_brand';
      return askBrand(chatId, session.draft, `📸 **Фото сохранено (всего: ${count} шт.)!**\n\n`);
    }

    // If photo sent at step 2 (Model)
    if (session.step === 'awaiting_model') {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `📸 Фото сохранено (всего: ${count} шт.)!\n\n` +
              `📝 Введите **название модели** для бренда **${session.draft.brand}**:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⬅️ Назад к бренду', callback_data: 'wiz_back_to_brand' }],
            [{ text: '❌ Отменить', callback_data: 'cancel_draft' }]
          ]
        }
      });
    }

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📸 Фото добавлено (всего: ${count} шт.)!`
    });
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 1 -> Brand
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_brand') {
    session.draft.brand = text;
    session.step = 'awaiting_model';
    return askModel(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 2 -> Model
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_model') {
    session.draft.name = text;
    session.draft.fullName = `${session.draft.brand} ${session.draft.name}`;
    session.step = 'awaiting_item_type';
    return askItemType(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 3 -> Item Type
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_item_type') {
    session.draft.itemType = text;
    session.draft.category = deduceCategoryFromItemType(text);
    session.draft.subcategories = [text, session.draft.category];
    session.draft.tags = getItemTypeTags(text);

    if (session.draft.images && session.draft.images.length > 0) {
      session.step = 'awaiting_description';
      return askDescription(chatId, session.draft);
    } else {
      session.step = 'awaiting_photos';
      return askPhotos(chatId, session.draft);
    }
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 4 -> Photos (fallback text)
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_photos') {
    if (session.draft.images && session.draft.images.length > 0) {
      session.step = 'awaiting_description';
      return askDescription(chatId, session.draft);
    }
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `⚠️ Пожалуйста, прикрепите и отправьте хотя бы одну фотографию вещи:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Назад к типу вещи', callback_data: 'wiz_back_to_itemtype' }],
          [{ text: '❌ Отменить', callback_data: 'cancel_draft' }]
        ]
      }
    });
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 5 -> Description (Dedicated Step)
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_description') {
    session.draft.description = text;
    session.step = 'awaiting_price';
    return askPrice(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 6 -> Price
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_price') {
    const num = parseInt(text.replace(/\D/g, ''), 10);
    if (!num || isNaN(num) || num < 100) {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `⚠️ Введите корректную цену цифрами (например, \`38500\`):`
      });
    }
    session.draft.price = num;
    session.step = 'awaiting_sizes';
    return askSizes(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // Wizard: Step 7 -> Sizes
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_sizes') {
    session.draft.sizes = text.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
    if (session.draft.sizes.length === 0) session.draft.sizes = [text];
    session.step = 'awaiting_condition';
    return askCondition(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // In-Place Edit Handlers (From Final Confirmation)
  // -------------------------------------------------------------------------
  if (session.step === 'editing_brand') {
    session.draft.brand = text;
    session.draft.fullName = `${session.draft.brand} ${session.draft.name || ''}`;
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  if (session.step === 'editing_model') {
    session.draft.name = text;
    session.draft.fullName = `${session.draft.brand || ''} ${session.draft.name}`;
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  if (session.step === 'editing_itemtype') {
    session.draft.itemType = text;
    session.draft.category = deduceCategoryFromItemType(text);
    session.draft.subcategories = [text, session.draft.category];
    session.draft.tags = getItemTypeTags(text);
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  if (session.step === 'editing_price') {
    const num = parseInt(text.replace(/\D/g, ''), 10);
    if (num && !isNaN(num) && num >= 100) {
      session.draft.price = num;
    }
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  if (session.step === 'editing_sizes') {
    session.draft.sizes = text.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
    if (session.draft.sizes.length === 0) session.draft.sizes = [text];
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  if (session.step === 'editing_desc') {
    session.draft.description = text;
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // Live Catalog Search Handler
  // -------------------------------------------------------------------------
  if (session.step === 'awaiting_catalog_search') {
    session.step = 'idle';
    return handleCatalogSearch(chatId, text);
  }

  // -------------------------------------------------------------------------
  // Live Item Editing Handlers (From Synchronized Catalog)
  // -------------------------------------------------------------------------
  if (session.step === 'live_edit_price') {
    const num = parseInt(text.replace(/\D/g, ''), 10);
    if (!num || isNaN(num) || num < 100) {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Введите корректную цену цифрами (например: `45000`):'
      });
    }
    const products = loadProducts();
    const target = products.find(p => p.id === session.targetId);
    if (target) {
      target.price = num;
      target.basePriceRub = num;
      saveProducts(products);
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Цена для **${target.brand} ${target.name}** успешно изменена на **${num.toLocaleString('ru-RU')} ₽**!`
      });
    }
    session.step = 'idle';
    return sendProductCard(chatId, session.targetId);
  }

  if (session.step === 'live_edit_sizes') {
    const newSizes = text.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
    const products = loadProducts();
    const target = products.find(p => p.id === session.targetId);
    if (target) {
      target.sizes = newSizes.length > 0 ? newSizes : [text];
      saveProducts(products);
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Размеры для **${target.brand} ${target.name}** обновлены: **${target.sizes.join(', ')}**`
      });
    }
    session.step = 'idle';
    return sendProductCard(chatId, session.targetId);
  }

  if (session.step === 'live_edit_desc') {
    const products = loadProducts();
    const target = products.find(p => p.id === session.targetId);
    if (target) {
      target.description = text;
      saveProducts(products);
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: `✅ Описание для **${target.brand} ${target.name}** успешно обновлено!`
      });
    }
    session.step = 'idle';
    return sendProductCard(chatId, session.targetId);
  }

  // Fallback helper
  if (text && session.step === 'idle') {
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `💡 Нажмите **«➕ Добавить товар»**, чтобы опубликовать вещь на сайт, или **«📦 Каталог товаров»** для просмотра и управления.`,
      reply_markup: MAIN_KEYBOARD
    });
  }
}

// ---------------------------------------------------------------------------
// Callback Query Handler
// ---------------------------------------------------------------------------
async function handleCallback(cb) {
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data = cb.data;
  const user = cb.from;
  const userId = Number(user.id);
  const session = getSession(chatId);

  console.log(`[TG CALLBACK] ${user.first_name} (@${user.username}): ${data}`);

  // Anti-Brute-Force Lockout Check for Callbacks
  if (isLockedOut(userId)) {
    return callTelegram('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: '⛔ Доступ заблокирован (превышен лимит попыток ввода пароля)',
      show_alert: true
    });
  }

  // Authorization Check for Callbacks
  if (!isAuthorized(userId)) {
    return callTelegram('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: '🔒 Требуется авторизация! Введите мастер-пароль админа в чате.',
      show_alert: true
    });
  }

  callTelegram('answerCallbackQuery', { callback_query_id: cb.id });

  // Cancel draft
  if (data === 'cancel_draft') {
    clearSession(chatId);
    return callTelegram('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: '❌ Добавление товара отменено.',
      reply_markup: { inline_keyboard: [] }
    });
  }

  // Quick brand button select
  if (data.startsWith('quick_brand:')) {
    const brand = data.split(':')[1];
    session.draft.brand = brand;
    session.step = 'awaiting_model';
    return askModel(chatId, session.draft);
  }

  // Quick item type button select
  if (data.startsWith('quick_type:')) {
    const itemType = data.split(':')[1];
    session.draft.itemType = itemType;
    session.draft.category = deduceCategoryFromItemType(itemType);
    session.draft.subcategories = [itemType, session.draft.category];
    session.draft.tags = getItemTypeTags(itemType);

    if (session.step === 'editing_itemtype') {
      session.step = 'awaiting_confirmation';
      return sendFinalConfirmation(chatId, session.draft);
    }

    if (session.draft.images && session.draft.images.length > 0) {
      session.step = 'awaiting_description';
      return askDescription(chatId, session.draft);
    } else {
      session.step = 'awaiting_photos';
      return askPhotos(chatId, session.draft);
    }
  }

  // Wizard: Step navigation backwards
  if (data === 'wiz_back_to_brand') {
    session.step = 'awaiting_brand';
    return askBrand(chatId, session.draft);
  }

  if (data === 'wiz_back_to_model') {
    session.step = 'awaiting_model';
    return askModel(chatId, session.draft);
  }

  if (data === 'wiz_back_to_itemtype') {
    session.step = 'awaiting_item_type';
    return askItemType(chatId, session.draft);
  }

  if (data === 'wiz_back_to_photos') {
    session.step = 'awaiting_photos';
    return askPhotos(chatId, session.draft);
  }

  if (data === 'wiz_photos_done') {
    if (!session.draft.images || session.draft.images.length === 0) {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Пожалуйста, загрузите хотя бы 1 фотографию товара перед переходом дальше!'
      });
    }
    session.step = 'awaiting_description';
    return askDescription(chatId, session.draft);
  }

  if (data === 'wiz_skip_description') {
    session.draft.description = '';
    session.step = 'awaiting_price';
    return askPrice(chatId, session.draft);
  }

  if (data === 'wiz_back_to_desc') {
    session.step = 'awaiting_description';
    return askDescription(chatId, session.draft);
  }

  if (data === 'photos_clear') {
    session.draft.images = [];
    session.draft.image = null;
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: '🔄 Все фотографии черновика удалены. Отправьте новые фотографии вещи:'
    });
  }

  if (data === 'wiz_back_to_price') {
    session.step = 'awaiting_price';
    return askPrice(chatId, session.draft);
  }

  if (data === 'wiz_back_to_sizes') {
    session.step = 'awaiting_sizes';
    return askSizes(chatId, session.draft);
  }

  if (data === 'wiz_back_to_condition') {
    session.step = 'awaiting_condition';
    return askCondition(chatId, session.draft);
  }

  // Wizard: Quick sizes
  if (data.startsWith('wiz_size_')) {
    if (data === 'wiz_size_shoes') session.draft.sizes = ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'];
    else if (data === 'wiz_size_clothes') session.draft.sizes = ['S', 'M', 'L', 'XL'];
    else if (data === 'wiz_size_onesize') session.draft.sizes = ['ONE SIZE'];

    if (session.step === 'editing_sizes') {
      session.step = 'awaiting_confirmation';
      return sendFinalConfirmation(chatId, session.draft);
    }

    session.step = 'awaiting_condition';
    return askCondition(chatId, session.draft);
  }

  // Wizard: Condition selection
  if (data.startsWith('wiz_cond_')) {
    const map = {
      wiz_cond_new: 'NEW // DEADSTOCK',
      wiz_cond_95: '9.5/10 MINT',
      wiz_cond_90: '9/10 EXCELLENT',
      wiz_cond_85: '8.5/10 GOOD',
      wiz_cond_70: '7/10 DISTRESSED'
    };
    session.draft.condition = map[data] || 'NEW // DEADSTOCK';

    if (session.step === 'editing_condition') {
      session.step = 'awaiting_confirmation';
      return sendFinalConfirmation(chatId, session.draft);
    }

    session.step = 'awaiting_location';
    return askLocation(chatId, session.draft);
  }

  // Wizard: Location & Stock
  if (data.startsWith('wiz_loc_')) {
    if (data === 'wiz_loc_spb') {
      session.draft.region = 'spb';
      session.draft.regionLabel = 'СПБ // BALKONSKY STORE';
      session.draft.stockType = 'instock';
      session.draft.deliveryTime = 'В наличии в СПб // Примерка и самовывоз сегодня';
    } else if (data === 'wiz_loc_tr_spb') {
      session.draft.region = 'transit_spb';
      session.draft.regionLabel = 'В ПУТИ ИЗ КИТАЯ В СПБ';
      session.draft.stockType = 'transit_spb';
      session.draft.deliveryTime = 'В пути в Санкт-Петербург: 5–8 дней (доступна бронь)';
    } else if (data === 'wiz_loc_tr_irk') {
      session.draft.region = 'transit_irkutsk';
      session.draft.regionLabel = 'В ПУТИ ИЗ КИТАЯ В ИРКУТСК';
      session.draft.stockType = 'transit_irkutsk';
      session.draft.deliveryTime = 'В пути в Иркутск: 3–6 дней (доступна бронь)';
    } else if (data === 'wiz_loc_cn') {
      session.draft.region = 'china';
      session.draft.regionLabel = 'CHINA [CN] // POIZON & DEWU';
      session.draft.stockType = 'preorder';
      session.draft.deliveryTime = 'Выкуп под заказ: 7–12 дней (СДЭК)';
    } else if (data === 'wiz_loc_jp') {
      session.draft.region = 'japan';
      session.draft.regionLabel = 'JAPAN [JP] // TOKYO ARCHIVE';
      session.draft.stockType = 'preorder';
      session.draft.deliveryTime = 'Выкуп под заказ: 7–14 дней (Авиаэкспресс)';
    } else if (data === 'wiz_loc_glb') {
      session.draft.region = 'global';
      session.draft.regionLabel = 'ИТАЛИЯ // ЕВРОПА';
      session.draft.stockType = 'preorder';
      session.draft.deliveryTime = 'Выкуп под заказ: 10–16 дней';
    }

    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  // -------------------------------------------------------------------------
  // In-Place Field Editing Callbacks (From Confirmation Screen)
  // -------------------------------------------------------------------------
  if (data === 'back_to_preview') {
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  if (data === 'edit_field_brand') {
    session.step = 'editing_brand';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✏️ **ИЗМЕНЕНИЕ БРЕНДА**\nТекущий: **${session.draft.brand}**\n\n` +
            `Напишите новое название бренда текстом или выберите быстрый вариант:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          ...POPULAR_BRANDS_KEYBOARD.slice(0, -1),
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_field_model') {
    session.step = 'editing_model';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✏️ **ИЗМЕНЕНИЕ МОДЕЛИ**\nТекущая: **${session.draft.name}**\n\n` +
            `Напишите новое название модели текстом:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_field_itemtype') {
    session.step = 'editing_itemtype';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔖 **ИЗМЕНЕНИЕ ТИПА ВЕЩИ (ТЕГ ДЛЯ ПОИСКА)**\nТекущий: **${session.draft.itemType || 'Одежда'}**\n\n` +
            `Выберите новый тип айтема кнопкой либо напишите текстом:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          ...ITEM_TYPES_KEYBOARD.slice(0, -1),
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_field_photos') {
    session.step = 'editing_photos';
    const count = (session.draft.images || []).length;
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📸 **УПРАВЛЕНИЕ ФОТОГРАФИЯМИ**\nЗагружено фото: **${count} шт.**\n\n` +
            `Отправьте новые фото (они добавятся к галерее), либо очистите фото:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Очистить все фото', callback_data: 'photos_clear' }],
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_field_desc') {
    session.step = 'editing_desc';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📝 **ИЗМЕНЕНИЕ ОПИСАНИЯ ТОВАРА**\n\n` +
            `Текущее описание:\n_${session.draft.description || '(автоматическая генерация)'}_\n\n` +
            `Напишите новое описание текстом в ответном сообщении или выберите действие:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ Использовать авто-описание', callback_data: 'edit_desc_reset_auto' }],
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_desc_reset_auto') {
    session.draft.description = '';
    session.step = 'awaiting_confirmation';
    return sendFinalConfirmation(chatId, session.draft);
  }

  if (data === 'edit_field_price') {
    session.step = 'editing_price';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `💰 **ИЗМЕНЕНИЕ ЦЕНЫ**\nТекущая: **${Number(session.draft.price).toLocaleString('ru-RU')} ₽**\n\n` +
            `Введите новую цену в рублях (только цифры):`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_field_sizes') {
    session.step = 'editing_sizes';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📏 **ИЗМЕНЕНИЕ РАЗМЕРОВ**\nТекущие: **${(session.draft.sizes || []).join(', ')}**\n\n` +
            `Введите новые размеры через запятую или нажмите кнопку:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👟 40, 41, 42, 43, 44 EU', callback_data: 'wiz_size_shoes' }],
          [{ text: '👕 S, M, L, XL', callback_data: 'wiz_size_clothes' }],
          [{ text: '🎒 ONE SIZE', callback_data: 'wiz_size_onesize' }],
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_field_condition') {
    session.step = 'editing_condition';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✨ **ИЗМЕНЕНИЕ СОСТОЯНИЯ:**`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '✨ NEW // DEADSTOCK', callback_data: 'wiz_cond_new' }],
          [{ text: '💎 9.5/10 MINT', callback_data: 'wiz_cond_95' }],
          [{ text: '⚡ 9/10 EXCELLENT', callback_data: 'wiz_cond_90' }],
          [{ text: '👍 8.5/10 GOOD', callback_data: 'wiz_cond_85' }],
          [{ text: '🔥 7/10 DISTRESSED', callback_data: 'wiz_cond_70' }],
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  if (data === 'edit_field_location') {
    session.step = 'editing_location';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📍 **ИЗМЕНЕНИЕ ЛОКАЦИИ И СТАТУСА:**`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🟢 В наличии в СПб (Балконский Стор)', callback_data: 'wiz_loc_spb' }],
          [{ text: '🚛 В пути из Китая в СПб (~5–8 дн)', callback_data: 'wiz_loc_tr_spb' }],
          [{ text: '🚛 В пути из Китая в Иркутск (~3–6 дн)', callback_data: 'wiz_loc_tr_irk' }],
          [{ text: '🇨🇳 Предзаказ (Китай / Poizon)', callback_data: 'wiz_loc_cn' }],
          [{ text: '🇯🇵 Предзаказ (Япония / Mercari JP)', callback_data: 'wiz_loc_jp' }],
          [{ text: '🌍 Предзаказ (Европа / Grailed)', callback_data: 'wiz_loc_glb' }],
          [{ text: '🔙 Назад в предпросмотр', callback_data: 'back_to_preview' }]
        ]
      }
    });
  }

  // -------------------------------------------------------------------------
  // Wizard: Confirm & Publish
  // -------------------------------------------------------------------------
  if (data === 'wiz_confirm_publish') {
    return publishItem(chatId);
  }

  // -------------------------------------------------------------------------
  // Catalog Navigation & Filters
  // -------------------------------------------------------------------------
  if (data === 'cat_noop') {
    return;
  }

  if (data === 'back_to_catalog') {
    return sendCatalogPage(chatId, 0, 'all');
  }

  if (data.startsWith('catflt_')) {
    const filter = data.replace('catflt_', '');
    return sendCatalogPage(chatId, 0, filter);
  }

  if (data.startsWith('catpage_')) {
    const parts = data.replace('catpage_', '').split('_');
    const page = parseInt(parts[0], 10) || 0;
    const filter = parts[1] || 'all';
    return sendCatalogPage(chatId, page, filter);
  }

  if (data === 'cat_start_search' || data === 'cat_search_prompt') {
    session.step = 'awaiting_catalog_search';
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔍 **ПОИСК ТОВАРА В КАТАЛОГЕ**\n\n` +
            `Введите ключевое слово (бренд, модель, тип вещи, артикул/SKU или слова из описания):`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 Весь каталог', callback_data: 'back_to_catalog' }]
        ]
      }
    });
  }

  // -------------------------------------------------------------------------
  // Item Card View & Post Generators
  // -------------------------------------------------------------------------
  if (data.startsWith('view_prod_')) {
    const id = data.replace('view_prod_', '');
    return sendProductCard(chatId, id);
  }

  if (data.startsWith('post_tg_')) {
    const id = data.replace('post_tg_', '');
    return sendTelegramPost(chatId, id);
  }

  if (data.startsWith('post_vk_')) {
    const id = data.replace('post_vk_', '');
    return sendVkPost(chatId, id);
  }

  // -------------------------------------------------------------------------
  // Live Item Editing Callbacks
  // -------------------------------------------------------------------------
  if (data.startsWith('edit_p_price_')) {
    const id = data.replace('edit_p_price_', '');
    session.step = 'live_edit_price';
    session.targetId = id;
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `💰 **ИЗМЕНЕНИЕ ЦЕНЫ**\n` +
            `Товар: **${p ? p.brand + ' ' + p.name : id}**\n` +
            `Текущая цена: **${p ? Number(p.price).toLocaleString('ru-RU') : 0} ₽**\n\n` +
            `Введите новую цену в рублях (только цифры):`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Отмена', callback_data: `view_prod_${id}` }]
        ]
      }
    });
  }

  if (data.startsWith('edit_p_sizes_')) {
    const id = data.replace('edit_p_sizes_', '');
    session.step = 'live_edit_sizes';
    session.targetId = id;
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📏 **ИЗМЕНЕНИЕ РАЗМЕРОВ**\n` +
            `Товар: **${p ? p.brand + ' ' + p.name : id}**\n` +
            `Текущие: **${p && p.sizes ? p.sizes.join(', ') : 'Не указаны'}**\n\n` +
            `Введите новые размеры через запятую (например: \`41, 42, 43 EU\` или \`S, M, L\`):`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Отмена', callback_data: `view_prod_${id}` }]
        ]
      }
    });
  }

  if (data.startsWith('edit_p_desc_')) {
    const id = data.replace('edit_p_desc_', '');
    session.step = 'live_edit_desc';
    session.targetId = id;
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📝 **ИЗМЕНЕНИЕ ОПИСАНИЯ**\n` +
            `Товар: **${p ? p.brand + ' ' + p.name : id}**\n\n` +
            `Текущее описание:\n_${p ? p.description : ''}_\n\n` +
            `Напишите новый текст описания в ответном сообщении:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Отмена', callback_data: `view_prod_${id}` }]
        ]
      }
    });
  }

  if (data.startsWith('edit_p_loc_')) {
    const id = data.replace('edit_p_loc_', '');
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📍 **ИЗМЕНЕНИЕ ЛОКАЦИИ И СТАТУСА**\n` +
            `Товар: **${p ? p.brand + ' ' + p.name : id}**\n\n` +
            `Выберите новый статус товара:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🟢 В наличии в СПб (Шоурум Невский 110В)', callback_data: `setloc_spb_${id}` }],
          [{ text: '🚛 В пути в СПб (~5–8 дней)', callback_data: `setloc_tr_spb_${id}` }],
          [{ text: '🚛 В пути в Иркутск (~3–6 дней)', callback_data: `setloc_tr_irk_${id}` }],
          [{ text: '🇨🇳 Предзаказ (Китай / Poizon, 7–12 дней)', callback_data: `setloc_cn_${id}` }],
          [{ text: '🇯🇵 Предзаказ (Япония / Mercari JP, 7–14 дней)', callback_data: `setloc_jp_${id}` }],
          [{ text: '🌍 Предзаказ (Европа / Grailed, 10–16 дней)', callback_data: `setloc_glb_${id}` }],
          [{ text: '🔙 Отмена', callback_data: `view_prod_${id}` }]
        ]
      }
    });
  }

  if (data.startsWith('setloc_')) {
    const match = data.match(/^setloc_([a-z_]+)_(.+)$/);
    if (match) {
      const locKey = match[1];
      const prodId = match[2];
      const products = loadProducts();
      const p = products.find(x => x.id === prodId);
      if (p) {
        if (locKey === 'spb') {
          p.stockType = 'instock';
          p.region = 'spb';
          p.regionLabel = 'СПБ // BALKONSKY STORE';
          p.deliveryTime = 'В наличии в СПб // Примерка и самовывоз сегодня';
          p.status = 'В НАЛИЧИИ В СПБ';
        } else if (locKey === 'tr_spb') {
          p.stockType = 'transit_spb';
          p.region = 'transit_spb';
          p.regionLabel = 'В ПУТИ ИЗ КИТАЯ В СПБ';
          p.deliveryTime = 'В пути в Санкт-Петербург: 5–8 дней (доступна бронь)';
          p.status = 'В ПУТИ В СПБ';
        } else if (locKey === 'tr_irk') {
          p.stockType = 'transit_irkutsk';
          p.region = 'transit_irkutsk';
          p.regionLabel = 'В ПУТИ ИЗ КИТАЯ В ИРКУТСК';
          p.deliveryTime = 'В пути в Иркутск: 3–6 дней (доступна бронь)';
          p.status = 'В ПУТИ В ИРКУТСК';
        } else if (locKey === 'cn') {
          p.stockType = 'preorder';
          p.region = 'china';
          p.regionLabel = 'CHINA [CN] // POIZON DEWU';
          p.deliveryTime = 'Выкуп под заказ: 7–12 дней (СДЭК)';
          p.status = 'ПРЕДЗАКАЗ ОТКРЫТ';
        } else if (locKey === 'jp') {
          p.stockType = 'preorder';
          p.region = 'japan';
          p.regionLabel = 'JAPAN [JP] // TOKYO ARCHIVE';
          p.deliveryTime = 'Выкуп под заказ: 7–14 дней (Авиаэкспресс)';
          p.status = 'ПРЕДЗАКАЗ ОТКРЫТ';
        } else if (locKey === 'glb') {
          p.stockType = 'preorder';
          p.region = 'global';
          p.regionLabel = 'ИТАЛИЯ // ЕВРОПА';
          p.deliveryTime = 'Выкуп под заказ: 10–16 дней';
          p.status = 'ПРЕДЗАКАЗ ОТКРЫТ';
        }
        saveProducts(products);
      }
      return sendProductCard(chatId, prodId);
    }
  }

  // -------------------------------------------------------------------------
  // Archive & Unarchive
  // -------------------------------------------------------------------------
  if (data.startsWith('toggle_archive_')) {
    const id = data.replace('toggle_archive_', '');
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    if (p) {
      p.archived = !p.archived;
      if (p.archived) {
        p.archivedAt = new Date().toISOString();
      } else {
        delete p.archivedAt;
      }
      saveProducts(products);
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: p.archived
          ? `📁 Товар **${p.brand} ${p.name}** перенесен в архив (скрыт с витрины сайта).`
          : `📂 Товар **${p.brand} ${p.name}** восстановлен из архива (виден в каталоге на сайте).`
      });
      return sendProductCard(chatId, id);
    }
  }

  // -------------------------------------------------------------------------
  // Delete Product Handlers
  // -------------------------------------------------------------------------
  if (data.startsWith('ask_del_')) {
    const id = data.replace('ask_del_', '');
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `⚠️ **ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ**\n\n` +
            `Вы действительно хотите навсегда удалить товар:\n` +
            `**${p ? p.brand + ' — ' + p.name : id}** (${p ? Number(p.price).toLocaleString('ru-RU') + ' ₽' : ''})?\n\n` +
            `_Действие необратимо. Товар исчезнет с сайта и из базы данных._`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🗑 Да, удалить навсегда', callback_data: `do_del_${id}` }],
          [{ text: '❌ Отмена', callback_data: `view_prod_${id}` }]
        ]
      }
    });
  }

  if (data.startsWith('do_del_')) {
    const id = data.replace('do_del_', '');
    let products = loadProducts();
    const target = products.find(p => p.id === id);
    products = products.filter(p => p.id !== id);
    saveProducts(products);

    await callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🗑 Товар **${target ? target.brand + ' — ' + target.name : id}** успешно удален с сайта.`
    });
    return sendCatalogPage(chatId, 0, 'all');
  }

  // Legacy delete fallback
  if (data.startsWith('del_')) {
    const id = data.replace('del_', '');
    let products = loadProducts();
    const target = products.find(p => p.id === id);
    products = products.filter(p => p.id !== id);
    saveProducts(products);

    await callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🗑 Товар **${target ? target.brand + ' - ' + target.name : id}** успешно удален с сайта.`
    });
    return sendCatalogPage(chatId, 0, 'all');
  }

  // Catalog pagination
  if (data.startsWith('catpage_')) {
    const parts = data.replace('catpage_', '').split('_');
    const page = parseInt(parts[0], 10) || 0;
    const filter = parts[1] || 'all';
    return sendCatalogPage(chatId, page, filter);
  }
}

// ---------------------------------------------------------------------------
// Publish Item to Site
// ---------------------------------------------------------------------------
async function publishItem(chatId) {
  const session = getSession(chatId);
  const draft = session.draft;
  if (!draft || !draft.brand) {
    return callTelegram('sendMessage', { chat_id: chatId, text: '⚠️ Черновик не найден.' });
  }

  const products = loadProducts();

  let statusText = 'ПРЕДЗАКАЗ ОТКРЫТ';
  if (draft.stockType === 'instock') statusText = 'В НАЛИЧИИ В СПБ';
  else if (draft.stockType === 'transit_spb') statusText = 'В ПУТИ В СПБ';
  else if (draft.stockType === 'transit_irkutsk') statusText = 'В ПУТИ В ИРКУТСК';

  const imagesList = (draft.images && draft.images.length > 0) 
    ? draft.images 
    : (draft.image ? [draft.image] : ['/uploads/poster_travis_jordan.jpg']);

  const itemType = draft.itemType || 'Худи';
  const category = draft.category || deduceCategoryFromItemType(itemType);
  const tags = draft.tags || getItemTypeTags(itemType);

  const newProduct = {
    id: draft.id || `sasbov-card-${Date.now()}`,
    brand: draft.brand,
    name: draft.name,
    fullName: `${draft.brand} ${draft.name}`,
    itemType: itemType,
    price: Number(draft.price),
    basePriceRub: Number(draft.price),
    originalPrice: Math.round(Number(draft.price) * 1.25),
    sku: draft.sku || `SAS-${draft.brand.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITM'}-${Math.floor(100 + Math.random() * 900)}`,
    category: category,
    subcategories: [itemType, category],
    tags: Array.from(new Set([...tags, itemType.toLowerCase(), draft.brand.toLowerCase()])),
    stockType: draft.stockType || 'preorder',
    region: draft.region || 'china',
    regionLabel: draft.regionLabel || 'CHINA [CN] // POIZON DEWU',
    deliveryTime: draft.deliveryTime || 'Выкуп под заказ: 7–12 дней (СДЭК)',
    sizes: draft.sizes || ['ONE SIZE'],
    condition: draft.condition || 'NEW // DEADSTOCK',
    status: statusText,
    dropStatus: statusText,
    closingIn: '07 дн. 00:00',
    badgeClass: draft.region === 'japan' ? 'jp' : (draft.stockType === 'instock' ? 'badge-instock' : 'cn'),
    image: imagesList[0],
    images: imagesList,
    description: draft.description || `${draft.brand} ${draft.name}. Аутентичный релиз, полный комплект, оригинальные бирки. Доступен к заказу на SASBOV MARKET.`,
    features: ['100% Legit Check', 'Фирменная упаковка', 'Экспресс-доставка СДЭК'],
    createdAt: new Date().toISOString()
  };

  products.unshift(newProduct);
  saveProducts(products);
  clearSession(chatId);

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `🎉 **ТОВАР УСПЕШНО ОПУБЛИКОВАН НА САЙТ!**\n\n` +
          `• Бренд: **${newProduct.brand}**\n` +
          `• Модель: **${newProduct.name}**\n` +
          `• Тип вещи: **${newProduct.itemType}** (включен в поисковый индекс)\n` +
          `• Фотографий: **${imagesList.length} шт.**\n` +
          `• Цена: **${newProduct.price.toLocaleString('ru-RU')} ₽**\n` +
          `• Размеры: **${newProduct.sizes.join(', ')}**\n` +
          `• Статус: **${statusText}**\n` +
          `• Всего товаров в базе: **${products.length}**\n\n` +
          `👇 Проверьте карточку в онлайн-каталоге:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌐 Открыть каталог на сайте', url: `${SITE_URL}/catalog.html` }]
      ]
    }
  });
}

// ---------------------------------------------------------------------------
// Ready-To-Publish Social Media Post Generators
// ---------------------------------------------------------------------------
function generateTelegramPost(p) {
  let loc = '✈️ Выкуп под заказ из Китая/Японии (7–12 дней)';
  if (p.stockType === 'instock' || p.region === 'spb') {
    loc = '🟢 В наличии в СПб (Шоурум Невский 110В, самовывоз и примерка сегодня)';
  } else if (p.stockType === 'transit_spb' || p.region === 'transit_spb') {
    loc = '🚛 В пути из Китая в Санкт-Петербург (~5–8 дней, открыта бронь)';
  } else if (p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk') {
    loc = '🚛 В пути из Китая в Иркутск (~3–6 дней, открыта бронь)';
  }

  const sizesStr = (p.sizes && p.sizes.length) ? p.sizes.join(', ') : 'Уточняйте';
  const brandTag = (p.brand || '').replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase();
  const typeTag = (p.itemType || '').replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase();

  return `🔥 ${p.brand.toUpperCase()} — ${p.name}\n\n` +
    `📏 Размеры в наличии: ${sizesStr}\n` +
    `✨ Состояние: ${p.condition || 'NEW // DEADSTOCK'}\n` +
    `📍 Локация: ${loc}\n` +
    `💵 Цена: ${Number(p.price).toLocaleString('ru-RU')} ₽\n\n` +
    `📝 Описание:\n${p.description || `${p.brand} ${p.name}. Аутентичный релиз, оригинальная упаковка, комплектные бирки.`}\n\n` +
    `🛡 100% Оригинал // Пройдена двойная аутентификация\n` +
    `📦 Доставка по всей РФ (СДЭК) / Самовывоз и примерка в СПб\n\n` +
    `📩 Для заказа и примерки: @sasbov_admin\n` +
    `🌐 Смотреть на сайте: https://sasbov.online/product.html?id=${p.id}\n\n` +
    `#${brandTag} #${typeTag} #sasbov #streetwear #resell #spb`;
}

function generateVkPost(p) {
  let loc = '✈️ Доступно под заказ (7–12 дней СДЭК)';
  if (p.stockType === 'instock' || p.region === 'spb') {
    loc = '🟢 В НАЛИЧИИ В САНКТ-ПЕТЕРБУРГЕ\n📍 Шоурум «Балконский Стор», Невский просп., 110В (ежедневно 14:00 - 21:00)';
  } else if (p.stockType === 'transit_spb' || p.region === 'transit_spb') {
    loc = '🚛 В пути из Китая в Санкт-Петербург (~5–8 дней, открыта бронь)';
  } else if (p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk') {
    loc = '🚛 В пути из Китая в Иркутск (~3–6 дней, открыта бронь)';
  }

  const sizesStr = (p.sizes && p.sizes.length) ? p.sizes.join(', ') : 'Уточняйте';
  const brandTag = (p.brand || '').replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase();
  const typeTag = (p.itemType || '').replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase();

  return `⚡ ${p.brand.toUpperCase()} — ${p.name}\n\n` +
    `💰 Цена: ${Number(p.price).toLocaleString('ru-RU')} ₽\n` +
    `📏 Доступные размеры: ${sizesStr}\n` +
    `✨ Состояние: ${p.condition || 'NEW // DEADSTOCK'}\n` +
    `📍 Наличие и локация:\n${loc}\n\n` +
    `📝 О товаре:\n${p.description || `${p.brand} ${p.name}. Полный аутентичный комплект.`}\n\n` +
    `✅ Строгий Legit Check перед выдачей\n` +
    `🚀 Экспресс-отправка СДЭК в день оплаты\n\n` +
    `📩 Написать менеджеру: vk.me/sasbovmarket\n` +
    `🌐 Онлайн-витрина: https://sasbov.online/product.html?id=${p.id}\n\n` +
    `#${brandTag} #${typeTag} #sasbov #streetwear #saintpetersburg`;
}

async function sendTelegramPost(chatId, productId) {
  const products = loadProducts();
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const postText = generateTelegramPost(p);

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `📢 **ГОТОВЫЙ ПОСТ ДЛЯ TELEGRAM КАНАЛА**\n\n` +
          `👇 *Нажмите один раз на текст ниже, чтобы скопировать весь пост в буфер обмена:*\n\n` +
          `\`\`\`\n${postText}\n\`\`\``,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Назад к карточке товара', callback_data: `view_prod_${p.id}` }]
      ]
    }
  });
}

async function sendVkPost(chatId, productId) {
  const products = loadProducts();
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const vkText = generateVkPost(p);

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `🔵 **ГОТОВЫЙ ПОСТ ДЛЯ ГРУППЫ ВКОНТАКТЕ**\n\n` +
          `👇 *Нажмите один раз на текст ниже, чтобы скопировать весь пост в буфер обмена:*\n\n` +
          `\`\`\`\n${vkText}\n\`\`\``,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Назад к карточке товара', callback_data: `view_prod_${p.id}` }]
      ]
    }
  });
}

// ---------------------------------------------------------------------------
// Product Card View (With Photo, Full Details, Post Generation & In-Place Edit)
// ---------------------------------------------------------------------------
async function sendProductCard(chatId, productId) {
  const products = loadProducts();
  const p = products.find(x => x.id === productId);
  if (!p) {
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: '⚠️ Товар не найден или был удален.'
    });
  }

  let loc = '✈️ Предзаказ на всю РФ (7–12 дней)';
  if (p.stockType === 'instock' || p.region === 'spb') {
    loc = '🟢 В наличии в СПб (Шоурум Балконский, Невский 110В)';
  } else if (p.stockType === 'transit_spb' || p.region === 'transit_spb') {
    loc = '🚛 В пути из Китая в СПб (~5–8 дней)';
  } else if (p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk') {
    loc = '🚛 В пути из Китая в Иркутск (~3–6 дней)';
  }

  const statusText = p.archived ? '📁 **В АРХИВЕ** (скрыт с витрины сайта)' : '🟢 **АКТИВЕН НА САЙТЕ**';
  const photosCount = (p.images && p.images.length) ? p.images.length : (p.image ? 1 : 0);

  const cardText = `🏷 **КАРТОЧКА ТОВАРА: ${p.brand.toUpperCase()} — ${p.name.toUpperCase()}**\n\n` +
    `• Статус: ${statusText}\n` +
    `• Артикул / SKU: \`${p.sku || p.id}\`\n` +
    `• Тип вещи: **${p.itemType || 'Одежда'}**\n` +
    `• Цена: **${Number(p.price).toLocaleString('ru-RU')} ₽**\n` +
    `• Доступные размеры: **${(p.sizes || []).join(', ')}**\n` +
    `• Состояние: **${p.condition || 'NEW // DEADSTOCK'}**\n` +
    `• Локация: **${loc}**\n` +
    `• Фотографий: **${photosCount} шт.**\n\n` +
    `📝 **Описание:**\n_${p.description || 'Оригинальный айтем SASBOV MARKET.'}_\n\n` +
    `👇 **Выберите действие:**`;

  const inlineKeyboard = [
    [
      { text: '📢 Пост для Telegram', callback_data: `post_tg_${p.id}` },
      { text: '🔵 Пост для ВКонтакте', callback_data: `post_vk_${p.id}` }
    ],
    [
      { text: '💰 Изменить цену', callback_data: `edit_p_price_${p.id}` },
      { text: '📏 Изменить размеры', callback_data: `edit_p_sizes_${p.id}` }
    ],
    [
      { text: '📝 Изменить описание', callback_data: `edit_p_desc_${p.id}` },
      { text: '📍 Сменить локацию', callback_data: `edit_p_loc_${p.id}` }
    ],
    [
      { text: (p.archived ? '📂 Восстановить из архива' : '📁 В архив (скрыть с сайта)'), callback_data: `toggle_archive_${p.id}` }
    ],
    [
      { text: '🗑 Удалить товар', callback_data: `ask_del_${p.id}` },
      { text: '🔙 К списку товаров', callback_data: 'back_to_catalog' }
    ]
  ];

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: cardText,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// ---------------------------------------------------------------------------
// Synchronized Catalog Live Search
// ---------------------------------------------------------------------------
async function handleCatalogSearch(chatId, query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: '⚠️ Поисковый запрос пуст. Введите название бренда, модели, типа вещи или артикул:'
    });
  }

  const products = loadProducts();
  const matched = products.filter(p => {
    const brand = (p.brand || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const full = (p.fullName || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const type = (p.itemType || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';

    return brand.includes(q) || name.includes(q) || full.includes(q) ||
           sku.includes(q) || type.includes(q) || desc.includes(q) || tags.includes(q);
  });

  if (matched.length === 0) {
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `❌ По запросу **«${query}»** ничего не найдено.\n\nПопробуйте ввести другое ключевое слово:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 Искать снова', callback_data: 'cat_start_search' }],
          [{ text: '📦 Открыть весь каталог', callback_data: 'back_to_catalog' }]
        ]
      }
    });
  }

  let text = `🔍 **РЕЗУЛЬТАТЫ ПОИСКА ПО ЗАПРОСУ «${query}»**\nНайдено: **${matched.length} шт.**\n\n`;
  const inlineKeyboard = [];

  matched.slice(0, 8).forEach((p, idx) => {
    const archLabel = p.archived ? '📁 [Архив] ' : '';
    text += `${idx + 1}. **${p.brand}** ${p.name} ${archLabel}\n` +
            `   Цена: ${Number(p.price).toLocaleString('ru-RU')} ₽ | Арт: \`${p.sku || p.id}\`\n\n`;

    inlineKeyboard.push([{
      text: `👁 Открыть: ${p.brand} ${p.name.slice(0, 16)}`,
      callback_data: `view_prod_${p.id}`
    }]);
  });

  if (matched.length > 8) {
    text += `_...и ещё ${matched.length - 8} совпадений._\n`;
  }

  inlineKeyboard.push([
    { text: '🔍 Новый поиск', callback_data: 'cat_start_search' },
    { text: '📦 Весь каталог', callback_data: 'back_to_catalog' }
  ]);

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// ---------------------------------------------------------------------------
// Send Synchronized Paginated Catalog Page (With Filter Chips & Item Cards)
// ---------------------------------------------------------------------------
async function sendCatalogPage(chatId, page = 0, filter = 'all') {
  let products = loadProducts();

  // Apply filter
  if (filter === 'spb') {
    products = products.filter(p => !p.archived && (p.stockType === 'instock' || p.region === 'spb'));
  } else if (filter === 'transit') {
    products = products.filter(p => !p.archived && (p.stockType === 'transit_spb' || p.region === 'transit_spb' || p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk'));
  } else if (filter === 'preorder') {
    products = products.filter(p => !p.archived && (p.stockType === 'preorder' || (!p.stockType && p.region !== 'spb')));
  } else if (filter === 'archived') {
    products = products.filter(p => p.archived === true);
  } else {
    products = products.filter(p => !p.archived);
  }

  const PAGE_SIZE = 5;
  const totalPages = Math.ceil(products.length / PAGE_SIZE) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));
  const items = products.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);

  const filterNames = {
    all: 'Все активные',
    spb: '🟢 В наличии СПб',
    transit: '🚛 В пути',
    preorder: '✈️ Предзаказ РФ',
    archived: '📁 Архив'
  };

  let text = `📦 **СИНХРОНИЗИРОВАННЫЙ КАТАЛОГ SASBOV**\n` +
             `Раздел: **${filterNames[filter] || 'Все'}** | Товаров: **${products.length} шт.** (Стр. ${curPage + 1} из ${totalPages})\n\n`;

  const inlineKeyboard = [];

  // Filter chips row
  inlineKeyboard.push([
    { text: (filter === 'all' ? '🔘 Все' : 'Все'), callback_data: 'catflt_all' },
    { text: (filter === 'spb' ? '🔘 🟢СПб' : '🟢СПб'), callback_data: 'catflt_spb' },
    { text: (filter === 'transit' ? '🔘 🚛В пути' : '🚛В пути'), callback_data: 'catflt_transit' },
    { text: (filter === 'preorder' ? '🔘 ✈️Предзаказ' : '✈️Предзаказ'), callback_data: 'catflt_preorder' },
    { text: (filter === 'archived' ? '🔘 📁Архив' : '📁Архив'), callback_data: 'catflt_archived' }
  ]);

  if (items.length === 0) {
    text += `_В этой категории пока нет товаров._\n`;
  } else {
    items.forEach((p, idx) => {
      let loc = '✈️ РФ';
      if (p.stockType === 'instock' || p.region === 'spb') loc = '🟢 СПб';
      else if (p.stockType === 'transit_spb' || p.region === 'transit_spb') loc = '🚛 Транзит СПб';
      else if (p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk') loc = '🚛 Транзит Ирк';

      const typeLabel = p.itemType ? `[${p.itemType}] ` : '';
      const archLabel = p.archived ? '📁 [АРХИВ] ' : '';
      text += `${curPage * PAGE_SIZE + idx + 1}. **${p.brand}** ${p.name} ${typeLabel}${archLabel}\n` +
              `   💰 ${Number(p.price).toLocaleString('ru-RU')} ₽ | 📍 ${loc} | 📏 ${(p.sizes || []).join(', ')}\n\n`;

      inlineKeyboard.push([{
        text: `👁 Карточка: ${p.brand} ${p.name.slice(0, 16)}`,
        callback_data: `view_prod_${p.id}`
      }]);
    });
  }

  // Pagination navigation row
  const navRow = [];
  if (curPage > 0) {
    navRow.push({ text: '⬅️ Назад', callback_data: `catpage_${curPage - 1}_${filter}` });
  }
  navRow.push({ text: `📄 ${curPage + 1}/${totalPages}`, callback_data: 'cat_noop' });
  if (curPage < totalPages - 1) {
    navRow.push({ text: 'Вперёд ➡️', callback_data: `catpage_${curPage + 1}_${filter}` });
  }
  inlineKeyboard.push(navRow);

  // Search row
  inlineKeyboard.push([
    { text: '🔍 Найти товар по названию / SKU', callback_data: 'cat_start_search' }
  ]);

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

// ---------------------------------------------------------------------------
// Robust Long-Polling Loop with Auto-Recovery & Sockets Watchdog
// ---------------------------------------------------------------------------
let lastUpdateId = 0;
let running = true;

async function startPollingLoop() {
  console.log('[TG Bot] Long-polling engine active. Listening for updates...');
  while (running) {
    try {
      const params = { timeout: 15 };
      if (lastUpdateId > 0) {
        params.offset = lastUpdateId + 1;
      }

      const res = await callTelegram('getUpdates', params, 25000);

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          if (update.message) {
            try { await handleMessage(update.message); } catch (e) { console.error('Error handling message:', e); }
          } else if (update.callback_query) {
            try { await handleCallback(update.callback_query); } catch (e) { console.error('Error handling callback:', e); }
          }
        }
      } else if (res && res.error_code === 409) {
        console.warn('[TG Bot] 409 Conflict, waiting 5s before reconnecting...');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.warn('[TG Bot] Polling loop caught network issue, retrying in 3s:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ---------------------------------------------------------------------------
// Bot Initialization
// ---------------------------------------------------------------------------
async function initBot() {
  console.log('⚡ SASBOV Native Step-by-Step Telegram Admin Bot is starting...');

  // Set default bot commands in Telegram
  await callTelegram('setMyCommands', {
    commands: [
      { command: 'start', description: 'Главное меню админ-панели' },
      { command: 'new', description: '➕ Добавить товар (9 шагов)' },
      { command: 'catalog', description: '📦 Каталог товаров (поиск/ред/архив)' },
      { command: 'search', description: '🔍 Поиск товара по названию или SKU' },
      { command: 'stats', description: '📊 Статистика товаров и складов' },
      { command: 'site', description: '🌐 Ссылки на онлайн-магазин' },
      { command: 'logout', description: '🔒 Завершить сессию (Выйти)' }
    ]
  }).catch(() => {});

  // Reset menu button to default
  await callTelegram('setChatMenuButton', {
    menu_button: { type: 'default' }
  }).catch(() => {});

  console.log('⚡ SASBOV Native Step-by-Step Telegram Admin Bot is running...');
  console.log('[TG Bot] Commands and default menu button registered successfully.');
  startPollingLoop();
}

initBot();
