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
// Admin Authorization Store
// ---------------------------------------------------------------------------
function loadAdmins() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { authorized_ids: [], users: {} };
}

function saveAdmins(data) {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

let adminStore = loadAdmins();

function authorizeUser(user) {
  const uid = Number(user.id);
  if (!adminStore.authorized_ids.includes(uid)) {
    adminStore.authorized_ids.push(uid);
  }
  adminStore.users[uid] = {
    id: uid,
    username: user.username || '',
    first_name: user.first_name || '',
    authorized_at: new Date().toISOString()
  };
  saveAdmins(adminStore);
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
    [{ text: '📊 Статистика' }, { text: '🌐 Открыть сайт' }]
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
    text: `${prefix}🏷 **ШАГ 1 ИЗ 8: БРЕНД ТОВАРА**\n\n` +
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
          `📝 **ШАГ 2 ИЗ 8: НАЗВАНИЕ МОДЕЛИ**\n\n` +
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
          `🔖 **ШАГ 3 ИЗ 8: ТИП ВЕЩИ (ТЕГ ДЛЯ ПОИСКА)**\n\n` +
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
             `📸 **ШАГ 4 ИЗ 8: ФОТОГРАФИИ ТОВАРА**\n\n` +
             `Прикрепите и отправьте фотографии вещи.\n` +
             `*(Можно отправить сразу несколько фото альбомом или по одной)*.\n`;

  const inlineKeyboard = [];

  if (count > 0) {
    text += `\n📦 Уже загружено фото: **${count} шт.**`;
    inlineKeyboard.push([{ text: `✅ Фото готовы (${count} шт.) ➡️ К цене`, callback_data: 'wiz_photos_done' }]);
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

// Helper: Ask Step 5 (Price)
function askPrice(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `📸 Фотографий в карточке: **${(draft.images || []).length} шт.**\n\n` +
          `💰 **ШАГ 5 ИЗ 8: ЦЕНА В РУБЛЯХ**\n\n` +
          `Введите цену в рублях (только цифры, например: \`45000\` или \`128000\`):`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Назад к фото', callback_data: 'wiz_back_to_photos' }],
        [{ text: '❌ Отменить', callback_data: 'cancel_draft' }]
      ]
    }
  });
}

