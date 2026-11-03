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
async function downloadTelegramPhoto(fileId, prefix = 'drop') {
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
    userSessions.set(chatId, { step: 'idle', draft: {} });
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

// ---------------------------------------------------------------------------
// Message Handler
// ---------------------------------------------------------------------------
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const user = msg.from || msg.chat;
  const text = (msg.text || '').trim();
  const session = getSession(chatId);

  console.log(`[TG INCOMING] User ${user.first_name || user.id} (@${user.username || 'unknown'}): ${text || (msg.photo ? '[Photo]' : '[Media]')}`);

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
            `• Пошаговое добавление товаров прямо в чате (без миниаппок);\n` +
            `• Поддержка статусов:\n` +
            `  - 🟢 **В наличии в СПб** (Шоурум Балконский)\n` +
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
    const preorder = products.length - instock - transitSpb - transitIrk;

    const categories = { footwear: 0, clothing: 0, accessories: 0 };
    products.forEach(p => { if (categories[p.category] !== undefined) categories[p.category]++; });

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📊 **АКТУАЛЬНАЯ СТАТИСТИКА САЙТА:**\n\n` +
            `📦 Всего товаров на сайте: **${products.length}**\n\n` +
            `📍 **Логистика & Наличие:**\n` +
            `• 🟢 В наличии в СПб (Шоурум): **${instock}**\n` +
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
    session.step = 'awaiting_photo';
    session.draft = {};
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📸 **ШАГ 1 ИЗ 7: ФОТОГРАФИЯ ТОВАРА**\n\n` +
            `Прикрепите и отправьте фото вещи *(как фото, со сжатием)*:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Отменить', callback_data: 'cancel_draft' }]]
      }
    });
  }

  // Wizard: Step 1 -> Photo received
  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    const bestPhoto = msg.photo[msg.photo.length - 1];
    callTelegram('sendChatAction', { chat_id: chatId, action: 'upload_photo' });

    let localPhotoPath = null;
    try {
      localPhotoPath = await downloadTelegramPhoto(bestPhoto.file_id, 'drop');
    } catch (err) {
      return callTelegram('sendMessage', {
        chat_id: chatId,
        text: `⚠️ Ошибка загрузки фото: ${err.message}`
      });
    }

    session.draft = {
      id: `sasbov-card-${Date.now()}`,
      image: localPhotoPath,
      images: [localPhotoPath]
    };
    session.step = 'awaiting_title';

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ **Фотография сохранена!**\n\n` +
            `📝 **ШАГ 2 ИЗ 7: БРЕНД И НАЗВАНИЕ**\n\n` +
            `Напишите бренд и название модели через пробел:\n` +
            `*(например: \`Balenciaga Track 3 White\` или \`Chrome Hearts Zip Hoodie\` или \`Travis Scott Jordan 1\`)*:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_draft' }]]
      }
    });
  }

  // Wizard: Step 2 -> Title
  if (session.step === 'awaiting_title') {
    session.draft.fullName = text;
    const parts = text.split(' ');
    session.draft.brand = parts[0].toUpperCase();
    session.draft.name = parts.slice(1).join(' ') || text;
    session.step = 'awaiting_price';

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Название: **${text}**\n\n` +
            `💰 **ШАГ 3 ИЗ 7: ЦЕНА В РУБЛЯХ**\n\n` +
            `Введите цену в рублях (только цифры, например: \`45000\`):`,
      parse_mode: 'Markdown'
    });
  }

  // Wizard: Step 3 -> Price
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

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Цена: **${num.toLocaleString('ru-RU')} ₽**\n\n` +
            `📏 **ШАГ 4 ИЗ 7: ДОСТУПНЫЕ РАЗМЕРЫ**\n\n` +
            `Введите размеры через запятую *(например: \`41, 42, 43\` или \`M, L, XL\`)*\n` +
            `или нажмите кнопку быстрого выбора:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👟 40, 41, 42, 43, 44 EU', callback_data: 'wiz_size_shoes' }],
          [{ text: '👕 S, M, L, XL', callback_data: 'wiz_size_clothes' }],
          [{ text: '🎒 ONE SIZE', callback_data: 'wiz_size_onesize' }],
          [{ text: '❌ Отмена', callback_data: 'cancel_draft' }]
        ]
      }
    });
  }

  // Wizard: Step 4 -> Sizes
  if (session.step === 'awaiting_sizes') {
    session.draft.sizes = text.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
    if (session.draft.sizes.length === 0) session.draft.sizes = [text];
    session.step = 'awaiting_category';

    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ Размеры: **${session.draft.sizes.join(', ')}**\n\n` +
            `🏷 **ШАГ 5 ИЗ 7: КАТЕГОРИЯ ТОВАРА:**`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👟 Обувь', callback_data: 'wiz_cat_footwear' },
            { text: '🧥 Одежда', callback_data: 'wiz_cat_clothing' },
            { text: '🎒 Аксессуары', callback_data: 'wiz_cat_accessories' }
          ]
        ]
      }
    });
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

  if (data === 'cancel_draft') {
    clearSession(chatId);
    return callTelegram('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: '❌ Добавление товара отменено.',
      reply_markup: { inline_keyboard: [] }
    });
  }

  // Wizard: Quick sizes
  if (data.startsWith('wiz_size_')) {
    if (data === 'wiz_size_shoes') session.draft.sizes = ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'];
    else if (data === 'wiz_size_clothes') session.draft.sizes = ['S', 'M', 'L', 'XL'];
    else if (data === 'wiz_size_onesize') session.draft.sizes = ['ONE SIZE'];

    session.step = 'awaiting_category';
    return callTelegram('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `✅ Размеры: **${session.draft.sizes.join(', ')}**\n\n` +
            `🏷 **ШАГ 5 ИЗ 7: КАТЕГОРИЯ ТОВАРА:**`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👟 Обувь', callback_data: 'wiz_cat_footwear' },
            { text: '🧥 Одежда', callback_data: 'wiz_cat_clothing' },
            { text: '🎒 Аксессуары', callback_data: 'wiz_cat_accessories' }
          ]
        ]
      }
    });
  }

  // Wizard: Category selection
  if (data.startsWith('wiz_cat_')) {
    const cat = data.replace('wiz_cat_', '');
    session.draft.category = cat;
    session.step = 'awaiting_condition';

    return callTelegram('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `✅ Категория: **${cat === 'footwear' ? 'Обувь' : cat === 'clothing' ? 'Одежда' : 'Аксессуары'}**\n\n` +
            `✨ **ШАГ 6 ИЗ 7: СОСТОЯНИЕ ВЕЩИ:**`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✨ NEW // DEADSTOCK (Новое)', callback_data: 'wiz_cond_new' }],
          [{ text: '💎 9.5/10 (Идеальное / Примерка)', callback_data: 'wiz_cond_95' }],
          [{ text: '⚡ 9/10 (Отличное)', callback_data: 'wiz_cond_90' }],
          [{ text: '👍 8.5/10 (Хорошее)', callback_data: 'wiz_cond_85' }],
          [{ text: '🔥 7/10 (Винтаж / Дистресс)', callback_data: 'wiz_cond_70' }]
        ]
      }
    });
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
    session.step = 'awaiting_location';

    return callTelegram('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `📍 **ШАГ 7 ИЗ 7: ЛОКАЦИЯ, НАЛИЧИЕ ИЛИ ТРАНЗИТ:**\n\n` +
            `Выберите фактический статус товара:`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🟢 В наличии в СПб (Шоурум Балконский, Невский просп., 110В)', callback_data: 'wiz_loc_spb' }],
          [{ text: '🚛 В пути из Китая в СПб (~5–8 дней / Бронь)', callback_data: 'wiz_loc_tr_spb' }],
          [{ text: '🚛 В пути из Китая в Иркутск (~3–6 дней / Бронь)', callback_data: 'wiz_loc_tr_irk' }],
          [{ text: '🇨🇳 Предзаказ на всю РФ (Китай / Poizon, 7–12 дней)', callback_data: 'wiz_loc_cn' }],
          [{ text: '🇯🇵 Предзаказ на всю РФ (Япония / Токио, 7–14 дней)', callback_data: 'wiz_loc_jp' }],
          [{ text: '🌍 Предзаказ на всю РФ (Европа / Grailed, 10–16 дней)', callback_data: 'wiz_loc_glb' }]
        ]
      }
    });
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

  // Wizard: Confirm & Publish
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

  if (data.startsWith('catpage_')) {
    const p = parseInt(data.replace('catpage_', ''), 10);
    return sendCatalogPage(chatId, p);
  }
}

