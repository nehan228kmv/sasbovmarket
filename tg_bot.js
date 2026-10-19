const fs = require('fs');
const path = require('path');
const https = require('https');

const BOT_TOKEN = '8676877978:AAGmD-92Sza4tH8U03RdnWoj0WWnP-cYQqE';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sasbov2026';
const ADMIN_WEBAPP_URL = 'https://sasbov.online/admin.html?token=sasbov2026';
const SITE_URL = 'https://sasbov.online';

const DATA_DIR = path.join(__dirname, 'data');
const ADMINS_FILE = path.join(DATA_DIR, 'admin_users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load authorized admin IDs
function loadAdmins() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf-8'));
      return data;
    }
  } catch (e) {
    console.error('Error reading admins file:', e.message);
  }
  return { authorized_ids: [], users: {} };
}

function saveAdmins(data) {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving admins file:', e.message);
  }
}

let adminStore = loadAdmins();

function isAuthorized(userId) {
  if (!userId) return false;
  return adminStore.authorized_ids.includes(Number(userId)) || adminStore.authorized_ids.includes(String(userId));
}

function authorizeUser(user) {
  const uid = Number(user.id);
  if (!adminStore.authorized_ids.includes(uid)) {
    adminStore.authorized_ids.push(uid);
  }
  adminStore.users[uid] = {
    id: uid,
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    authorized_at: new Date().toISOString()
  };
  saveAdmins(adminStore);
  console.log(`[AUTH] User ${uid} (@${user.username || 'unknown'}) authorized as admin.`);
}

function deauthorizeUser(userId) {
  const uid = Number(userId);
  adminStore.authorized_ids = adminStore.authorized_ids.filter(id => Number(id) !== uid);
  delete adminStore.users[uid];
  saveAdmins(adminStore);
  console.log(`[AUTH] User ${uid} deauthorized.`);
}

function callTelegram(method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
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
          resolve(chunks);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Set global default menu button to standard (so unauthorized strangers have NO web_app button)
async function resetGlobalMenuButton() {
  try {
    await callTelegram('setChatMenuButton', {
      menu_button: { type: 'default' }
    });
    console.log('[MENU] Global default menu button reset to standard.');
  } catch (e) {
    console.error('[MENU] Failed to reset global menu button:', e.message);
  }
}

// Set personalized WebApp menu button for an authorized admin
async function setAdminMenuButton(chatId) {
  try {
    await callTelegram('setChatMenuButton', {
      chat_id: chatId,
      menu_button: {
        type: 'web_app',
        text: '⚡ Пульт SASBOV',
        web_app: { url: ADMIN_WEBAPP_URL }
      }
    });
  } catch (e) {
    console.error('[MENU] Error setting admin menu button:', e.message);
  }
}

// Reset menu button for unauthorized user
async function removeUserMenuButton(chatId) {
  try {
    await callTelegram('setChatMenuButton', {
      chat_id: chatId,
      menu_button: { type: 'default' }
    });
  } catch (e) {
    console.error('[MENU] Error removing user menu button:', e.message);
  }
}

async function sendAccessDenied(chatId) {
  await removeUserMenuButton(chatId);
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `🔒 **SASBOV // PRIVATE CONSOLE**\n\nЭтот бот является закрытым терминалом управления магазином **sasbov.online**.\n\n⛔ **Доступ строго ограничен.**\n\n🔑 Чтобы войти в панель управления, отправьте мастер-пароль администратора:`,
    parse_mode: 'Markdown'
  });
}