// Helper: Ask Step 6 (Sizes)
function askSizes(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `✅ Цена: **${Number(draft.price).toLocaleString('ru-RU')} ₽**\n\n` +
          `📏 **ШАГ 6 ИЗ 8: ДОСТУПНЫЕ РАЗМЕРЫ**\n\n` +
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

// Helper: Ask Step 7 (Condition)
function askCondition(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `✅ Размеры: **${(draft.sizes || []).join(', ')}**\n\n` +
          `✨ **ШАГ 7 ИЗ 8: СОСТОЯНИЕ ВЕЩИ:**`,
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

// Helper: Ask Step 8 (Location & Stock)
function askLocation(chatId, draft) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `📍 **ШАГ 8 ИЗ 8: ЛОКАЦИЯ, НАЛИЧИЕ ИЛИ ТРАНЗИТ:**\n\n` +
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
          { text: '💰 Цена', callback_data: 'edit_field_price' },
          { text: '📏 Размеры', callback_data: 'edit_field_sizes' }
        ],
        [
          { text: '✨ Состояние', callback_data: 'edit_field_condition' },
          { text: '📍 Локация', callback_data: 'edit_field_location' }
        ],
        [{ text: '❌ Отменить черновик', callback_data: 'cancel_draft' }]
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
  const text = (msg.text || '').trim();
  const session = getSession(chatId);

  console.log(`[TG INCOMING] User ${user.first_name || user.id} (@${user.username || 'unknown'}) [step: ${session.step}]: ${text || (msg.photo ? '[Photo]' : '[Media]')}`);

  // Auto-authorize user on first interaction
  authorizeUser(user);

  // /start or /menu command
  if (text === '/start' || text === '/menu' || text.toLowerCase() === 'меню' || text.toLowerCase() === 'главная') {
    clearSession(chatId);

    // Reset menu button explicitly for this user to default native commands
    callTelegram('setChatMenuButton', {
      chat_id: chatId,
      menu_button: { type: 'default' }
    }).catch(() => {});

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `👋 **ПРИВЕТ, ${user.first_name || 'АДМИНИСТРАТОР'}!**\n\n` +
            `Админ-панель **SASBOV MARKET** готова к работе.\n\n` +
            `• Пошаговое добавление товаров: отдельно Бренд, Модель, Тип вещи, несколько фото;\n` +
            `• Поиск на сайте по типу вещи: джинсы, худи, зипхуди, свитпэнтс, куртки, пуховики, очки, часы, карты, пепельницы, ковры, бритвы, игрушки;\n` +
            `• Полное редактирование любого пункта перед публикацией;\n` +
            `• Поддержка локаций:\n` +
            `  - 🟢 **В наличии в СПб** (Шоурум Балконский, Невский 110В)\n` +
            `  - 🚛 **В пути из Китая в СПб** (~5–8 дней)\n` +
            `  - 🚛 **В пути из Китая в Иркутск** (~3–6 дней)\n` +
            `  - ✈️ **Предзаказ на всю РФ** (Poizon / Mercari, 7–12 дней)\n\n` +
            `👇 Нажмите кнопку **«➕ Добавить товар»**, чтобы начать:`,
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
    const instock = products.filter(p => p.stockType === 'instock' || p.region === 'spb').length;
    const transitSpb = products.filter(p => p.stockType === 'transit_spb' || p.region === 'transit_spb').length;
    const transitIrk = products.filter(p => p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk').length;
    const preorder = products.filter(p => p.stockType === 'preorder' || (!p.stockType && p.region !== 'spb')).length;

    const categories = {
      footwear: products.filter(p => p.category === 'footwear').length,
      clothing: products.filter(p => p.category === 'clothing').length,
      accessories: products.filter(p => p.category === 'accessories').length
    };

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📊 **СТАТИСТИКА SASBOV MARKET**\n\n` +
            `📦 Всего товаров на сайте: **${products.length}**\n\n` +
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
    return sendCatalogPage(chatId, 0);
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
            [{ text: `✅ Фото готовы (${count} шт.) ➡️ К цене`, callback_data: 'wiz_photos_done' }],
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
      session.step = 'awaiting_price';
      return askPrice(chatId, session.draft);
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
      session.step = 'awaiting_price';
      return askPrice(chatId, session.draft);
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
  // Wizard: Step 5 -> Price
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
  // Wizard: Step 6 -> Sizes
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

  // Fallback helper
  if (text && session.step === 'idle') {
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `💡 Нажмите **«➕ Добавить товар»**, чтобы опубликовать вещь на сайт, или **«📦 Каталог товаров»** для просмотра и удаления.`,
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
  const session = getSession(chatId);

  console.log(`[TG CALLBACK] ${cb.from.first_name} (@${cb.from.username}): ${data}`);
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
      session.step = 'awaiting_price';
      return askPrice(chatId, session.draft);
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
        text: '⚠️ Пожалуйста, загрузите хотя бы 1 фотографию товара перед переходом к цене!'
      });
    }
    session.step = 'awaiting_price';
    return askPrice(chatId, session.draft);
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

  // Delete product
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
    return sendCatalogPage(chatId, 0);
  }

  // Catalog pagination
  if (data.startsWith('catpage_')) {
    const page = parseInt(data.replace('catpage_', ''), 10) || 0;
    return sendCatalogPage(chatId, page);
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
// Send Paginated Catalog Page
// ---------------------------------------------------------------------------
async function sendCatalogPage(chatId, page = 0) {
  const products = loadProducts();
  const PAGE_SIZE = 5;
  const totalPages = Math.ceil(products.length / PAGE_SIZE) || 1;
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  const items = products.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);

  let text = `📦 **КАТАЛОГ ТОВАРОВ (Стр. ${curPage + 1} из ${totalPages})**\nВсего товаров: ${products.length}\n\n`;

  const inlineKeyboard = [];

  items.forEach((p, idx) => {
    let loc = '✈️ РФ';
    if (p.stockType === 'instock' || p.region === 'spb') loc = '🟢 СПб';
    else if (p.stockType === 'transit_spb' || p.region === 'transit_spb') loc = '🚛 Транзит СПб';
    else if (p.stockType === 'transit_irkutsk' || p.region === 'transit_irkutsk') loc = '🚛 Транзит Иркутск';

    const pCount = (p.images && p.images.length) ? p.images.length : 1;
    const typeLabel = p.itemType ? `[${p.itemType}] ` : '';
    text += `${curPage * PAGE_SIZE + idx + 1}. **${p.brand}** ${p.name} ${typeLabel}\n   Цена: ${Number(p.price).toLocaleString('ru-RU')} ₽ | [${loc}] | 📸 ${pCount} фото\n\n`;

    inlineKeyboard.push([{
      text: `🗑 Удалить: ${p.brand} ${p.name.slice(0, 16)}...`,
      callback_data: `del_${p.id}`
    }]);
  });

  const navRow = [];
  if (curPage > 0) {
    navRow.push({ text: '⬅️ Назад', callback_data: `catpage_${curPage - 1}` });
  }
  if (curPage < totalPages - 1) {
    navRow.push({ text: 'Вперёд ➡️', callback_data: `catpage_${curPage + 1}` });
  }
  if (navRow.length > 0) inlineKeyboard.push(navRow);

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
      { command: 'new', description: '➕ Добавить товар на сайт (пошагово)' },
      { command: 'catalog', description: '📦 Каталог товаров и удаление' },
      { command: 'stats', description: '📊 Статистика товаров и складов' },
      { command: 'site', description: '🌐 Ссылки на онлайн-магазин' }
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