// ---------------------------------------------------------------------------
// Send Final Confirmation Preview
// ---------------------------------------------------------------------------
async function sendFinalConfirmation(chatId, draft) {
  let statusBadge = '✈️ ПРЕДЗАКАЗ НА ВСЮ РФ';
  if (draft.stockType === 'instock') statusBadge = '🟢 В НАЛИЧИИ В СПБ';
  else if (draft.stockType === 'transit_spb') statusBadge = '🚛 В ПУТИ В СПБ (~5–8 ДН)';
  else if (draft.stockType === 'transit_irkutsk') statusBadge = '🚛 В ПУТИ В ИРКУТСК (~3–6 ДН)';

  const summary = `🔍 **ПРЕДПРОСМОТР КАРТОЧКИ ТОВАРА:**\n\n` +
    `🏷 **Бренд:** ${draft.brand}\n` +
    `📦 **Модель:** ${draft.name}\n` +
    `💰 **Цена:** ${Number(draft.price).toLocaleString('ru-RU')} ₽\n` +
    `📏 **Размеры:** ${(draft.sizes || []).join(', ')}\n` +
    `📁 **Категория:** ${draft.category}\n` +
    `✨ **Состояние:** ${draft.condition}\n` +
    `📍 **Логистика:** ${statusBadge}\n` +
    `⏱ **Срок:** ${draft.deliveryTime}\n\n` +
    `Опубликовать эту вещь на сайт?`;

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: summary,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 ОПУБЛИКОВАТЬ НА САЙТ', callback_data: 'wiz_confirm_publish' }],
        [{ text: '❌ Отменить', callback_data: 'cancel_draft' }]
      ]
    }
  });
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

  const newProduct = {
    id: draft.id || `sasbov-card-${Date.now()}`,
    brand: draft.brand,
    name: draft.name,
    fullName: `${draft.brand} ${draft.name}`,
    price: Number(draft.price),
    originalPrice: Math.round(Number(draft.price) * 1.25),
    category: draft.category || 'footwear',
    subcategories: [draft.category || 'footwear'],
    stockType: draft.stockType || 'preorder',
    region: draft.region || 'china',
    regionLabel: draft.regionLabel || 'CHINA [CN] // POIZON DEWU',
    deliveryTime: draft.deliveryTime || 'Выкуп под заказ: 7–12 дней (СДЭК)',
    sizes: draft.sizes || ['ONE SIZE'],
    condition: draft.condition || 'NEW // DEADSTOCK',
    status: statusText,
    image: draft.image,
    images: draft.images || [draft.image],
    features: ['100% Legit Check', 'Фирменная упаковка', 'Экспресс-доставка СДЭК'],
    createdAt: new Date().toISOString()
  };

  products.unshift(newProduct);
  saveProducts(products);
  clearSession(chatId);

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `🎉 **ТОВАР УСПЕШНО ОПУБЛИКОВАН НА САЙТ!**\n\n` +
          `• **${newProduct.brand} ${newProduct.name}**\n` +
          `• Цена: **${newProduct.price.toLocaleString('ru-RU')} ₽**\n` +
          `• Статус: **${statusText}**\n` +
          `• Позиция добавлена первой в каталог (всего: ${products.length})\n\n` +
          `👇 Проверьте карточку на сайте:`,
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

    text += `${curPage * PAGE_SIZE + idx + 1}. **${p.brand}** ${p.name}\n   Цена: ${Number(p.price).toLocaleString('ru-RU')} ₽ | [${loc}]\n\n`;

    inlineKeyboard.push([{
      text: `🗑 Удалить: ${p.brand} ${p.name.slice(0, 18)}...`,
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
      console.error('[TG Bot] Polling error:', err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
    // Yield to event loop
    await new Promise(r => setTimeout(r, 600));
  }
}

async function setupBotCommands() {
  try {
    await callTelegram('setMyCommands', {
      commands: [
        { command: 'start', description: '🔑 Главное меню / Добавить товар' },
        { command: 'new', description: '➕ Добавить товар вручную' },
        { command: 'catalog', description: '📦 Каталог товаров и удаление' },
        { command: 'stats', description: '📊 Статистика сайта' },
        { command: 'site', description: '🌐 Открыть сайт онлайн' }
      ]
    });
    await callTelegram('setChatMenuButton', {
      menu_button: { type: 'default' }
    });
    console.log('[TG Bot] Commands and default menu button registered successfully.');
  } catch (e) {
    console.error('[TG Bot] Failed to register commands:', e.message);
  }
}

// Initial boot
(async () => {
  console.log('⚡ SASBOV Native Step-by-Step Telegram Admin Bot is running...');
  await setupBotCommands();
  startPollingLoop();
})();