async function sendAuthorizedConsole(chatId, user) {
  await setAdminMenuButton(chatId);

  let productCount = 0;
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const items = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
      if (Array.isArray(items)) productCount = items.length;
    }
  } catch (e) {}

  const displayName = user.first_name ? `${user.first_name} ${user.username ? '(@' + user.username + ')' : ''}` : `@${user.username || user.id}`;

  return callTelegram('sendMessage', {
    chat_id: chatId,
    text: `⚡ **SASBOV MARKET // ROOT CONSOLE**\n\n` +
          `👤 **Администратор:** ${displayName}\n` +
          `🟢 **Статус системы:** В сети (sasbov.online)\n` +
          `📦 **Товаров в базе:** ${productCount}\n\n` +
          `Нажмите **«ОТКРЫТЬ ПУЛЬТ УПРАВЛЕНИЯ»**, чтобы запустить полноэкранную админку прямо в Telegram.\n` +
          `Вы можете добавлять новые дропы, загружать фото прямо с камеры/галереи и управлять ценами.`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 ОТКРЫТЬ ПУЛЬТ УПРАВЛЕНИЯ',
            web_app: { url: ADMIN_WEBAPP_URL }
          }
        ],
        [
          {
            text: '🌐 sasbov.online',
            url: SITE_URL
          },
          {
            text: '🎬 TikTok-лента',
            url: `${SITE_URL}/feed.html`
          }
        ],
        [
          {
            text: '🔒 Завершить сессию (/logout)',
            callback_data: 'logout'
          }
        ]
      ]
    }
  });
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const user = msg.from || msg.chat;
  const text = (msg.text || '').trim();

  // Check if user is sending the master password or /auth <password>
  const isAuthAttempt = text === ADMIN_PASSWORD ||
                        text.toLowerCase() === `/auth ${ADMIN_PASSWORD.toLowerCase()}` ||
                        text.toLowerCase() === `/start ${ADMIN_PASSWORD.toLowerCase()}` ||
                        text.toLowerCase() === `/login ${ADMIN_PASSWORD.toLowerCase()}`;

  if (isAuthAttempt) {
    authorizeUser(user);
    await callTelegram('sendMessage', {
      chat_id: chatId,
      text: `✅ **ДОСТУП ПОДТВЕРЖДЕН!**\n\nВаш Telegram ID (\`${user.id}\`) успешно добавлен в белый список администраторов SASBOV.`,
      parse_mode: 'Markdown'
    });
    return sendAuthorizedConsole(chatId, user);
  }

  // Check if currently authorized
  if (!isAuthorized(user.id)) {
    return sendAccessDenied(chatId);
  }

  // Authorized commands:
  if (text === '/logout' || text.toLowerCase() === 'выйти') {
    deauthorizeUser(user.id);
    await removeUserMenuButton(chatId);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔒 **СЕССИЯ ЗАВЕРШЕНА**\n\nВы успешно вышли из системы. Доступ к пульту управления закрыт.\nДля повторного входа введите мастер-пароль:`,
      parse_mode: 'Markdown'
    });
  }

  if (text === '/status') {
    const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const uptimeH = Math.round(process.uptime() / 3600);
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `📊 **СИСТЕМНЫЙ СТАТУС SASBOV**\n\n` +
            `• Процесс: Онлайн (PID ${process.pid})\n` +
            `• Память: ${mem} MB\n` +
            `• Аптайм: ${uptimeH} ч.\n` +
            `• Домен: https://sasbov.online\n` +
            `• Авторизованных админов: ${adminStore.authorized_ids.length}`,
      parse_mode: 'Markdown'
    });
  }

  // Default response for authorized user
  return sendAuthorizedConsole(chatId, user);
}

async function handleCallback(cb) {
  const chatId = cb.message.chat.id;
  const user = cb.from;
  const data = cb.data;

  if (data === 'logout') {
    deauthorizeUser(user.id);
    await removeUserMenuButton(chatId);
    await callTelegram('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: 'Сессия завершена'
    });
    return callTelegram('sendMessage', {
      chat_id: chatId,
      text: `🔒 **СЕССИЯ ЗАВЕРШЕНА**\n\nВы вышли из системы. Для входа введите мастер-пароль.`,
      parse_mode: 'Markdown'
    });
  }

  await callTelegram('answerCallbackQuery', { callback_query_id: cb.id });
}

let lastUpdateId = 0;

async function poll() {
  try {
    const res = await callTelegram('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 30
    });

    if (res && res.ok && Array.isArray(res.result)) {
      for (const update of res.result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        if (update.message) {
          await handleMessage(update.message);
        } else if (update.callback_query) {
          await handleCallback(update.callback_query);
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
    await new Promise(r => setTimeout(r, 3000));
  }
  setImmediate(poll);
}

// Initial boot
(async () => {
  console.log('⚡ SASBOV Private Admin Bot is starting...');
  await resetGlobalMenuButton();
  poll();
})();
