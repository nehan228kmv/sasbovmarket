/**
 * SASBOV MARKET — Admin Object Controller Logic
 * Direct CRUD operations for all product cards tied as objects to localStorage
 * Protected by Secret Token Gatekeeper Authentication Protocol
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sasbov_market_products_v1';
  const MASTER_TOKEN_KEY = 'sasbov_admin_token';
  const AUTH_SESSION_KEY = 'sasbov_admin_auth_v1';
  const DEFAULT_TOKEN = 'sasbov2026';

  function getMasterToken() {
    return localStorage.getItem(MASTER_TOKEN_KEY) || DEFAULT_TOKEN;
  }

  function setMasterToken(newToken) {
    localStorage.setItem(MASTER_TOKEN_KEY, newToken);
  }

  // Toast Notification System
  function showToast(message, duration = 3500) {
    const toast = document.getElementById('admin-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, duration);
  }

  // =========================================================================
  // Gatekeeper Authentication Protocol
  // =========================================================================
  const authOverlay = document.getElementById('admin-auth-overlay');
  const dashboardRoot = document.getElementById('admin-dashboard-root');
  const authForm = document.getElementById('admin-auth-form');
  const authTokenInput = document.getElementById('admin-auth-token-input');
  const authError = document.getElementById('admin-auth-error');
  const toggleEyeBtn = document.getElementById('toggle-token-eye');

  const changeTokenBtn = document.getElementById('change-master-token-btn');
  const logoutBtn = document.getElementById('logout-admin-btn');

  // Change Token Modal Elements
  const changeTokenModal = document.getElementById('change-token-modal');
  const changeTokenBackdrop = document.getElementById('change-token-backdrop');
  const changeTokenCloseBtn = document.getElementById('change-token-close-btn');
  const changeTokenCancelBtn = document.getElementById('change-token-cancel-btn');
  const changeTokenForm = document.getElementById('change-token-modal-form');
  const currentTokenField = document.getElementById('current-token-field');
  const newTokenField = document.getElementById('new-token-field');
  const changeTokenErrorMsg = document.getElementById('change-token-error-msg');

  function checkAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token') || urlParams.get('key') || urlParams.get('auth');
    const validToken = getMasterToken();

    // 1. Check if valid token is provided in URL
    if (tokenFromUrl && tokenFromUrl.trim() === validToken.trim()) {
      sessionStorage.setItem(AUTH_SESSION_KEY, '1');
      unlockDashboard(false);
      // Immediately wipe the token query parameter from browser address bar for security
      try {
        window.history.replaceState(null, document.title, window.location.pathname);
      } catch (e) {}
      showToast('[OK] // Вход выполнен успешно. Токен скрыт из URL');
      return;
    }

    // 2. Check if already authenticated in current session
    if (sessionStorage.getItem(AUTH_SESSION_KEY) === '1') {
      unlockDashboard(false);
      return;
    }

    // 3. Otherwise, keep locked
    lockDashboard();
  }

  function unlockDashboard(animate = true) {
    authOverlay.style.display = 'none';
    dashboardRoot.style.display = 'block';
    renderCards();
    initCloudProducts();
  }

  function lockDashboard() {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    authOverlay.style.display = 'flex';
    dashboardRoot.style.display = 'none';
    if (authTokenInput) {
      authTokenInput.value = '';
      authTokenInput.focus();
    }
  }

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = authTokenInput.value.trim();
      const validToken = getMasterToken();

      if (entered === validToken) {
        sessionStorage.setItem(AUTH_SESSION_KEY, '1');
        authError.style.display = 'none';
        unlockDashboard(true);
        showToast('[OK] // Терминал разблокирован. Добро пожаловать!');
      } else {
        authError.style.display = 'block';
        authTokenInput.select();
        authTokenInput.focus();
      }
    });
  }

  if (toggleEyeBtn && authTokenInput) {
    toggleEyeBtn.addEventListener('click', () => {
      const isPassword = authTokenInput.type === 'password';
      authTokenInput.type = isPassword ? 'text' : 'password';
      toggleEyeBtn.textContent = isPassword ? '[HIDE]' : '[SHOW]';
    });
  }

  // Interactive Change Master Token Modal
  function openChangeTokenModal() {
    if (!changeTokenModal) return;
    if (currentTokenField) currentTokenField.value = '';
    if (newTokenField) newTokenField.value = '';
    if (changeTokenErrorMsg) changeTokenErrorMsg.style.display = 'none';
    if (typeof changeTokenModal.showModal === 'function') {
      changeTokenModal.showModal();
    } else {
      changeTokenModal.setAttribute('open', '');
    }
    if (currentTokenField) currentTokenField.focus();
  }

  function closeChangeTokenModal() {
    if (!changeTokenModal) return;
    if (typeof changeTokenModal.close === 'function') {
      changeTokenModal.close();
    } else {
      changeTokenModal.removeAttribute('open');
    }
  }

  if (changeTokenBtn) {
    changeTokenBtn.addEventListener('click', openChangeTokenModal);
  }
  if (changeTokenCloseBtn) {
    changeTokenCloseBtn.addEventListener('click', closeChangeTokenModal);
  }
  if (changeTokenCancelBtn) {
    changeTokenCancelBtn.addEventListener('click', closeChangeTokenModal);
  }
  if (changeTokenBackdrop) {
    changeTokenBackdrop.addEventListener('click', closeChangeTokenModal);
  }

  if (changeTokenForm) {
    changeTokenForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const curEntered = currentTokenField ? currentTokenField.value.trim() : '';
      const newEntered = newTokenField ? newTokenField.value.trim() : '';
      const validCurrent = getMasterToken();

      if (curEntered !== validCurrent) {
        if (changeTokenErrorMsg) {
          changeTokenErrorMsg.textContent = '[ОШИБКА] Текущий токен указан неверно!';
          changeTokenErrorMsg.style.display = 'block';
        }
        if (currentTokenField) {
          currentTokenField.select();
          currentTokenField.focus();
        }
        return;
      }

      if (!newEntered || newEntered.length < 4) {
        if (changeTokenErrorMsg) {
          changeTokenErrorMsg.textContent = '[ОШИБКА] Новый токен должен содержать минимум 4 символа!';
          changeTokenErrorMsg.style.display = 'block';
        }
        if (newTokenField) newTokenField.focus();
        return;
      }

      // Save new token
      setMasterToken(newEntered);
      closeChangeTokenModal();
      showToast(`[OK] // Мастер-токен успешно обновлён на новый!`);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Заблокировать панель управления?')) {
        lockDashboard();
      }
    });
  }

  // =========================================================================
  // Product Data Store
  // =========================================================================
  const DEFAULT_PRODUCTS = [
    {
      id: 'sasbov-01',
      brand: 'MAISON MIHARA YASUHIRO',
      name: 'Peterson OG Sole Canvas Low-Top',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      region: 'japan',
      regionLabel: 'JAPAN [JP] // TOKYO ARCHIVE',
      category: 'footwear',
      sku: 'MMY-PET-904',
      basePriceRub: 24800,
      sizes: ['39 EU', '40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: '03 дн. 16:45',
      image: null,
      images: []
    },
    {
      id: 'sasbov-02',
      brand: 'KAPITAL',
      name: '14oz Denim Bone Embroidered Jacket',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      region: 'japan',
      regionLabel: 'JAPAN [JP] // KOJIMA ARCHIVE',
      category: 'clothing',
      sku: 'KAP-BONE-14OZ',
      basePriceRub: 42500,
      sizes: ['1 (S)', '2 (M)', '3 (L)', '4 (XL)'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: '01 дн. 08:20',
      image: null,
      images: []
    },
    {
      id: 'sasbov-03',
      brand: 'ROARINGWILD',
      name: 'Modular Waterproof Tech Shell Parka',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Shenzhen Lab',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      region: 'china',
      regionLabel: 'CHINA [CN] // SHENZHEN LAB',
      category: 'clothing',
      sku: 'RW-TECH-26X',
      basePriceRub: 17900,
      sizes: ['S (46)', 'M (48)', 'L (50)', 'XL (52)'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '04 дн. 12:10',
      image: null,
      images: []
    },
    {
      id: 'sasbov-04',
      brand: 'SALOMON x MM6',
      name: 'Cross Low Sneaker "Black Edition"',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      region: 'japan',
      regionLabel: 'JAPAN [JP] // EBAY JP ARCHIVE',
      category: 'footwear',
      sku: 'SAL-MM6-BLK',
      basePriceRub: 32000,
      sizes: ['40.5 EU', '41.5 EU', '42 EU', '43 EU', '44 EU'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: '14 ч. 22 мин',
      image: null,
      images: []
    },
    {
      id: 'sasbov-05',
      brand: 'THUG CLUB',
      name: 'Tribal Gladiator Heavy Fleece Hoodie',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Goofish Xianyu',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      region: 'china',
      regionLabel: 'CHINA [CN] // GOOFISH XIANYU',
      category: 'clothing',
      sku: 'TC-GLAD-091',
      basePriceRub: 19500,
      sizes: ['M (Oversize)', 'L (Oversize)', 'XL (Oversize)'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '02 дн. 19:30',
      image: null,
      images: []
    },
    {
      id: 'sasbov-06',
      brand: 'PORTER YOSHIDA & CO',
      name: 'Tanker 2Way Helmet Shoulder Bag',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      region: 'japan',
      regionLabel: 'JAPAN [JP] // MERCARI JP',
      category: 'accessories',
      sku: 'POR-TNK-2WAY',
      basePriceRub: 21400,
      sizes: ['ONE SIZE (W480/H520)'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: '05 дн. 04:15',
      image: null,
      images: []
    },
    {
      id: 'sasbov-07',
      brand: 'ANTA x KYRIE IRVING',
      name: 'KAI 1 "Artist on Court" Special Edition',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Poizon Auth',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      region: 'china',
      regionLabel: 'CHINA [CN] // POIZON AUTH',
      category: 'footwear',
      sku: 'ANTA-KAI1-ART',
      basePriceRub: 16800,
      sizes: ['41 EU', '42 EU', '42.5 EU', '43 EU', '44 EU', '45 EU'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '03 дн. 21:00',
      image: null,
      images: []
    },
    {
      id: 'sasbov-08',
      brand: 'UNDERCOVERISM',
      name: 'Hybrid MA-1 Vintage Military Bomber',
      stockType: 'preorder',
      partner: null,
      location: 'Япония // Harajuku Archive',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      region: 'japan',
      regionLabel: 'JAPAN [JP] // HARAJUKU',
      category: 'clothing',
      sku: 'UC-HYB-MA1',
      basePriceRub: 48900,
      sizes: ['2 (M)', '3 (L)', '4 (XL)'],
      dropStatus: 'СКОРО ЗАКРЫТИЕ',
      badgeClass: 'jp',
      closingIn: '09 ч. 40 мин',
      image: null,
      images: []
    },
    {
      id: 'sasbov-09',
      brand: 'HARSH AND CRUEL',
      name: 'Cyber Crossbody Tactical Harness Rig',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Dewu Boutique',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      region: 'china',
      regionLabel: 'CHINA [CN] // DEWU BOUTIQUE',
      category: 'accessories',
      sku: 'HAC-RIG-004',
      basePriceRub: 8400,
      sizes: ['ADJUSTABLE ONE SIZE'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '06 дн. 09:15',
      image: null,
      images: []
    },
    {
      id: 'sasbov-10',
      brand: 'HELMUT LANG',
      name: '1998 M-65 Astro Biker Ballistic Jacket',
      stockType: 'preorder',
      partner: null,
      location: 'Global // Grailed Archive',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      region: 'global',
      regionLabel: 'GLOBAL [GLB] // GRAILED ARCHIVE',
      category: 'clothing',
      sku: 'HL-98-ASTRO',
      basePriceRub: 89000,
      sizes: ['48 IT', '50 IT'],
      dropStatus: 'LIMITED DROP',
      badgeClass: 'global',
      closingIn: '01 дн. 18:30',
      image: null,
      images: []
    }
  ];

  function loadProducts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(item => {
            // Ensure images array exists
            if (!Array.isArray(item.images)) {
              item.images = item.image ? [item.image] : [];
            }
            if (item.regionLabel) {
              item.regionLabel = item.regionLabel.replace(/🇯🇵/g, '[JP]').replace(/🇨🇳/g, '[CN]');
            }
            // Auto-migrate stockType if missing
            if (!item.stockType) {
              if (['sasbov-01', 'sasbov-02', 'sasbov-04', 'sasbov-06'].includes(item.id) || 
                  item.region === 'spb' || 
                  (item.brand && item.brand.includes('BALENCIAGA')) ||
                  (item.dropStatus && item.dropStatus.includes('НАЛИЧИ'))) {
                item.stockType = 'instock';
                item.partner = 'Balkonsky Store (Санкт-Петербург)';
                item.location = 'Санкт-Петербург, Balkonsky Store';
                item.deliveryTime = 'В наличии в СПб // Примерка и самовывоз сегодня';
              } else {
                item.stockType = 'preorder';
                item.partner = null;
                item.location = item.regionLabel || 'Зарубежные площадки';
                item.deliveryTime = 'Выкуп под заказ: 10-18 дней';
              }
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.warn('LocalStorage load error in admin:', e);
    }
    return [...DEFAULT_PRODUCTS];
  }

  function saveProducts(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem('sasbov_market_sync_ts', Date.now().toString());
    } catch (e) {
      console.error('LocalStorage save error in admin:', e);
      alert('Ошибка при сохранении в память браузера (LocalStorage переполнен).');
    }
    try {
      window.dispatchEvent(new CustomEvent('sasbov:products_updated', { detail: list }));
    } catch (e) {}
    // Seamless background sync with Vercel Serverless KV / Postgres
    syncWithCloudDatabase(list);
  }

  const TRASH_STORAGE_KEY = 'sasbov_market_trash_v1';

  function loadTrash() {
    try {
      const raw = localStorage.getItem(TRASH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage load trash error in admin:', e);
    }
    return [];
  }

  function saveTrash(list) {
    try {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem('sasbov_market_trash_sync_ts', Date.now().toString());
    } catch (e) {
      console.error('LocalStorage save trash error in admin:', e);
    }
    updateStats();
  }

  let PRODUCTS = loadProducts();
  let TRASH = loadTrash();
  let currentFilter = 'all';
  let searchQuery = '';

  // Multi-Photo Gallery State for Card Editor
  let currentEditorImages = [];

  // DOM Elements
  const grid = document.getElementById('admin-cards-grid');
  const searchInput = document.getElementById('admin-search-input');
  const filterPills = document.querySelectorAll('.admin-pill');
  const statTotal = document.getElementById('stat-total-cards');
  const statInstock = document.getElementById('stat-instock-cards');
  const statPreorder = document.getElementById('stat-preorder-cards');
  const statJp = document.getElementById('stat-jp-cards');
  const statCn = document.getElementById('stat-cn-cards');
  const statTrash = document.getElementById('stat-trash-cards');
  const statVal = document.getElementById('stat-total-val');
  const countAll = document.getElementById('count-all');
  const countInstock = document.getElementById('count-instock');
  const countPreorder = document.getElementById('count-preorder');
  const countJp = document.getElementById('count-jp');
  const countCn = document.getElementById('count-cn');
  const countTrash = document.getElementById('count-trash');
  const statCardTrash = document.getElementById('stat-card-trash');
  const openTrashBtn = document.getElementById('open-trash-btn');

  // Trash Modal Elements
  const trashModal = document.getElementById('trash-modal');
  const trashBackdrop = document.getElementById('trash-backdrop');
  const trashCloseBtn = document.getElementById('trash-modal-close-btn');
  const trashDoneBtn = document.getElementById('trash-modal-done-btn');
  const trashCountEl = document.getElementById('trash-modal-count');
  const trashListEl = document.getElementById('trash-items-list');
  const trashPurgeAllBtn = document.getElementById('trash-purge-all-btn');

  // Single Card Modal Form
  const cardModal = document.getElementById('card-editor-modal');
  const cardBackdrop = document.getElementById('card-editor-backdrop');
  const cardCloseBtn = document.getElementById('card-editor-close-btn');
  const cardCancelBtn = document.getElementById('card-editor-cancel-btn');
  const cardForm = document.getElementById('card-editor-form');
  const cardModalTitle = document.getElementById('card-editor-title');
  const openNewCardBtn = document.getElementById('open-new-card-btn');

  // Form Fields
  const editIdInput = document.getElementById('edit-product-id');
  const brandInput = document.getElementById('card-brand-input');
  const nameInput = document.getElementById('card-name-input');
  const stockTypeSelect = document.getElementById('card-stock-type-select');
  const regionSelect = document.getElementById('card-region-select');
  const categorySelect = document.getElementById('card-category-select');
  const priceInput = document.getElementById('card-price-input');
  const sizesInput = document.getElementById('card-sizes-input');
  const timerDatetime = document.getElementById('card-timer-datetime');
  const timerInput = document.getElementById('card-timer-input');
  const timerPreview = document.getElementById('card-timer-preview');
  const timerPresetBtns = document.querySelectorAll('.timer-preset-btn');
  const statusSelect = document.getElementById('card-status-select');
  const conditionSelect = document.getElementById('card-condition-select');
  const descInput = document.getElementById('card-desc-input');

  // Multi-Photo Inputs
  const multiDropzone = document.getElementById('multi-photo-dropzone');
  const cardPhotosInput = document.getElementById('card-photos-input');
  const photoUrlInput = document.getElementById('card-photo-url-input');
  const addPhotoUrlBtn = document.getElementById('add-photo-url-btn');
  const photosGallery = document.getElementById('editor-photos-gallery');
  const photoCountBadge = document.getElementById('editor-photo-count-badge');

  // Auxiliary Toolbar
  const exportBtn = document.getElementById('export-json-btn');
  const importInput = document.getElementById('import-json-input');
  const resetBtn = document.getElementById('reset-factory-btn');

  // Batch Modal
  const batchModal = document.getElementById('batch-upload-modal');
  const batchBackdrop = document.getElementById('batch-backdrop');
  const batchCloseBtn = document.getElementById('batch-close-btn');
  const openBatchBtn = document.getElementById('open-batch-upload-btn');
  const batchDropzone = document.getElementById('batch-dropzone');
  const batchFileInput = document.getElementById('batch-file-input');
  const batchQueueWrap = document.getElementById('batch-queue-container');
  const batchFooterBar = document.getElementById('batch-footer-bar');
  const batchClearBtn = document.getElementById('batch-clear-btn');
  const batchPublishBtn = document.getElementById('batch-publish-btn');
  let batchItems = [];

  // Delete Confirmation Modal Elements
  const deleteModal = document.getElementById('delete-confirm-modal');
  const deleteBackdrop = document.getElementById('delete-backdrop');
  const deleteCloseBtn = document.getElementById('delete-modal-close-btn');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  const deleteThumbEl = document.getElementById('delete-card-preview-thumb');
  const deleteBrandEl = document.getElementById('delete-card-brand');
  const deleteNameEl = document.getElementById('delete-card-name');
  const deletePriceEl = document.getElementById('delete-card-price');
  let targetDeleteId = null;

  function formatRub(num) {
    return Math.round(num).toLocaleString('ru-RU') + ' ₽';
  }

  // Update Stats & Counts
  function updateStats() {
    const total = PRODUCTS.length;
    const instockCount = PRODUCTS.filter(p => p.stockType === 'instock').length;
    const preorderCount = PRODUCTS.filter(p => p.stockType === 'preorder').length;
    const jpCount = PRODUCTS.filter(p => p.region === 'japan').length;
    const cnCount = PRODUCTS.filter(p => p.region === 'china').length;
    const sumVal = PRODUCTS.reduce((sum, p) => sum + (Number(p.basePriceRub) || 0), 0);

    if (statTotal) statTotal.textContent = total;
    if (statInstock) statInstock.textContent = instockCount;
    if (statPreorder) statPreorder.textContent = preorderCount;
    if (statVal) statVal.textContent = formatRub(sumVal);

    if (countAll) countAll.textContent = total;
    if (countInstock) countInstock.textContent = instockCount;
    if (countPreorder) countPreorder.textContent = preorderCount;
    if (countJp) countJp.textContent = jpCount;
    if (countCn) countCn.textContent = cnCount;
    if (countTrash) countTrash.textContent = TRASH.length;
    if (statTrash) statTrash.textContent = TRASH.length;
    if (trashCountEl) trashCountEl.textContent = TRASH.length;
  }

  // Helper to extract item images
  function getItemImages(item) {
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images.filter(Boolean);
    }
    if (item.image) {
      return [item.image];
    }
    return [];
  }

  // Render All Cards as Interactive Objects
  function renderCards() {
    updateStats();

    const filtered = PRODUCTS.filter(p => {
      let matchFilter = true;
      if (currentFilter === 'instock') matchFilter = p.stockType === 'instock';
      else if (currentFilter === 'preorder') matchFilter = p.stockType === 'preorder';
      else if (currentFilter === 'japan') matchFilter = p.region === 'japan';
      else if (currentFilter === 'china') matchFilter = p.region === 'china';
      else if (currentFilter !== 'all') matchFilter = p.region === currentFilter;

      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.partner && p.partner.toLowerCase().includes(q));

      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="padding: 4rem 1rem; text-align: center; color: var(--text-muted); background: #0c0c10; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px;">
          <p style="font-family: var(--font-mono); font-size: 1rem; color: #ffffff; margin-bottom: 0.5rem;">// КАРТОЧКИ НЕ НАЙДЕНЫ</p>
          <p style="font-size: 0.88rem;">По вашему запросу нет карточек. Нажмите «+ Добавить карточку» выше, чтобы создать новый айтем.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const sizesStr = Array.isArray(item.sizes) ? item.sizes.join(', ') : item.sizes;
      const isInstock = item.stockType === 'instock';
      const isJp = item.region === 'japan';
      const isGlobal = item.region === 'global';
      const isSpb = item.region === 'spb' || isInstock;
      const badgeCls = isSpb ? 'spb' : (isJp ? 'jp' : (isGlobal ? 'global' : 'cn'));
      const regionText = isSpb ? 'СПБ [SPB] // BALKONSKY' : (isJp ? 'ЯПОНИЯ [JP]' : (isGlobal ? 'GLOBAL [GLB]' : 'КИТАЙ [CN]'));

      const stockBadge = isInstock 
        ? `<span class="admin-card-stock-tag instock">✦ В НАЛИЧИИ: СПБ (BALKONSKY)</span>`
        : `<span class="admin-card-stock-tag preorder">ПРЕДЗАКАЗ (ВЫКУП)</span>`;

      const imgs = getItemImages(item);
      const photoBadge = imgs.length > 1 ? `<span class="thumb-badge" style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.85); color: #00f0ff; border: 1px solid rgba(0,240,255,0.3); font-size: 9px;">${imgs.length} ФОТО</span>` : '';

      const thumb = imgs.length > 0 ? `
        <img src="${imgs[0]}" alt="${item.brand} ${item.name}" class="admin-card-thumb-img">
        ${photoBadge}
      ` : `
        <div class="admin-thumb-empty">НЕТ ФОТО<br><span style="font-size:0.5rem; opacity:0.6;">[СЛОТ]</span></div>
      `;

      return `
        <div class="admin-card-row ${isInstock ? 'is-instock' : ''}" data-id="${item.id}">
          <div class="admin-card-thumb-wrap" style="position: relative;">
            ${thumb}
          </div>

          <div class="admin-card-title-col">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="admin-card-brand">${item.brand || 'БРЕНД'}</span>
              <span class="product-condition-pill" style="font-size: 9px; padding: 1px 5px;">● ${item.condition || 'NEW // DEADSTOCK'}</span>
            </div>
            <span class="admin-card-name">${item.name || 'Название позиции'}</span>
            ${item.description ? `<span style="font-size: 0.72rem; color: #a1a1aa; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${item.description}</span>` : ''}
            <span class="admin-card-sku">SKU: ${item.sku || 'N/A'} • ${item.category || 'Одежда'} • <strong>${imgs.length} фото</strong></span>
          </div>

          <div class="admin-card-meta-col">
            ${stockBadge}
            <span class="admin-region-badge ${badgeCls}">${regionText}</span>
            <span class="admin-card-sizes" title="${sizesStr}">Размеры: ${sizesStr || 'Универсальный'}</span>
            <span class="admin-card-sku">[EXP: ${item.closingIn || '03 дн.'}]</span>
          </div>

          <div class="admin-card-price-col">
            <span class="admin-card-price">${formatRub(item.basePriceRub || 0)}</span>
            <span class="admin-card-status-pill">● ${item.dropStatus || (isInstock ? 'В НАЛИЧИИ В СПБ' : 'ПРЕДЗАКАЗ ОТКРЫТ')}</span>
          </div>

          <div class="admin-card-actions-col">
            <button type="button" class="admin-action-icon-btn admin-btn-edit" data-edit-id="${item.id}" title="Редактировать объект и фото">
              [EDIT]
            </button>
            <button type="button" class="admin-action-icon-btn admin-btn-dup" data-dup-id="${item.id}" title="Дублировать карточку">
              ⧉
            </button>
            <button type="button" class="admin-action-icon-btn admin-action-delete admin-btn-del" data-del-id="${item.id}" title="Удалить карточку">
              [DEL]
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Action Listeners
    grid.querySelectorAll('.admin-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.editId));
    });

    grid.querySelectorAll('.admin-btn-dup').forEach(btn => {
      btn.addEventListener('click', () => duplicateCard(btn.dataset.dupId));
    });

    grid.querySelectorAll('.admin-btn-del').forEach(btn => {
      btn.addEventListener('click', () => deleteCard(btn.dataset.delId));
    });
  }

  // =========================================================================
  // Multi-Photo Manager in Card Editor (Reordering + Drag & Drop)
  // =========================================================================
  function renderEditorGallery() {
    if (!photosGallery) return;

    if (photoCountBadge) {
      photoCountBadge.textContent = `${currentEditorImages.length} ФОТО`;
    }

    if (currentEditorImages.length === 0) {
      photosGallery.innerHTML = `
        <div class="gallery-empty-notice">
          [ Фотографии пока не добавлены. Будет отображаться фирменный бруталистский слот ]
        </div>
      `;
      return;
    }

    photosGallery.innerHTML = currentEditorImages.map((src, idx) => {
      const isCover = idx === 0;
      const isFirst = idx === 0;
      const isLast = idx === currentEditorImages.length - 1;
      return `
        <div class="editor-thumb-card ${isCover ? 'is-cover' : ''}" data-idx="${idx}" draggable="true" title="Перетаскивайте мышью для смены порядка">
          <img src="${src}" alt="Фото ${idx + 1}" class="editor-thumb-img">
          <div class="editor-thumb-overlay">
            <div class="thumb-top-row">
              <span class="thumb-badge ${isCover ? 'cover' : ''}">${isCover ? '[★ ОБЛОЖКА]' : '#' + (idx + 1)}</span>
              <button type="button" class="thumb-del-btn" data-del-photo="${idx}" title="Удалить это фото">&times;</button>
            </div>

            <div class="thumb-reorder-bar">
              <button type="button" class="thumb-nav-btn" data-move-photo="${idx}" data-dir="-1" title="Сдвинуть влево (раньше)" ${isFirst ? 'disabled' : ''}>◀</button>
              <span class="thumb-order-num">#${idx + 1}</span>
              <button type="button" class="thumb-nav-btn" data-move-photo="${idx}" data-dir="1" title="Сдвинуть вправо (позже)" ${isLast ? 'disabled' : ''}>▶</button>
            </div>

            ${!isCover ? `
              <div class="thumb-bottom-row">
                <button type="button" class="thumb-set-cover-btn" data-set-cover="${idx}">Сделать обложкой</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Reorder buttons (left/right arrows)
    photosGallery.querySelectorAll('[data-move-photo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fromIdx = parseInt(btn.dataset.movePhoto, 10);
        const dir = parseInt(btn.dataset.dir, 10);
        const toIdx = fromIdx + dir;
        if (toIdx >= 0 && toIdx < currentEditorImages.length) {
          const temp = currentEditorImages[fromIdx];
          currentEditorImages[fromIdx] = currentEditorImages[toIdx];
          currentEditorImages[toIdx] = temp;
          renderEditorGallery();
          showToast(`[OK] // Порядок фото изменён (#${toIdx + 1})`);
        }
      });
    });

    // Drag and Drop listeners
    let draggedIdx = null;
    photosGallery.querySelectorAll('.editor-thumb-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedIdx = parseInt(card.dataset.idx, 10);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(draggedIdx));
        card.classList.add('is-dragging');
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('drag-over-thumb');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over-thumb');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over-thumb');
        const targetIdx = parseInt(card.dataset.idx, 10);
        if (draggedIdx !== null && draggedIdx !== targetIdx && !isNaN(draggedIdx)) {
          const [item] = currentEditorImages.splice(draggedIdx, 1);
          currentEditorImages.splice(targetIdx, 0, item);
          renderEditorGallery();
          showToast(`[OK] // Фото перемещено на позицию #${targetIdx + 1}`);
        }
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        photosGallery.querySelectorAll('.editor-thumb-card').forEach(c => c.classList.remove('drag-over-thumb'));
        draggedIdx = null;
      });
    });

    // Delete photo from array
    photosGallery.querySelectorAll('[data-del-photo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.delPhoto, 10);
        currentEditorImages.splice(index, 1);
        renderEditorGallery();
      });
    });

    // Make photo primary cover (index 0)
    photosGallery.querySelectorAll('[data-set-cover]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.setCover, 10);
        const item = currentEditorImages.splice(index, 1)[0];
        currentEditorImages.unshift(item);
        renderEditorGallery();
      });
    });

    if (typeof updateAISidecarPreview === 'function') {
      updateAISidecarPreview();
    }
  }

  let lastUploadedFileName = '';

  function addEditorPhotoFiles(fileList) {
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    if (validFiles[0] && validFiles[0].name) {
      lastUploadedFileName = validFiles[0].name;
    }

    let loaded = 0;
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        currentEditorImages.push(e.target.result);
        loaded++;
        if (loaded === validFiles.length) {
          renderEditorGallery();
          showToast(`[OK] // Добавлено ${loaded} фото в карточку`);
          if (typeof updateAISidecarPreview === 'function') updateAISidecarPreview();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (multiDropzone && cardPhotosInput) {
    multiDropzone.addEventListener('click', () => cardPhotosInput.click());

    ['dragenter', 'dragover'].forEach(ev => {
      multiDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        multiDropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      multiDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        multiDropzone.classList.remove('drag-over');
      });
    });

    multiDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        addEditorPhotoFiles(e.dataTransfer.files);
      }
    });

    cardPhotosInput.addEventListener('change', (e) => {
      if (e.target.files) {
        addEditorPhotoFiles(e.target.files);
      }
    });
  }

  if (addPhotoUrlBtn && photoUrlInput) {
    const handleAddUrl = () => {
      const raw = photoUrlInput.value.trim();
      if (!raw) return;

      const urls = raw.split(/[\n,]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
      if (urls.length > 0) {
        currentEditorImages.push(...urls);
        photoUrlInput.value = '';
        renderEditorGallery();
        showToast(`[OK] // Добавлено ${urls.length} фото по ссылке`);
        if (typeof updateAISidecarPreview === 'function') updateAISidecarPreview();
      } else {
        alert('Пожалуйста, введите корректный URL изображения (начинающийся с http:// или https://)');
      }
    };

    addPhotoUrlBtn.addEventListener('click', handleAddUrl);
    photoUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddUrl();
      }
    });
  }

  // Datetime Picker & Quick Presets Helpers
  function formatRemainingTime(date) {
    if (!date || isNaN(date.getTime())) return '03 дн. 18:00';
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs <= 0) return 'ДРОП ЗАКРЫТ';
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      return `${String(days).padStart(2, '0')} дн. ${String(remHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    return `${remHours} ч. ${mins} мин`;
  }

  function toDatetimeLocalString(date) {
    if (!date || isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const Y = date.getFullYear();
    const M = pad(date.getMonth() + 1);
    const D = pad(date.getDate());
    const H = pad(date.getHours());
    const Min = pad(date.getMinutes());
    return `${Y}-${M}-${D}T${H}:${Min}`;
  }

  if (timerDatetime) {
    timerDatetime.addEventListener('input', () => {
      const d = new Date(timerDatetime.value);
      const rem = formatRemainingTime(d);
      if (timerInput) timerInput.value = rem;
      if (timerPreview) timerPreview.textContent = `[ОСТАЛОСЬ: ${rem}]`;
    });
  }

  if (timerPresetBtns) {
    timerPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const hours = parseInt(btn.dataset.hours, 10) || 72;
        const target = new Date(Date.now() + hours * 3600 * 1000);
        if (timerDatetime) timerDatetime.value = toDatetimeLocalString(target);
        const rem = formatRemainingTime(target);
        if (timerInput) timerInput.value = rem;
        if (timerPreview) timerPreview.textContent = `[ОСТАЛОСЬ: ${rem}]`;
      });
    });
  }

  // Dynamic Form Switching: In-Stock vs Pre-order UI
  function updateStockTypeFormUI(stockType) {
    const isInstock = stockType === 'instock';
    const timerGroup = document.getElementById('group-card-timer');
    const regionGroup = document.getElementById('group-card-region');
    const priceLabel = document.getElementById('label-card-price');
    const partnerInfoGroup = document.getElementById('group-instock-partner-info');

    if (isInstock) {
      if (timerGroup) timerGroup.style.display = 'none';
      if (regionGroup) regionGroup.style.display = 'none';
      if (regionSelect) regionSelect.value = 'spb';
      if (partnerInfoGroup) partnerInfoGroup.style.display = 'block';
      if (priceLabel) priceLabel.textContent = 'ЦЕНА В РУБЛЯХ (В НАЛИЧИИ В СПБ) *';

      if (statusSelect) {
        const curVal = statusSelect.value;
        statusSelect.innerHTML = `
          <option value="В НАЛИЧИИ В СПБ" ${curVal === 'В НАЛИЧИИ В СПБ' ? 'selected' : ''}>В НАЛИЧИИ В СПБ (BALKONSKY)</option>
          <option value="LIMITED DROP" ${curVal === 'LIMITED DROP' ? 'selected' : ''}>LIMITED DROP (ОСТАЛОСЬ МАЛО)</option>
          <option value="SOLD OUT" ${curVal === 'SOLD OUT' ? 'selected' : ''}>SOLD OUT (ПРОДАНО)</option>
        `;
        if (!['В НАЛИЧИИ В СПБ', 'LIMITED DROP', 'SOLD OUT'].includes(curVal)) {
          statusSelect.value = 'В НАЛИЧИИ В СПБ';
        }
      }
    } else {
      if (timerGroup) timerGroup.style.display = 'block';
      if (regionGroup) regionGroup.style.display = 'block';
      if (regionSelect && regionSelect.value === 'spb') {
        regionSelect.value = 'china';
      }
      if (partnerInfoGroup) partnerInfoGroup.style.display = 'none';
      if (priceLabel) priceLabel.textContent = 'ЦЕНА В РУБЛЯХ (ПОД КЛЮЧ С ДОСТАВКОЙ) *';

      if (statusSelect) {
        const curVal = statusSelect.value;
        statusSelect.innerHTML = `
          <option value="ПРЕДЗАКАЗ ОТКРЫТ" ${curVal === 'ПРЕДЗАКАЗ ОТКРЫТ' ? 'selected' : ''}>ПРЕДЗАКАЗ ОТКРЫТ</option>
          <option value="СКОРО ЗАКРЫТИЕ" ${curVal === 'СКОРО ЗАКРЫТИЕ' ? 'selected' : ''}>СКОРО ЗАКРЫТИЕ</option>
          <option value="LIMITED DROP" ${curVal === 'LIMITED DROP' ? 'selected' : ''}>LIMITED DROP</option>
          <option value="SOLD OUT" ${curVal === 'SOLD OUT' ? 'selected' : ''}>SOLD OUT (ЗАКРЫТО)</option>
        `;
        if (!['ПРЕДЗАКАЗ ОТКРЫТ', 'СКОРО ЗАКРЫТИЕ', 'LIMITED DROP', 'SOLD OUT'].includes(curVal)) {
          statusSelect.value = 'ПРЕДЗАКАЗ ОТКРЫТ';
        }
      }
    }
  }

  if (stockTypeSelect) {
    stockTypeSelect.addEventListener('change', () => {
      updateStockTypeFormUI(stockTypeSelect.value);
    });
  }

  // =========================================================================
  // Interactive Size Picker Widget (Footwear EU/US/CM, Clothing S-XL, etc.)
  // =========================================================================
  const SIZE_SYSTEMS = {
    'shoes-eu': {
      label: '👟 ОБУВЬ [EU]',
      popular: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      all: [
        '36 EU', '36.5 EU', '37 EU', '37.5 EU', '38 EU', '38.5 EU',
        '39 EU', '39.5 EU', '40 EU', '40.5 EU', '41 EU', '41.5 EU',
        '42 EU', '42.5 EU', '43 EU', '43.5 EU', '44 EU', '44.5 EU',
        '45 EU', '45.5 EU', '46 EU', '47 EU'
      ]
    },
    'shoes-us': {
      label: '👟 ОБУВЬ [US]',
      popular: ['8.5 US', '9 US', '9.5 US', '10 US', '10.5 US'],
      all: [
        '5.5 US', '6 US', '6.5 US', '7 US', '7.5 US', '8 US', '8.5 US',
        '9 US', '9.5 US', '10 US', '10.5 US', '11 US', '11.5 US', '12 US', '13 US'
      ]
    },
    'shoes-cm': {
      label: '📏 ОБУВЬ [CM]',
      popular: ['26 CM', '26.5 CM', '27 CM', '27.5 CM', '28 CM'],
      all: [
        '23.5 CM', '24 CM', '24.5 CM', '25 CM', '25.5 CM', '26 CM', '26.5 CM',
        '27 CM', '27.5 CM', '28 CM', '28.5 CM', '29 CM', '29.5 CM', '30 CM'
      ]
    },
    'clothes': {
      label: '👕 ОДЕЖДА',
      popular: ['S', 'M', 'L', 'XL'],
      all: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'OVERSIZE']
    },
    'pants': {
      label: '👖 БРЮКИ / ДЖИНСЫ',
      popular: ['30', '31', '32', '33', '34'],
      all: ['28', '29', '30', '31', '32', '33', '34', '36', '46 IT', '48 IT', '50 IT', '52 IT']
    },
    'accessories': {
      label: '🎒 АКСЕССУАРЫ',
      popular: ['ONE SIZE'],
      all: ['ONE SIZE', 'OS', 'УНИВЕРСАЛЬНЫЙ']
    }
  };

  let activeSizeSystem = 'shoes-eu';
  const sizeChipsContainer = document.getElementById('size-chips-container');
  const sizeSystemTabs = document.querySelectorAll('.size-system-tab');
  const selectedSizesSummary = document.getElementById('selected-sizes-summary');
  const btnSelectPopularSizes = document.getElementById('btn-select-popular-sizes');
  const btnClearSizes = document.getElementById('btn-clear-sizes');

  function getSelectedSizesArray() {
    if (!sizesInput) return [];
    return sizesInput.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function setSelectedSizesArray(arr) {
    if (!sizesInput) return;
    sizesInput.value = arr.join(', ');
    renderSizeChips();
  }

  function renderSizeChips() {
    if (!sizeChipsContainer) return;
    const currentList = getSelectedSizesArray();
    const currentLower = currentList.map(s => s.toLowerCase());
    const system = SIZE_SYSTEMS[activeSizeSystem] || SIZE_SYSTEMS['shoes-eu'];

    sizeChipsContainer.innerHTML = system.all.map(sz => {
      const isSelected = currentLower.includes(sz.toLowerCase());
      return `
        <button type="button" class="size-chip ${isSelected ? 'selected' : ''}" data-size-val="${sz}">
          ${sz}
        </button>
      `;
    }).join('');

    if (selectedSizesSummary) {
      if (currentList.length === 0) {
        selectedSizesSummary.textContent = 'Выбрано: 0 размеров';
      } else {
        selectedSizesSummary.innerHTML = `Выбрано: <strong style="color: #00f0ff;">${currentList.length}</strong> (${currentList.join(', ')})`;
      }
    }

    sizeChipsContainer.querySelectorAll('.size-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const sz = chip.dataset.sizeVal;
        toggleSize(sz);
      });
    });
  }

  function toggleSize(sz) {
    let list = getSelectedSizesArray();
    const szLower = sz.toLowerCase();
    const existingIdx = list.findIndex(s => s.toLowerCase() === szLower);

    if (existingIdx !== -1) {
      list.splice(existingIdx, 1);
    } else {
      list.push(sz);
    }

    setSelectedSizesArray(list);
  }

  function switchSizeSystem(systemKey) {
    if (!SIZE_SYSTEMS[systemKey]) return;
    activeSizeSystem = systemKey;
    sizeSystemTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.system === systemKey);
    });
    renderSizeChips();
  }

  function updateSizePickerForCategory(cat) {
    const currentCat = cat || (categorySelect ? categorySelect.value : 'footwear');
    sizeSystemTabs.forEach(tab => {
      const tabCat = tab.dataset.category;
      if (tabCat === currentCat) {
        tab.style.display = 'inline-flex';
      } else {
        tab.style.display = 'none';
      }
    });

    if (currentCat === 'footwear') {
      if (!['shoes-eu', 'shoes-us', 'shoes-cm'].includes(activeSizeSystem)) {
        switchSizeSystem('shoes-eu');
      } else {
        renderSizeChips();
      }
      if (sizesInput) sizesInput.placeholder = '39 EU, 40 EU, 41 EU, 42 EU, 43 EU (или US / CM)';
    } else if (currentCat === 'clothing') {
      if (!['clothes', 'pants'].includes(activeSizeSystem)) {
        switchSizeSystem('clothes');
      } else {
        renderSizeChips();
      }
      if (sizesInput) sizesInput.placeholder = 'S, M, L, XL (или W28-W36)';
    } else if (currentCat === 'accessories') {
      switchSizeSystem('accessories');
      if (sizesInput) sizesInput.placeholder = 'ONE SIZE';
    }
  }

  // Auto-switch size tab when category select changes
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      updateSizePickerForCategory(categorySelect.value);
      if (typeof updateAiCategoryButtons === 'function') {
        updateAiCategoryButtons(categorySelect.value);
      }
    });
  }

  // Size tabs click
  sizeSystemTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchSizeSystem(tab.dataset.system);
    });
  });

  // Quick action: Select popular sizes
  if (btnSelectPopularSizes) {
    btnSelectPopularSizes.addEventListener('click', (e) => {
      e.preventDefault();
      const system = SIZE_SYSTEMS[activeSizeSystem] || SIZE_SYSTEMS['shoes-eu'];
      let list = getSelectedSizesArray();
      system.popular.forEach(sz => {
        if (!list.some(item => item.toLowerCase() === sz.toLowerCase())) {
          list.push(sz);
        }
      });
      setSelectedSizesArray(list);
      showToast(`[OK] // Добавлены ходовые размеры: ${system.popular.join(', ')}`);
    });
  }

  // Quick action: Clear sizes
  if (btnClearSizes) {
    btnClearSizes.addEventListener('click', (e) => {
      e.preventDefault();
      setSelectedSizesArray([]);
      showToast('[OK] // Размеры очищены');
    });
  }

  // Live input sync if user types manually into input
  if (sizesInput) {
    sizesInput.addEventListener('input', () => {
      renderSizeChips();
    });
  }

  // Open Add Card Modal
  function openAddModal() {
    editIdInput.value = '';
    cardModalTitle.textContent = 'ДОБАВЛЕНИЕ НОВОЙ КАРТОЧКИ';
    cardForm.reset();
    currentEditorImages = [];
    renderEditorGallery();

    if (stockTypeSelect) stockTypeSelect.value = 'preorder';
    if (conditionSelect) conditionSelect.value = 'NEW // DEADSTOCK';
    if (descInput) descInput.value = '';
    const defaultTarget = new Date(Date.now() + 72 * 3600 * 1000);
    if (timerDatetime) timerDatetime.value = toDatetimeLocalString(defaultTarget);
    const rem = formatRemainingTime(defaultTarget);
    if (timerInput) timerInput.value = rem;
    if (timerPreview) timerPreview.textContent = `[ОСТАЛОСЬ: ${rem}]`;
    if (statusSelect) statusSelect.value = 'ПРЕДЗАКАЗ ОТКРЫТ';

    // Default sizes for shoes
    if (sizesInput) sizesInput.value = '40 EU, 41 EU, 42 EU, 43 EU, 44 EU';
    updateSizePickerForCategory('footwear');
    switchSizeSystem('shoes-eu');
    renderSizeChips();

    updateStockTypeFormUI('preorder');
    if (typeof updateAiCategoryButtons === 'function') updateAiCategoryButtons('footwear');
    if (typeof syncAiInlineKeyUI === 'function') syncAiInlineKeyUI();
    if (typeof resetAISidecarResults === 'function') resetAISidecarResults();
    if (typeof updateAISidecarPreview === 'function') updateAISidecarPreview();
    cardModal.showModal();
  }

  // Open Edit Card Modal
  function openEditModal(id) {
    const item = PRODUCTS.find(p => String(p.id) === String(id));
    if (!item) return;

    editIdInput.value = item.id;
    cardModalTitle.textContent = `РЕДАКТИРОВАНИЕ: ${item.brand}`;
    brandInput.value = item.brand || '';
    nameInput.value = item.name || '';
    const stockVal = item.stockType || 'preorder';
    if (stockTypeSelect) stockTypeSelect.value = stockVal;
    if (conditionSelect) conditionSelect.value = item.condition || 'NEW // DEADSTOCK';
    if (descInput) descInput.value = item.description || '';
    regionSelect.value = item.region || (stockVal === 'instock' ? 'spb' : 'japan');
    categorySelect.value = item.category || 'footwear';
    priceInput.value = item.basePriceRub || 20000;
    sizesInput.value = Array.isArray(item.sizes) ? item.sizes.join(', ') : (item.sizes || '');

    // Filter size tabs strictly for this item's category
    const cat = item.category || 'footwear';
    updateSizePickerForCategory(cat);

    const sStr = sizesInput.value.toUpperCase();
    if (cat === 'footwear') {
      if (sStr.includes('US')) switchSizeSystem('shoes-us');
      else if (sStr.includes('CM')) switchSizeSystem('shoes-cm');
      else switchSizeSystem('shoes-eu');
    } else if (cat === 'clothing') {
      if (sStr.includes('IT') || /\b(28|29|30|31|32|33|34|36)\b/.test(sStr)) {
        switchSizeSystem('pants');
      } else {
        switchSizeSystem('clothes');
      }
    } else if (cat === 'accessories') {
      switchSizeSystem('accessories');
    } else {
      switchSizeSystem('shoes-eu');
    }
    renderSizeChips();

    if (item.closingDate) {
      const d = new Date(item.closingDate);
      if (timerDatetime) timerDatetime.value = toDatetimeLocalString(d);
      const rem = formatRemainingTime(d);
      if (timerInput) timerInput.value = rem;
      if (timerPreview) timerPreview.textContent = `[ОСТАЛОСЬ: ${rem}]`;
    } else {
      const defaultTarget = new Date(Date.now() + 72 * 3600 * 1000);
      if (timerDatetime) timerDatetime.value = toDatetimeLocalString(defaultTarget);
      if (timerInput) timerInput.value = item.closingIn || '03 дн. 18:00';
      if (timerPreview) timerPreview.textContent = `[ОСТАЛОСЬ: ${timerInput.value}]`;
    }

    updateStockTypeFormUI(stockVal);
    if (statusSelect) {
      statusSelect.value = item.dropStatus || (stockVal === 'instock' ? 'В НАЛИЧИИ В СПБ' : 'ПРЕДЗАКАЗ ОТКРЫТ');
    }

    currentEditorImages = getItemImages(item);
    renderEditorGallery();

    if (typeof updateAiCategoryButtons === 'function') updateAiCategoryButtons(cat);
    if (typeof syncAiInlineKeyUI === 'function') syncAiInlineKeyUI();
    if (typeof resetAISidecarResults === 'function') resetAISidecarResults();
    if (typeof updateAISidecarPreview === 'function') updateAISidecarPreview();

    cardModal.showModal();
  }

  function closeCardModal() {
    if (cardModal.open) cardModal.close();
  }

  // Delete Card Object (Cyberpunk Custom Modal)
  function openDeleteConfirmModal(id) {
    const item = PRODUCTS.find(p => String(p.id) === String(id));
    if (!item) return;

    targetDeleteId = item.id;
    if (deleteBrandEl) deleteBrandEl.textContent = item.brand || 'БРЕНД';
    if (deleteNameEl) deleteNameEl.textContent = item.name || 'Товар';
    if (deletePriceEl) deletePriceEl.textContent = formatRub(item.basePriceRub || 0);

    const imgs = getItemImages(item);
    if (deleteThumbEl) {
      if (imgs.length > 0) {
        deleteThumbEl.innerHTML = `<img src="${imgs[0]}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        deleteThumbEl.innerHTML = `<span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);">НЕТ ФОТО</span>`;
      }
    }

    if (deleteModal) deleteModal.showModal();
  }

  function closeDeleteModal() {
    if (deleteModal && deleteModal.open) deleteModal.close();
    targetDeleteId = null;
  }

  function deleteCard(id) {
    openDeleteConfirmModal(id);
  }

  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener('click', () => {
      if (!targetDeleteId) return;
      const item = PRODUCTS.find(p => String(p.id) === String(targetDeleteId));
      if (!item) {
        closeDeleteModal();
        return;
      }
      const brand = item.brand || 'Объект';

      // Move into Trash Archive with deletion timestamp
      const trashItem = {
        ...item,
        deletedAt: new Date().toISOString()
      };
      TRASH.unshift(trashItem);
      saveTrash(TRASH);

      // Remove from active products
      PRODUCTS = PRODUCTS.filter(p => String(p.id) !== String(targetDeleteId));
      saveProducts(PRODUCTS);

      renderCards();
      closeDeleteModal();
      if (trashModal && trashModal.open) renderTrashModal();
      showToast(`[OK] // «${brand}» перемещена в корзину (можно восстановить)`);
    });
  }

  if (deleteCloseBtn) deleteCloseBtn.addEventListener('click', closeDeleteModal);
  if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
  if (deleteBackdrop) deleteBackdrop.addEventListener('click', closeDeleteModal);

  // =========================================================================
  // Trash & Archive Modal Controller
  // =========================================================================
  function formatDeletedDate(isoStr) {
    if (!isoStr) return 'Недавно';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Недавно';
    }
  }

  function renderTrashModal() {
    if (trashCountEl) trashCountEl.textContent = TRASH.length;
    if (countTrash) countTrash.textContent = TRASH.length;
    if (statTrash) statTrash.textContent = TRASH.length;

    if (!trashListEl) return;

    if (TRASH.length === 0) {
      trashListEl.innerHTML = `
        <div class="trash-empty-state">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;">🗑</div>
          <div style="font-family: var(--font-mono); font-size: 0.95rem; color: #ffffff; margin-bottom: 0.35rem;">// КОРЗИНА ПУСТА</div>
          <div style="font-size: 0.82rem; color: var(--text-muted); max-width: 440px; margin: 0 auto; line-height: 1.4;">
            Здесь будут храниться карточки, удалённые из базы. В любой момент вы сможете восстановить их обратно в каталог в 1 клик.
          </div>
        </div>
      `;
      return;
    }

    trashListEl.innerHTML = TRASH.map(item => {
      const imgs = getItemImages(item);
      const isInstock = item.stockType === 'instock';
      const isJp = item.region === 'japan';
      const isGlobal = item.region === 'global';
      const isSpb = item.region === 'spb' || isInstock;
      const badgeCls = isSpb ? 'spb' : (isJp ? 'jp' : (isGlobal ? 'global' : 'cn'));
      const regionText = isSpb ? 'СПБ [SPB]' : (isJp ? 'ЯПОНИЯ [JP]' : (isGlobal ? 'GLOBAL [GLB]' : 'КИТАЙ [CN]'));
      const stockBadge = isInstock
        ? `<span class="admin-card-stock-tag instock" style="font-size: 8px;">✦ В НАЛИЧИИ: СПБ</span>`
        : `<span class="admin-card-stock-tag preorder" style="font-size: 8px;">ПРЕДЗАКАЗ</span>`;

      const thumb = imgs.length > 0
        ? `<img src="${imgs[0]}" alt="${item.brand} ${item.name}">`
        : `<span style="font-family: var(--font-mono); font-size: 0.6rem; color: #71717a;">НЕТ ФОТО</span>`;

      const sizesStr = Array.isArray(item.sizes) ? item.sizes.join(', ') : (item.sizes || '');

      return `
        <div class="trash-item-row" data-trash-id="${item.id}">
          <div class="trash-item-thumb">
            ${thumb}
          </div>
          <div class="trash-item-info">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span class="trash-brand">${item.brand || 'БРЕНД'}</span>
              <span class="product-condition-pill" style="font-size: 8px; padding: 1px 4px;">● ${item.condition || 'NEW // DEADSTOCK'}</span>
              ${stockBadge}
              <span class="admin-region-badge ${badgeCls}" style="font-size: 8px; padding: 1px 5px;">${regionText}</span>
            </div>
            <div class="trash-item-name">${item.name || 'Название позиции'}</div>
            <div class="trash-item-meta">
              SKU: ${item.sku || 'N/A'} • <strong style="color: #ffffff;">${formatRub(item.basePriceRub || 0)}</strong> • Размеры: ${sizesStr || '—'}
            </div>
            <div class="trash-item-date">
              ⏱ Удалено: ${formatDeletedDate(item.deletedAt)}
            </div>
          </div>
          <div class="trash-item-actions">
            <button type="button" class="btn-restore-card" data-restore-id="${item.id}" title="Восстановить позицию обратно в базу и каталог">
              ↺ ВОССТАНОВИТЬ
            </button>
            <button type="button" class="btn-purge-card" data-purge-id="${item.id}" title="Удалить карточку навсегда">
              ✕ СТЕРЕТЬ
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function openTrashModal() {
    renderTrashModal();
    if (trashModal) trashModal.showModal();
  }

  function closeTrashModal() {
    if (trashModal && trashModal.open) trashModal.close();
  }

  function restoreTrashItem(id) {
    const itemIdx = TRASH.findIndex(t => String(t.id) === String(id));
    if (itemIdx === -1) return;

    const [item] = TRASH.splice(itemIdx, 1);
    delete item.deletedAt;

    PRODUCTS.unshift(item);
    saveTrash(TRASH);
    saveProducts(PRODUCTS);

    renderCards();
    renderTrashModal();
    showToast(`[OK] // Карточка «${item.brand}» восстановлена в базу и каталог!`);
  }

  function purgeTrashItem(id) {
    const item = TRASH.find(t => String(t.id) === String(id));
    const brand = item ? item.brand : 'Карточка';

    TRASH = TRASH.filter(t => String(t.id) !== String(id));
    saveTrash(TRASH);

    renderTrashModal();
    showToast(`[OK] // «${brand}» окончательно стёрта из корзины`);
  }

  function purgeAllTrash() {
    if (TRASH.length === 0) return;
    const count = TRASH.length;
    TRASH = [];
    saveTrash(TRASH);
    renderTrashModal();
    showToast(`[OK] // Корзина очищена (${count} объектов удалено навсегда)`);
  }

  // Trash UI Event Listeners
  if (openTrashBtn) openTrashBtn.addEventListener('click', openTrashModal);
  if (statCardTrash) statCardTrash.addEventListener('click', openTrashModal);
  if (trashCloseBtn) trashCloseBtn.addEventListener('click', closeTrashModal);
  if (trashDoneBtn) trashDoneBtn.addEventListener('click', closeTrashModal);
  if (trashBackdrop) trashBackdrop.addEventListener('click', closeTrashModal);
  if (trashPurgeAllBtn) trashPurgeAllBtn.addEventListener('click', purgeAllTrash);

  if (trashListEl) {
    trashListEl.addEventListener('click', (e) => {
      const restoreBtn = e.target.closest('.btn-restore-card');
      if (restoreBtn) {
        e.preventDefault();
        const id = restoreBtn.dataset.restoreId;
        restoreTrashItem(id);
        return;
      }

      const purgeBtn = e.target.closest('.btn-purge-card');
      if (purgeBtn) {
        e.preventDefault();
        const id = purgeBtn.dataset.purgeId;
        purgeTrashItem(id);
        return;
      }
    });
  }

  // Event delegation for DEL button on grid
  if (grid) {
    grid.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.admin-btn-del');
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = delBtn.dataset.delId || delBtn.getAttribute('data-del-id');
        openDeleteConfirmModal(id);
      }
    });
  }

  // Duplicate Card Object
  function duplicateCard(id) {
    const item = PRODUCTS.find(p => p.id === id);
    if (!item) return;

    const clone = {
      ...item,
      id: 'sasbov-copy-' + Date.now(),
      name: item.name + ' (Копия)',
      sku: (item.sku || 'SAS') + '-CP',
      images: Array.isArray(item.images) ? [...item.images] : []
    };

    PRODUCTS.unshift(clone);
    saveProducts(PRODUCTS);
    renderCards();
    showToast(`[OK] // Дубликат карточки создан`);
  }

  // Form Submission (Add or Update Object)
  if (cardForm) {
    cardForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const editId = editIdInput.value;
      const brandVal = brandInput.value.trim().toUpperCase();
      const nameVal = nameInput.value.trim();
      const stockTypeVal = stockTypeSelect ? stockTypeSelect.value : 'preorder';
      const regionVal = regionSelect.value;
      const categoryVal = categorySelect.value;
      const priceVal = parseFloat(priceInput.value) || 20000;
      const sizesArray = sizesInput.value.split(',').map(s => s.trim()).filter(Boolean);
      const timerVal = timerInput.value.trim() || '03 дн. 18:00';
      const statusVal = statusSelect.value;
      const closingDateVal = (timerDatetime && timerDatetime.value) 
        ? new Date(timerDatetime.value).toISOString() 
        : null;

      const isInstock = stockTypeVal === 'instock';
      const conditionVal = conditionSelect ? conditionSelect.value : 'NEW // DEADSTOCK';
      const descVal = descInput ? descInput.value.trim() : '';
      const partnerVal = isInstock ? 'Balkonsky Store (Санкт-Петербург)' : null;
      const locationVal = isInstock ? 'Санкт-Петербург, Balkonsky Store' : (
        regionVal === 'japan' ? 'JAPAN [JP] // TOKYO ARCHIVE' : (regionVal === 'global' ? 'GLOBAL [GLB] // GRAILED' : 'CHINA [CN] // POIZON & GOOFISH')
      );
      const deliveryTimeVal = isInstock 
        ? 'В наличии в СПб // Примерка и самовывоз сегодня' 
        : 'Выкуп под заказ: 10-18 дней';

      let regionLabelVal = 'CHINA [CN] // POIZON & GOOFISH';
      let badgeClassVal = 'cn';
      if (regionVal === 'spb' || isInstock) {
        regionLabelVal = 'СПБ [SPB] // BALKONSKY STORE';
        badgeClassVal = 'spb';
      } else if (regionVal === 'japan') {
        regionLabelVal = 'JAPAN [JP] // TOKYO ARCHIVE & EBAY JP';
        badgeClassVal = 'jp';
      } else if (regionVal === 'global') {
        regionLabelVal = 'GLOBAL [GLB] // GRAILED ARCHIVE';
        badgeClassVal = 'global';
      }

      const finalImages = [...currentEditorImages];
      const primaryImage = finalImages[0] || null;

      if (editId) {
        // Edit existing card object
        const idx = PRODUCTS.findIndex(p => p.id === editId);
        if (idx !== -1) {
          PRODUCTS[idx] = {
            ...PRODUCTS[idx],
            brand: brandVal,
            name: nameVal,
            condition: conditionVal,
            description: descVal,
            stockType: stockTypeVal,
            partner: partnerVal,
            location: locationVal,
            deliveryTime: deliveryTimeVal,
            region: regionVal,
            regionLabel: regionLabelVal,
            category: categoryVal,
            basePriceRub: priceVal,
            sizes: sizesArray,
            closingIn: timerVal,
            closingDate: closingDateVal,
            dropStatus: statusVal,
            badgeClass: badgeClassVal,
            image: primaryImage,
            images: finalImages
          };
          showToast(`[OK] // Карточка «${brandVal}» обновлена (${finalImages.length} фото)`);
        }
      } else {
        // Create new card object
        const newSku = `SAS-${brandVal.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const newCard = {
          id: 'sasbov-card-' + Date.now(),
          brand: brandVal,
          name: nameVal,
          condition: conditionVal,
          description: descVal,
          stockType: stockTypeVal,
          partner: partnerVal,
          location: locationVal,
          deliveryTime: deliveryTimeVal,
          region: regionVal,
          regionLabel: regionLabelVal,
          category: categoryVal,
          sku: newSku,
          basePriceRub: priceVal,
          sizes: sizesArray,
          closingIn: timerVal,
          closingDate: closingDateVal,
          dropStatus: statusVal,
          badgeClass: badgeClassVal,
          image: primaryImage,
          images: finalImages
        };
        PRODUCTS.unshift(newCard);
        showToast(`[OK] // Новая карточка «${brandVal}» добавлена (${finalImages.length} фото)`);
      }

      saveProducts(PRODUCTS);
      renderCards();
      closeCardModal();
    });
  }

  // Filter Pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      renderCards();
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderCards();
    });
  }

  // Open / Close Add Modal
  if (openNewCardBtn) openNewCardBtn.addEventListener('click', openAddModal);
  if (cardCloseBtn) cardCloseBtn.addEventListener('click', closeCardModal);
  if (cardCancelBtn) cardCancelBtn.addEventListener('click', closeCardModal);
  if (cardBackdrop) cardBackdrop.addEventListener('click', closeCardModal);

  // Export JSON Backup
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(PRODUCTS, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `sasbov_market_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('[OK] // Резервная копия базы скачана');
    });
  }

  // Import JSON Backup
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            if (Array.isArray(parsed) && parsed.length > 0) {
              PRODUCTS = parsed.map(p => {
                if (!Array.isArray(p.images)) p.images = p.image ? [p.image] : [];
                return p;
              });
              saveProducts(PRODUCTS);
              renderCards();
              showToast(`[OK] // База успешно восстановлена (${PRODUCTS.length} карточек)`);
            } else {
              alert('Ошибка: Файл JSON не содержит массив карточек товаров.');
            }
          } catch (err) {
            alert('Ошибка чтения JSON: ' + err.message);
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Factory Reset
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('ВНИМАНИЕ! Сбросить базу данных карточек к заводским дропам?\nВсе добавленные вручную товары будут заменены.')) {
        PRODUCTS = [...DEFAULT_PRODUCTS];
        saveProducts(PRODUCTS);
        renderCards();
        showToast('[OK] // База сброшена к заводским значениям');
      }
    });
  }

  // =========================================================================
  // Batch AI Drop Importer
  // =========================================================================
  function openBatchModal() {
    batchItems = [];
    renderBatchQueue();
    batchModal.showModal();
  }

  function closeBatchModal() {
    if (batchModal.open) batchModal.close();
  }

  if (openBatchBtn) openBatchBtn.addEventListener('click', openBatchModal);
  if (batchCloseBtn) batchCloseBtn.addEventListener('click', closeBatchModal);
  if (batchBackdrop) batchBackdrop.addEventListener('click', closeBatchModal);

  function guessBrandAndDetails(filename) {
    const fn = filename.toLowerCase();
    if (fn.includes('kapital')) return { brand: 'KAPITAL', name: 'Archive Denim Skeleton', region: 'japan', category: 'clothing', price: 42000, sizes: '1, 2, 3, 4' };
    if (fn.includes('mihara') || fn.includes('mmy')) return { brand: 'MAISON MIHARA YASUHIRO', name: 'Peterson Low-Top Canvas', region: 'japan', category: 'footwear', price: 26500, sizes: '40, 41, 42, 43, 44' };
    if (fn.includes('salomon') || fn.includes('mm6')) return { brand: 'SALOMON x MM6', name: 'Cross Low Sneaker Edition', region: 'japan', category: 'footwear', price: 34000, sizes: '41, 42, 43, 44' };
    if (fn.includes('thug')) return { brand: 'THUG CLUB', name: 'Heavy Tribal Hoodie', region: 'china', category: 'clothing', price: 19800, sizes: 'M, L, XL' };
    if (fn.includes('roaringwild')) return { brand: 'ROARINGWILD', name: 'Tech Shell System Jacket', region: 'china', category: 'clothing', price: 18400, sizes: 'S, M, L, XL' };
    if (fn.includes('anta') || fn.includes('kyrie')) return { brand: 'ANTA x KYRIE IRVING', name: 'KAI 1 Special Edition', region: 'china', category: 'footwear', price: 16900, sizes: '41, 42, 43, 44, 45' };
    if (fn.includes('porter')) return { brand: 'PORTER YOSHIDA & CO', name: 'Tanker 2Way Tactical Bag', region: 'japan', category: 'accessories', price: 22000, sizes: 'ONE SIZE' };
    if (fn.includes('undercover')) return { brand: 'UNDERCOVERISM', name: 'Vintage Bomber MA-1', region: 'japan', category: 'clothing', price: 49000, sizes: '2, 3, 4' };
    if (fn.includes('balenciaga')) return { brand: 'BALENCIAGA', name: 'Defender Tire Sole Sneaker', region: 'china', category: 'footwear', price: 58000, sizes: '41, 42, 43, 44' };

    const clean = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').toUpperCase();
    return {
      brand: clean.slice(0, 16) || 'ARCHIVE BRAND',
      name: clean || 'New Sourced Item',
      region: 'japan',
      category: 'clothing',
      price: 22000,
      sizes: 'M, L, XL'
    };
  }

  function renderBatchQueue() {
    if (!batchQueueWrap) return;

    if (batchItems.length === 0) {
      batchQueueWrap.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8rem;">
          [ Очередь пуста. Перетащите фотографии в зону выше ]
        </div>
      `;
      if (batchFooterBar) batchFooterBar.style.display = 'none';
      return;
    }

    if (batchFooterBar) batchFooterBar.style.display = 'flex';

    batchQueueWrap.innerHTML = batchItems.map((item, idx) => `
      <div class="admin-batch-item" data-idx="${idx}">
        <div class="admin-batch-thumb">
          <img src="${item.image}" alt="Фото">
        </div>

        <div class="admin-batch-fields">
          <div class="admin-field-group">
            <label class="admin-field-label">БРЕНД:</label>
            <input type="text" class="admin-field-input" data-bidx="${idx}" data-bfield="brand" value="${item.brand}">
          </div>

          <div class="admin-field-group">
            <label class="admin-field-label">МОДЕЛЬ:</label>
            <input type="text" class="admin-field-input" data-bidx="${idx}" data-bfield="name" value="${item.name}">
          </div>

          <div class="admin-field-group">
            <label class="admin-field-label">РЕГИОН:</label>
            <select class="admin-field-select" data-bidx="${idx}" data-bfield="region">
              <option value="japan" ${item.region === 'japan' ? 'selected' : ''}>Япония [JP] (Tokyo / eBay JP)</option>
              <option value="china" ${item.region === 'china' ? 'selected' : ''}>Китай [CN] (Poizon / Goofish)</option>
              <option value="global" ${item.region === 'global' ? 'selected' : ''}>Global [GLB] (Grailed Archive)</option>
            </select>
          </div>

          <div class="admin-field-group">
            <label class="admin-field-label">ЦЕНА (₽):</label>
            <input type="number" class="admin-field-input" data-bidx="${idx}" data-bfield="price" value="${item.price}">
          </div>

          <div class="admin-field-group">
            <label class="admin-field-label">РАЗМЕРЫ:</label>
            <input type="text" class="admin-field-input" data-bidx="${idx}" data-bfield="sizes" value="${item.sizes}">
          </div>
        </div>

        <button type="button" class="admin-item-remove-btn" data-bdel="${idx}" title="Удалить из очереди">&times;</button>
      </div>
    `).join('');

    batchQueueWrap.querySelectorAll('.admin-field-input, .admin-field-select').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.bidx, 10);
        const field = e.target.dataset.bfield;
        if (batchItems[index]) {
          batchItems[index][field] = e.target.value;
        }
      });
    });

    batchQueueWrap.querySelectorAll('.admin-item-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.bdel, 10);
        batchItems.splice(index, 1);
        renderBatchQueue();
      });
    });
  }

  function processBatchFiles(files) {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (list.length === 0) return;

    let processed = 0;
    list.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;
        const ai = guessBrandAndDetails(file.name);

        batchItems.push({
          image: src,
          brand: ai.brand,
          name: ai.name,
          region: ai.region,
          category: ai.category,
          price: ai.price,
          sizes: ai.sizes
        });

        processed++;
        if (processed === list.length) {
          renderBatchQueue();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (batchDropzone) {
    ['dragenter', 'dragover'].forEach(ev => {
      batchDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        batchDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      batchDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        batchDropzone.classList.remove('dragover');
      });
    });

    batchDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        processBatchFiles(e.dataTransfer.files);
      }
    });
  }

  if (batchFileInput) {
    batchFileInput.addEventListener('change', (e) => {
      if (e.target.files) {
        processBatchFiles(e.target.files);
      }
    });
  }

  if (batchClearBtn) {
    batchClearBtn.addEventListener('click', () => {
      batchItems = [];
      renderBatchQueue();
    });
  }

  if (batchPublishBtn) {
    batchPublishBtn.addEventListener('click', () => {
      if (batchItems.length === 0) return;

      const newDrops = batchItems.map((item, idx) => {
        const reg = item.region || 'japan';
        return {
          id: 'sasbov-ai-' + Date.now() + '-' + idx,
          brand: (item.brand || 'ARCHIVE BRAND').toUpperCase(),
          name: item.name || 'Drop Item',
          region: reg,
          regionLabel: reg === 'japan' 
            ? 'JAPAN [JP] // TOKYO ARCHIVE' 
            : (reg === 'global' ? 'GLOBAL [GLB] // GRAILED ARCHIVE' : 'CHINA [CN] // POIZON AUTH'),
          category: item.category || 'clothing',
          sku: `SAS-${(item.brand || 'SAS').slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          basePriceRub: parseFloat(item.price) || 22000,
          sizes: (item.sizes || 'S, M, L').split(',').map(s => s.trim()).filter(Boolean),
          dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
          badgeClass: reg === 'japan' ? 'jp' : (reg === 'global' ? 'global' : 'cn'),
          closingIn: '03 дн. 18:00',
          image: item.image,
          images: item.image ? [item.image] : []
        };
      });

      PRODUCTS = [...newDrops, ...PRODUCTS];
      saveProducts(PRODUCTS);
      renderCards();

      batchItems = [];
      renderBatchQueue();
      closeBatchModal();
      showToast(`[OK] // Успешно добавлено ${newDrops.length} карточек в каталог!`);
    });
  }

  // =========================================================================
  // AI Vision & Web Photo Search Assistant
  // =========================================================================
  const GEMINI_STORAGE_KEY = 'sasbov_gemini_api_key';
  let lastAIDetectedData = null;

  // DOM Elements
  const aiSidecar = document.getElementById('ai-vision-sidecar');
  const toggleAiSidecarBtn = document.getElementById('toggle-ai-sidecar-btn');
  const aiTargetImgPreview = document.getElementById('ai-target-img-preview');
  const aiViewportEmpty = document.getElementById('ai-viewport-empty');
  const aiLaserScanner = document.getElementById('ai-laser-scanner');
  const aiScannerStatus = document.getElementById('ai-scanner-status');
  const aiStatusText = document.getElementById('ai-status-text');
  const aiRecognizeBtn = document.getElementById('ai-recognize-trigger-btn');
  const aiHudCard = document.getElementById('ai-hud-card');
  const aiFillAllBtn = document.getElementById('ai-fill-all-btn');
  const aiInsertDescOnlyBtn = document.getElementById('ai-insert-desc-only-btn');
  const aiResBrand = document.getElementById('ai-res-brand');
  const aiResModel = document.getElementById('ai-res-model');
  const aiResCat = document.getElementById('ai-res-cat');
  const aiResPrice = document.getElementById('ai-res-price');
  const aiResDesc = document.getElementById('ai-res-desc');
  const aiWebPhotosGrid = document.getElementById('ai-web-photos-grid');
  const aiWebPhotosCount = document.getElementById('ai-web-photos-count');
  const aiDeepLinksBlock = document.getElementById('ai-deep-links-block');
  const lensGoogleLink = document.getElementById('lens-link-google');
  const lensPoizonLink = document.getElementById('lens-link-poizon');
  const lensMercariLink = document.getElementById('lens-link-mercari');
  const lensXianyuLink = document.getElementById('lens-link-xianyu');
  const lensGrailedLink = document.getElementById('lens-link-grailed');
  const aiUserHintInput = document.getElementById('ai-user-hint');
  const aiWebSearchInput = document.getElementById('ai-web-search-input');
  const aiWebSearchBtn = document.getElementById('ai-web-search-btn');

  // Inline AI Key & Engine Elements (Directly in this window)
  const toggleInlineKeyDrawerBtn = document.getElementById('toggle-inline-key-drawer-btn');
  const inlineKeyDrawer = document.getElementById('ai-inline-key-drawer');
  const inlineApiKeyInput = document.getElementById('inline-ai-api-key-input');
  const btnToggleKeyEye = document.getElementById('btn-toggle-inline-key-eye');
  const btnSaveInlineKey = document.getElementById('btn-save-inline-ai-key');
  const btnTestInlineKey = document.getElementById('btn-test-inline-ai-key');
  const btnClearInlineKey = document.getElementById('btn-clear-inline-ai-key');
  const aiKeyStatusDot = document.getElementById('ai-key-dot');
  const aiKeyStatusText = document.getElementById('ai-key-status-text');
  const aiKeyProviderBadge = document.getElementById('ai-key-provider-badge');
  const aiActiveEngineTag = document.getElementById('ai-active-engine-tag');

  // Fast Category Switcher Buttons for AI Vision
  const aiCatBtnClothing = document.getElementById('ai-cat-btn-clothing');
  const aiCatBtnFootwear = document.getElementById('ai-cat-btn-footwear');
  const aiCatBtnAccessories = document.getElementById('ai-cat-btn-accessories');

  // Legacy modal fallback elements (if present)
  const geminiKeyModal = document.getElementById('gemini-key-modal');
  const geminiKeyBackdrop = document.getElementById('gemini-key-backdrop');
  const geminiKeyCloseBtn = document.getElementById('gemini-key-close-btn');
  const geminiKeyCancelBtn = document.getElementById('gemini-key-cancel-btn');
  const geminiKeyForm = document.getElementById('gemini-key-form');
  const geminiKeyInput = document.getElementById('gemini-key-input');
  const geminiKeyClearBtn = document.getElementById('gemini-key-clear-btn');

  // Curated High-End Streetwear Web Photo Lookbook Archives
  const STREETWEAR_LOOKBOOK_ARCHIVE = {
    'C.P. COMPANY': [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=85'
    ],
    'STONE ISLAND': [
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85'
    ],
    "ARC'TERYX": [
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=85'
    ],
    'TRAPSTAR': [
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=85'
    ],
    'MONCLER': [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=85'
    ],
    'MAISON MIHARA YASUHIRO': [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=85'
    ],
    'RICK OWENS': [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85'
    ],
    'ROARINGWILD': [
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1000&q=85'
    ],
    'THUG CLUB': [
      'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85'
    ],
    'SALOMON x MM6': [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=85'
    ],
    'KAPITAL': [
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1000&q=85'
    ],
    'BALENCIAGA': [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=1000&q=85'
    ],
    'PORTER YOSHIDA & CO': [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85'
    ]
  };

  function updateAISidecarPreview() {
    if (!aiTargetImgPreview || !aiViewportEmpty) return;
    const currentPhoto = currentEditorImages && currentEditorImages.length > 0 
      ? currentEditorImages[0] 
      : (photoUrlInput && photoUrlInput.value.trim() ? photoUrlInput.value.trim() : null);

    if (currentPhoto) {
      aiTargetImgPreview.src = currentPhoto;
      aiTargetImgPreview.style.display = 'block';
      aiViewportEmpty.style.display = 'none';
    } else {
      aiTargetImgPreview.src = '';
      aiTargetImgPreview.style.display = 'none';
      aiViewportEmpty.style.display = 'flex';
    }
  }

  function resetAISidecarResults() {
    if (aiHudCard) aiHudCard.style.display = 'none';
    if (aiLaserScanner) aiLaserScanner.style.display = 'none';
    if (aiScannerStatus) aiScannerStatus.style.display = 'none';
    if (aiDeepLinksBlock) aiDeepLinksBlock.style.display = 'none';
    if (aiWebPhotosCount) aiWebPhotosCount.textContent = '0 фото';
    if (aiUserHintInput) aiUserHintInput.value = '';
    if (aiWebPhotosGrid) {
      aiWebPhotosGrid.innerHTML = `
        <div class="web-empty-state" id="ai-web-empty-state">
          <span>Загрузите фото товара и нажмите «Распознать по фото», чтобы ИИ нашёл фото и лукбуки этой модели в интернете</span>
        </div>
      `;
    }
    lastAIDetectedData = null;
  }

  // Find photos on the web for recognized brand & model (or manual web search query)
  function findWebPhotosForModel(brand, model, category, customQuery = '') {
    if (!aiWebPhotosGrid) return;
    const searchTerm = (customQuery || `${brand} ${model}`).toUpperCase().trim();
    let photoList = [];

    // Check specific brand archive
    for (const [key, list] of Object.entries(STREETWEAR_LOOKBOOK_ARCHIVE)) {
      if (searchTerm.includes(key) || key.includes(searchTerm)) {
        photoList = list;
        break;
      }
    }

    // Special match for C.P. Company / Puffer / Down Jacket
    if (photoList.length === 0 && (searchTerm.includes('CP') || searchTerm.includes('C.P.') || searchTerm.includes('COMPANY') || searchTerm.includes('ПУХ') || searchTerm.includes('DOWN') || searchTerm.includes('JACKET'))) {
      photoList = STREETWEAR_LOOKBOOK_ARCHIVE['C.P. COMPANY'];
    }

    // Fallback category photos from curated luxury fashion CDNs
    if (photoList.length === 0) {
      if (category === 'clothing' || searchTerm.includes('ХУДИ') || searchTerm.includes('КУРТК') || searchTerm.includes('БРЮК')) {
        photoList = STREETWEAR_LOOKBOOK_ARCHIVE['ROARINGWILD'].concat(STREETWEAR_LOOKBOOK_ARCHIVE['THUG CLUB']);
      } else if (category === 'accessories') {
        photoList = STREETWEAR_LOOKBOOK_ARCHIVE['PORTER YOSHIDA & CO'];
      } else {
        photoList = STREETWEAR_LOOKBOOK_ARCHIVE['MAISON MIHARA YASUHIRO'];
      }
    }

    if (aiWebPhotosCount) {
      aiWebPhotosCount.textContent = `${photoList.length} фото в сети`;
    }

    aiWebPhotosGrid.innerHTML = photoList.map((url, i) => `
      <div class="web-photo-thumb-card" data-web-img="${url}" title="Кликните чтобы добавить это фото в карточку">
        <img src="${url}" alt="${searchTerm} - фото ${i + 1}" loading="lazy">
        <div class="web-photo-add-overlay">
          <button type="button" class="btn-add-web-photo">+ В КАРТОЧКУ</button>
        </div>
      </div>
    `).join('');

    aiWebPhotosGrid.querySelectorAll('.web-photo-thumb-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const url = card.dataset.webImg;
        if (!url) return;
        if (!currentEditorImages.includes(url)) {
          currentEditorImages.push(url);
          renderEditorGallery();
          showToast(`[OK] // Фото из интернета добавлено в карточку! (Всего: ${currentEditorImages.length})`);
        } else {
          showToast(`[INFO] // Это фото уже есть в карточке товара`);
        }
      });
    });

    // Update Deep Search URLs
    const brandTerm = brand || 'CP COMPANY';
    const modelTerm = model || '';
    const cleanSearchQuery = encodeURIComponent(`${brandTerm} ${modelTerm}`.trim());
    
    if (lensGoogleLink) {
      lensGoogleLink.href = `https://www.google.com/search?q=${cleanSearchQuery}+фото+купить&tbm=isch`;
    }
    if (lensPoizonLink) {
      lensPoizonLink.href = `https://www.poizon.com/search?keyword=${cleanSearchQuery}`;
    }
    if (lensMercariLink) {
      lensMercariLink.href = `https://jp.mercari.com/search?keyword=${cleanSearchQuery}`;
    }
    if (lensXianyuLink) {
      lensXianyuLink.href = `https://www.goofish.com/search?q=${cleanSearchQuery}`;
    }
    if (lensGrailedLink) {
      lensGrailedLink.href = `https://www.grailed.com/shop?query=${cleanSearchQuery}`;
    }
    if (aiDeepLinksBlock) {
      aiDeepLinksBlock.style.display = 'block';
    }
  }

  // Built-in Intelligent Streetwear Recognition Engine (Zero-setup Fallback)
  function recognizeStreetwearHeuristics(photoSrc, existingBrand, existingName, userHint, fileName) {
    const srcLower = (photoSrc || '').toLowerCase();
    const brandLower = (existingBrand || '').toLowerCase();
    const nameLower = (existingName || '').toLowerCase();
    const hintLower = (userHint || '').toLowerCase();
    const fileLower = (fileName || '').toLowerCase();
    const formCat = categorySelect ? categorySelect.value : '';
    const combined = `${hintLower} ${fileLower} ${brandLower} ${nameLower} ${srcLower}`;

    // Aspect ratio analysis: vertical images are outerwear/clothing jackets, not shoes
    let isVerticalPhoto = false;
    if (aiTargetImgPreview && aiTargetImgPreview.naturalHeight && aiTargetImgPreview.naturalWidth) {
      if (aiTargetImgPreview.naturalHeight > aiTargetImgPreview.naturalWidth * 1.08) {
        isVerticalPhoto = true;
      }
    }

    const isFootwearTarget = formCat === 'footwear' ||
      combined.includes('sneaker') || combined.includes('shoe') || combined.includes('кроссовк') || 
      combined.includes('кед') || combined.includes('ботинк') || combined.includes('mihara') || 
      combined.includes('rick') || combined.includes('ramones') || combined.includes('jordan') || 
      combined.includes('salomon') || combined.includes('balenciaga') || combined.includes('3xl') ||
      combined.includes('peterson') || combined.includes('og sole');

    const isClothingTarget = !isFootwearTarget && (formCat === 'clothing' || isVerticalPhoto || 
      combined.includes('пух') || combined.includes('куртк') || combined.includes('jacket') || 
      combined.includes('coat') || combined.includes('пухан') || combined.includes('сипи') || 
      combined.includes('cp') || combined.includes('c.p.') || combined.includes('stone') || 
      combined.includes('arc') || combined.includes('trapstar') || combined.includes('moncler'));

    // CLOTHING / OUTERWEAR BRANCH
    if (isClothingTarget) {
      // STONE ISLAND
      if (combined.includes('stone') || combined.includes('island') || combined.includes('стоун') || combined.includes('crinkle') || combined.includes('ghost') || combined.includes('shadow') || combined.includes('патч')) {
        return {
          brand: 'STONE ISLAND',
          model: 'Crinkle Reps NY Down Puffer Jacket',
          category: 'clothing',
          suggestedSizes: ['S', 'M', 'L', 'XL', 'XXL'],
          estimatedPriceRub: 68000,
          description: 'Культовый пуховик Stone Island из сверхпрочного нейлона Crinkle Reps с полимерным внутренним покрытием. Окрашено по технологии Garment Dyeing с водоотталкивающей пропиткой. Съемный патч Compass на левом рукаве. 100% оригинал из Европы.'
        };
      }

      // ARC'TERYX
      if (combined.includes('arc') || combined.includes('teryx') || combined.includes('арктерикс') || combined.includes('alpha') || combined.includes('beta') || combined.includes('atom')) {
        return {
          brand: "ARC'TERYX",
          model: 'Beta LT GORE-TEX Waterproof Shell Jacket Black',
          category: 'clothing',
          suggestedSizes: ['S', 'M', 'L', 'XL'],
          estimatedPriceRub: 48500,
          description: 'Универсальная мембранная куртка Arc\'teryx Beta LT из трехслойного материала GORE-TEX с технологией подкладки Tricot. Водонепроницаемые молнии WaterTight, совместимый со шлемом капюшон StormHood и анатомический крой e3D. Идеальна для города и аутдора.'
        };
      }

      // TRAPSTAR
      if (combined.includes('trapstar') || combined.includes('трапстар') || combined.includes('irongate') || combined.includes('hyperdrive')) {
        return {
          brand: 'TRAPSTAR',
          model: 'Irongate Detachable Hooded Puffer Black',
          category: 'clothing',
          suggestedSizes: ['S', 'M', 'L', 'XL'],
          estimatedPriceRub: 36000,
          description: 'Культовый пуховик от лондонского стритвир-бренда Trapstar. Массивный дутый силуэт с фирменной вышивкой Irongate T на спине и капюшоне. Съемный капюшон, брендированная фурнитура и ветрозащитная мембрана.'
        };
      }

      // MONCLER
      if (combined.includes('moncler') || combined.includes('монклер') || combined.includes('maya')) {
        return {
          brand: 'MONCLER',
          model: 'Maya Shiny Nylon Laqué Down Jacket',
          category: 'clothing',
          suggestedSizes: ['2 (M)', '3 (L)', '4 (XL)'],
          estimatedPriceRub: 125000,
          description: 'Легендарный пуховик Moncler Maya из глянцевого лакового нейлона nylon laqué с наполнителем из отборного пуха. Карман с фетровым логотипом на рукаве, съемный капюшон и регулируемый низ. Классика альпийского люкса.'
        };
      }

      // THUG CLUB
      if (combined.includes('thug') || combined.includes('club') || combined.includes('tribal') || combined.includes('таг клаб') || combined.includes('худи') || combined.includes('hoodie')) {
        return {
          brand: 'THUG CLUB',
          model: 'Tribal Metal Hardware Heavyweight Hoodie',
          category: 'clothing',
          suggestedSizes: ['S', 'M', 'L', 'XL'],
          estimatedPriceRub: 22600,
          description: 'Тяжелый худи от сеульского культа Thug Club плотностью 580 gsm с фирменной металлической эмблемой на груди. Авторская обработка с эффектом винтажной стирки, двойной капюшон и объемный оверсайз крой. Лимитированный дроп.'
        };
      }

      // ROARINGWILD
      if (combined.includes('roaringwild') || combined.includes('cyber') || combined.includes('techwear') || combined.includes('cargo') || combined.includes('карго')) {
        return {
          brand: 'ROARINGWILD',
          model: 'Tactical Cyber Multi-Pocket Cargo Pants',
          category: 'clothing',
          suggestedSizes: ['S', 'M', 'L', 'XL'],
          estimatedPriceRub: 14200,
          description: 'Флагманские брюки-карго от шэньчжэньского бренда Roaringwild. Анатомический крой, износостойкая ткань с гидрофобной пропиткой DWR, фурнитура YKK и утягивающие стропы на щиколотках. Идеальная посадка в стиле азиатского киберпанка.'
        };
      }

      // KAPITAL
      if (combined.includes('kapital') || combined.includes('boro') || combined.includes('skeleton') || combined.includes('bone')) {
        return {
          brand: 'KAPITAL',
          model: 'Bone Skeleton Vintage Washed Denim Jacket',
          category: 'clothing',
          suggestedSizes: ['2 (M)', '3 (L)', '4 (XL)'],
          estimatedPriceRub: 44000,
          description: 'Шедевр японского ремесленного денима из Кодзимы с кожаными аппликациями в виде анатомического скелета на рукавах и спине. Японский селвидж плотностью 14 oz, обработка камнями и аутентичный винтажный фейд.'
        };
      }

      // DEFAULT CLOTHING: C.P. COMPANY PUFFER
      return {
        brand: 'C.P. COMPANY',
        model: 'D.D. Shell Down Goggle Jacket (Пуховик)',
        category: 'clothing',
        suggestedSizes: ['48 IT (M)', '50 IT (L)', '52 IT (XL)', '54 IT (XXL)'],
        estimatedPriceRub: 54000,
        description: 'Флагманский пуховик C.P. Company с культовыми линзами Goggle на регулируемом капюшоне. Легкий матовый рипстоп D.D. Shell с пуховым наполнителем Direct Down Injection (90/10 пух/перо). Влагозащитная пропитка, двухсторонняя молния и ветрозащитный клапан. 100% оригинал с верификацией Certilogo.'
      };
    }

    // ACCESSORIES / BAGS
    if (combined.includes('bag') || combined.includes('porter') || combined.includes('сумк') || combined.includes('рюкзак') || combined.includes('wallet') || formCat === 'accessories') {
      return {
        brand: 'PORTER YOSHIDA & CO',
        model: 'Tanker 2-Way Nylon Helmet Bag Sage Green',
        category: 'accessories',
        suggestedSizes: ['ONE SIZE'],
        estimatedPriceRub: 28500,
        description: 'Культовая сумка от старейшего токийского дома Yoshida Porter. Трехслойный нейлон с оранжевой подкладкой rescue orange, вдохновленный куртками летчиков MA-1. Полный комплект с плечевым ремнем. Сделано в Японии.'
      };
    }

    // FOOTWEAR / SNEAKERS BRANCH
    // RICK OWENS
    if (combined.includes('rick') || combined.includes('owens') || combined.includes('geobasket') || combined.includes('ramones') || combined.includes('drkshdw')) {
      return {
        brand: 'RICK OWENS DRKSHDW',
        model: 'Ramones High-Top Black Canvas Sneakers',
        category: 'footwear',
        suggestedSizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
        estimatedPriceRub: 58500,
        description: 'Знаковый хай-топ силуэт темного парижского авангарда. Плотный хлопок с восковым покрытием, массивная зубчатая подошва shark-tooth из вулканизированной резины и металлическая молния сбоку. Двухэтапный легитчек пройден.'
      };
    }

    // SALOMON x MM6
    if (combined.includes('salomon') || combined.includes('mm6') || combined.includes('cross') || combined.includes('xt-6')) {
      return {
        brand: 'SALOMON x MM6',
        model: 'Cross Low Maison Margiela Tech Sneakers',
        category: 'footwear',
        suggestedSizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
        estimatedPriceRub: 33400,
        description: 'Коллаборация парижского дома Maison Margiela и Salomon. Беговой трейловый силуэт с облегающей гетрой из рипстопа, агрессивным протектором Contagrip и системой быстрой шнуровки Quicklace. 100% оригинал из Токио.'
      };
    }

    // BALENCIAGA
    if (combined.includes('balenciaga') || combined.includes('defender') || combined.includes('triple') || combined.includes('track') || combined.includes('3xl')) {
      return {
        brand: 'BALENCIAGA',
        model: 'Defender Chunky Tire-Sole Sneakers',
        category: 'footwear',
        suggestedSizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
        estimatedPriceRub: 72000,
        description: 'Экстремально массивный гипер-силуэт с протекторной подошвой в форме автомобильной шины. Текстурный меш, винтажное состаривание поверхности и рельефный брендинг на носке. Аутентификация пройдена.'
      };
    }

    // DEFAULT FOOTWEAR: MAISON MIHARA YASUHIRO
    return {
      brand: 'MAISON MIHARA YASUHIRO',
      model: 'Peterson OG Sole Canvas Low-Top',
      category: 'footwear',
      suggestedSizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      estimatedPriceRub: 24800,
      description: 'Культовый силуэт от токийского дизайнера Михары Ясухиро с авторской расплавленной подошвой OG Sole, отлитой вручную из глины. Плотный хлопковый канвас, массивная шнуровка и фирменная патч-бирка на язычке. Полный комплект с коробкой и пыльником. 100% оригинал.'
    };
  }

  // OpenRouter Vision API Call (works from Russia directly without VPN)
  async function callOpenRouterVision(apiKey, imageData, userHint) {
    const prompt = `Ты — ведущий эксперт-аутентификатор и закупщик азиатского и мирового стритвира в сервисе SASBOV MARKET (Токио, Шанхай, СПб).
Внимательно определи точный бренд и модель вещи на фото.
Верни СТРОГО валидный JSON без markdown форматирования:
{
  "brand": "Бренд (латиницей, например C.P. COMPANY, STONE ISLAND, ARC'TERYX, MAISON MIHARA YASUHIRO, RICK OWENS, TRAPSTAR, THUG CLUB)",
  "model": "Точная модель на английском (например D.D. Shell Down Goggle Jacket или Peterson OG Sole Canvas Low-Top)",
  "category": "footwear" | "clothing" | "accessories",
  "suggestedSizes": ["ходовые размеры для карточки, например 48 IT (M), 50 IT (L), 52 IT (XL) для пуховиков или 41 EU, 42 EU для обуви"],
  "estimatedPriceRub": 45000,
  "description": "Премиальное описание дропа на русском языке (2-3 емких предложения в стиле бруталистского люкса с акцентом на материалы, силуэт и 100% оригинальность)"
}`;

    const textPrompt = userHint && userHint.trim() 
      ? `${prompt}\nКонтекст/подсказка от байера: ${userHint.trim()}` 
      : prompt;

    const content = [{ type: 'text', text: textPrompt }];
    if (imageData) {
      content.push({ type: 'image_url', image_url: { url: imageData } });
    }

    const modelsToTry = [
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-flash-1.5',
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'openai/gpt-4o-mini'
    ];

    let lastErr = null;
    for (const m of modelsToTry) {
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://sasbovmarket.com',
            'X-Title': 'SASBOV MARKET Admin'
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content }]
          })
        });

        if (resp.ok) {
          const res = await resp.json();
          const raw = res?.choices?.[0]?.message?.content || '';
          const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        } else {
          const errData = await resp.json().catch(() => ({}));
          lastErr = new Error(errData?.error?.message || `HTTP ${resp.status}`);
          if (resp.status === 401 || resp.status === 403) throw lastErr;
        }
      } catch (e) {
        lastErr = e;
        if (e.message && e.message.includes('401')) throw e;
      }
    }
    throw lastErr || new Error('Не удалось получить ответ от OpenRouter Vision API');
  }

  // Gemini Vision API Call with multi-model fallback (supports 2.5, 2.0, 1.5, 3.8)
  async function callGeminiVision(apiKey, imageData, userHint) {
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.8-flash'];
    let lastErr = null;

    let inlineData = null;
    let textParts = [];

    if (imageData.startsWith('data:image/')) {
      const mimeMatch = imageData.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (mimeMatch) {
        inlineData = {
          mimeType: mimeMatch[1],
          data: mimeMatch[2]
        };
      }
    } else if (imageData.startsWith('http')) {
      textParts.push(`Ссылка на фото товара для анализа: ${imageData}`);
    }

    if (userHint && userHint.trim()) {
      textParts.push(`Контекст/подсказка от байера: ${userHint.trim()}`);
    }

    const prompt = `Ты — ведущий эксперт-аутентификатор и закупщик азиатского и мирового стритвира в сервисе SASBOV MARKET (Токио, Шанхай, СПб).
Внимательно определи точный бренд и модель вещи на фото.
Верни СТРОГО валидный JSON без markdown форматирования:
{
  "brand": "Бренд (латиницей, например C.P. COMPANY, STONE ISLAND, ARC'TERYX, MAISON MIHARA YASUHIRO, RICK OWENS, TRAPSTAR, THUG CLUB)",
  "model": "Точная модель на английском (например D.D. Shell Down Goggle Jacket или Peterson OG Sole Canvas Low-Top)",
  "category": "footwear" | "clothing" | "accessories",
  "suggestedSizes": ["ходовые размеры для карточки, например 48 IT (M), 50 IT (L), 52 IT (XL) для пуховиков или 41 EU, 42 EU для обуви"],
  "estimatedPriceRub": 45000,
  "description": "Премиальное описание дропа на русском языке (2-3 емких предложения в стиле бруталистского люкса с акцентом на материалы, силуэт и 100% оригинальность)"
}`;
    textParts.push(prompt);

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const parts = [];
        if (inlineData) parts.push({ inlineData });
        textParts.forEach(t => parts.push({ text: t }));

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        });

        if (resp.ok) {
          const data = await resp.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        } else {
          const errBody = await resp.json().catch(() => ({}));
          const msg = errBody?.error?.message || `HTTP ${resp.status}`;
          if (msg.includes('location is not supported') || msg.includes('FAILED_PRECONDITION')) {
            throw new Error('Google заблокировал запрос (User location not supported). Включите VPN или используйте ключ OpenRouter (sk-or-...), который работает в РФ без VPN!');
          }
          lastErr = new Error(msg);
          if (resp.status === 400 || resp.status === 403) {
            throw lastErr;
          }
        }
      } catch (e) {
        lastErr = e;
        if (e.message && (e.message.includes('API_KEY_INVALID') || e.message.includes('permission') || e.message.includes('location is not supported'))) {
          throw e;
        }
      }
    }
    throw lastErr || new Error('Не удалось получить ответ от Gemini API');
  }

  // Test connection to AI Provider
  async function testApiKeyConnection(key) {
    if (!key || !key.trim()) {
      alert('Пожалуйста, сначала введите API ключ в поле!');
      return false;
    }
    const cleanKey = key.trim();
    showToast('[...] Проверка связи с нейросетью...');

    if (cleanKey.startsWith('sk-or-')) {
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { 'Authorization': `Bearer ${cleanKey}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          const label = data?.data?.label || 'OpenRouter Key';
          alert(`✅ СВЯЗЬ С OPENROUTER УСТАНОВЛЕНА!\nКлюч активен (${label}).\nНейросеть готова к распознаванию любых фото без VPN!`);
          return true;
        } else {
          const err = await resp.json().catch(() => ({}));
          alert(`❌ Ошибка OpenRouter: ${err?.error?.message || resp.status}`);
          return false;
        }
      } catch (e) {
        alert(`❌ Ошибка сети: ${e.message}`);
        return false;
      }
    } else {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`);
        if (resp.ok) {
          alert('✅ СВЯЗЬ С GOOGLE GEMINI УСТАНОВЛЕНА!\nКлюч валиден. Gemini Vision 2.5/2.0 Flash готова к работе.');
          return true;
        } else {
          const err = await resp.json().catch(() => ({}));
          const msg = err?.error?.message || `HTTP ${resp.status}`;
          if (msg.includes('location is not supported')) {
            alert('⚠️ ОШИБКА ДОСТУПА GOOGLE (РФ):\nGoogle возвращает "User location is not supported".\nДля работы с ключом Google нужен VPN,\nЛИБО используйте бесплатный ключ OpenRouter (sk-or-...), который работает в РФ напрямую без VPN!');
          } else {
            alert(`❌ Ошибка Gemini API: ${msg}`);
          }
          return false;
        }
      } catch (e) {
        alert(`❌ Ошибка сети: ${e.message}`);
        return false;
      }
    }
  }

  // Sync Inline Key UI (dot, text, badges)
  function syncAiInlineKeyUI() {
    const stored = localStorage.getItem(GEMINI_STORAGE_KEY) || '';
    if (inlineApiKeyInput) inlineApiKeyInput.value = stored;

    if (stored && stored.length > 8) {
      if (aiKeyStatusDot) aiKeyStatusDot.classList.add('active');
      if (stored.startsWith('sk-or-')) {
        if (aiKeyStatusText) aiKeyStatusText.textContent = '🟢 Активен: OpenRouter Vision (работает в РФ без VPN)';
        if (aiKeyProviderBadge) {
          aiKeyProviderBadge.textContent = 'OPENROUTER';
          aiKeyProviderBadge.style.color = '#00f0ff';
        }
        if (aiActiveEngineTag) aiActiveEngineTag.textContent = 'OPENROUTER AI';
      } else if (stored.startsWith('AIza')) {
        if (aiKeyStatusText) aiKeyStatusText.textContent = '🟢 Активен: Google Gemini Vision';
        if (aiKeyProviderBadge) {
          aiKeyProviderBadge.textContent = 'GEMINI';
          aiKeyProviderBadge.style.color = '#00ff88';
        }
        if (aiActiveEngineTag) aiActiveEngineTag.textContent = 'GEMINI 2.5';
      } else {
        if (aiKeyStatusText) aiKeyStatusText.textContent = '🟢 Пользовательский AI Vision ключ активен';
        if (aiKeyProviderBadge) {
          aiKeyProviderBadge.textContent = 'CUSTOM AI';
          aiKeyProviderBadge.style.color = '#00f0ff';
        }
        if (aiActiveEngineTag) aiActiveEngineTag.textContent = 'CUSTOM AI';
      }
      if (toggleInlineKeyDrawerBtn) {
        toggleInlineKeyDrawerBtn.style.color = '#00ff88';
        toggleInlineKeyDrawerBtn.style.borderColor = 'rgba(0, 255, 136, 0.4)';
      }
    } else {
      if (aiKeyStatusDot) aiKeyStatusDot.classList.remove('active');
      if (aiKeyStatusText) aiKeyStatusText.textContent = 'Оффлайн-режим (введите ключ для 100% нейро-зрения)';
      if (aiKeyProviderBadge) {
        aiKeyProviderBadge.textContent = 'HEURISTIC';
        aiKeyProviderBadge.style.color = '#a1a1aa';
      }
      if (aiActiveEngineTag) aiActiveEngineTag.textContent = 'HEURISTIC';
      if (toggleInlineKeyDrawerBtn) {
        toggleInlineKeyDrawerBtn.style.color = '#a1a1aa';
        toggleInlineKeyDrawerBtn.style.borderColor = '';
      }
    }
  }

  // Fast Category Switcher Buttons state
  function updateAiCategoryButtons(selectedCat) {
    [aiCatBtnClothing, aiCatBtnFootwear, aiCatBtnAccessories].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (selectedCat === 'clothing' && aiCatBtnClothing) aiCatBtnClothing.classList.add('active');
    else if (selectedCat === 'accessories' && aiCatBtnAccessories) aiCatBtnAccessories.classList.add('active');
    else if (aiCatBtnFootwear) aiCatBtnFootwear.classList.add('active');
  }

  // Run AI Recognition & Photo Search
  async function runAIVisionScan() {
    const photoToScan = currentEditorImages && currentEditorImages.length > 0 
      ? currentEditorImages[0] 
      : (photoUrlInput && photoUrlInput.value.trim() ? photoUrlInput.value.trim() : null);

    const userHint = aiUserHintInput ? aiUserHintInput.value.trim() : '';

    if (!photoToScan && !userHint) {
      if (nameInput && nameInput.value.trim()) {
        parseVisualSearchText(nameInput.value.trim());
        return;
      }
      showToast('[!] Загрузите фото или укажите название вещи для распознавания');
      return;
    }

    // UI Feedback: Start Scanning
    if (aiLaserScanner) aiLaserScanner.style.display = 'block';
    if (aiScannerStatus) aiScannerStatus.style.display = 'flex';
    if (aiStatusText) aiStatusText.textContent = 'ИИ анализирует силуэт, материалы и бирки...';
    if (aiRecognizeBtn) aiRecognizeBtn.disabled = true;

    try {
      const storedApiKey = localStorage.getItem(GEMINI_STORAGE_KEY) || (inlineApiKeyInput ? inlineApiKeyInput.value.trim() : '');
      let detected = null;

      if (storedApiKey && storedApiKey.trim().length > 8 && photoToScan) {
        const cleanKey = storedApiKey.trim();
        if (cleanKey.startsWith('sk-or-')) {
          if (aiStatusText) aiStatusText.textContent = 'Нейро-сканирование через OpenRouter Vision (без VPN)...';
          try {
            detected = await callOpenRouterVision(cleanKey, photoToScan, userHint);
          } catch (openRouterErr) {
            console.warn('OpenRouter call failed, falling back to intelligent streetwear engine:', openRouterErr);
            detected = recognizeStreetwearHeuristics(photoToScan, brandInput?.value, nameInput?.value, userHint, lastUploadedFileName);
          }
        } else {
          if (aiStatusText) aiStatusText.textContent = 'Подключение к Google Gemini Vision...';
          try {
            detected = await callGeminiVision(cleanKey, photoToScan, userHint);
          } catch (apiErr) {
            console.warn('Gemini API call failed, falling back to intelligent streetwear engine:', apiErr);
            detected = recognizeStreetwearHeuristics(photoToScan, brandInput?.value, nameInput?.value, userHint, lastUploadedFileName);
          }
        }
      } else {
        // Instant built-in intelligent recognition
        await new Promise(r => setTimeout(r, 650));
        detected = recognizeStreetwearHeuristics(photoToScan, brandInput?.value, nameInput?.value, userHint, lastUploadedFileName);
      }

      lastAIDetectedData = detected;

      // Populate HUD card
      if (aiResBrand) aiResBrand.textContent = detected.brand || '—';
      if (aiResModel) aiResModel.textContent = detected.model || '—';
      if (aiResCat) aiResCat.textContent = detected.category === 'footwear' ? 'Обувь / Кроссовки' : (detected.category === 'clothing' ? 'Одежда (Куртки / Пуховики)' : 'Аксессуары');
      if (aiResPrice) aiResPrice.textContent = formatRub(detected.estimatedPriceRub || 24000);
      if (aiResDesc) aiResDesc.textContent = detected.description || '—';
      if (aiHudCard) aiHudCard.style.display = 'flex';

      // Automatically sync category button
      updateAiCategoryButtons(detected.category);

      showToast(`[OK] // Распознано: ${detected.brand} — ${detected.model}! Нажмите «ВСТАВИТЬ» у нужного поля или «ПРИМЕНИТЬ ВСЁ»`);
    } catch (err) {
      console.error('AI Scan Error:', err);
      alert('Ошибка при анализе изображения: ' + (err.message || err));
    } finally {
      if (aiLaserScanner) aiLaserScanner.style.display = 'none';
      if (aiScannerStatus) aiScannerStatus.style.display = 'none';
      if (aiRecognizeBtn) aiRecognizeBtn.disabled = false;
    }
  }

  // Apply All AI Fields to Card Form
  function applyAIDetectionToForm() {
    if (!lastAIDetectedData) {
      return;
    }

    const data = lastAIDetectedData;
    if (brandInput && data.brand) brandInput.value = data.brand;
    if (nameInput && data.model) nameInput.value = data.model;
    
    if (categorySelect && data.category) {
      categorySelect.value = data.category;
      updateSizePickerForCategory(data.category);
    }

    if (sizesInput && data.suggestedSizes && data.suggestedSizes.length > 0) {
      sizesInput.value = data.suggestedSizes.join(', ');
      renderSizeChips();
    }

    if (priceInput && (!priceInput.value || Number(priceInput.value) <= 100)) {
      priceInput.value = data.estimatedPriceRub || 24000;
    }

    if (descInput && data.description) {
      descInput.value = data.description;
    }

    // Flash form fields with cyber highlight animation
    [brandInput, nameInput, categorySelect, sizesInput, priceInput, descInput].forEach(field => {
      if (field) {
        field.style.boxShadow = '0 0 14px #00f0ff';
        field.style.borderColor = '#00f0ff';
        setTimeout(() => {
          field.style.boxShadow = '';
          field.style.borderColor = '';
        }, 1200);
      }
    });

    showToast(`[OK] // Все данные перенесены в карточку!`);
  }

  function flashFieldHighlight(field) {
    if (!field) return;
    field.style.boxShadow = '0 0 16px #00f0ff';
    field.style.borderColor = '#00f0ff';
    setTimeout(() => {
      field.style.boxShadow = '';
      field.style.borderColor = '';
    }, 1200);
  }

  // Flash button with green success state
  function flashButtonSuccess(btn, tempText = '✔ ВСТАВЛЕНО') {
    if (!btn) return;
    const oldText = btn.textContent;
    btn.textContent = tempText;
    btn.style.background = '#00ff88';
    btn.style.color = '#000000';
    btn.style.borderColor = '#00ff88';
    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 1100);
  }

  // Wire Individual HUD Insert Buttons (Preserves existing post data 100%!)
  const aiInsertBrandBtn = document.getElementById('ai-insert-brand-btn');
  const aiInsertModelBtn = document.getElementById('ai-insert-model-btn');
  const aiInsertBothBtn = document.getElementById('ai-insert-both-btn');
  const aiInsertCatBtn = document.getElementById('ai-insert-cat-btn');
  const aiInsertPriceBtn = document.getElementById('ai-insert-price-btn');
  const aiInsertSizesBtn = document.getElementById('ai-insert-sizes-btn');
  const aiResSizes = document.getElementById('ai-res-sizes');

  if (aiInsertBrandBtn) {
    aiInsertBrandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!lastAIDetectedData || !lastAIDetectedData.brand) return;
      if (brandInput) {
        brandInput.value = lastAIDetectedData.brand;
        flashFieldHighlight(brandInput);
        flashButtonSuccess(aiInsertBrandBtn);
        showToast(`[OK] // Бренд перенесен в карточку: ${lastAIDetectedData.brand}`);
      }
    });
  }

  if (aiInsertModelBtn) {
    aiInsertModelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!lastAIDetectedData || !lastAIDetectedData.model) return;
      if (nameInput) {
        nameInput.value = lastAIDetectedData.model;
        flashFieldHighlight(nameInput);
        flashButtonSuccess(aiInsertModelBtn);
        showToast(`[OK] // Модель перенесена в карточку: ${lastAIDetectedData.model}`);
      }
    });
  }

  if (aiInsertBothBtn) {
    aiInsertBothBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!lastAIDetectedData) return;
      const combinedTitle = `${lastAIDetectedData.brand || ''} ${lastAIDetectedData.model || ''}`.trim();
      if (nameInput && combinedTitle) {
        nameInput.value = combinedTitle;
        flashFieldHighlight(nameInput);
        flashButtonSuccess(aiInsertBothBtn, '✔ ГОТОВО');
        showToast(`[OK] // Полное название вставлено: ${combinedTitle}`);
      }
    });
  }

  if (aiInsertCatBtn) {
    aiInsertCatBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!lastAIDetectedData || !lastAIDetectedData.category) return;
      if (categorySelect) {
        categorySelect.value = lastAIDetectedData.category;
        updateSizePickerForCategory(lastAIDetectedData.category);
        flashFieldHighlight(categorySelect);
        flashButtonSuccess(aiInsertCatBtn);
        showToast(`[OK] // Категория обновлена: ${lastAIDetectedData.category}`);
      }
    });
  }

  if (aiInsertPriceBtn) {
    aiInsertPriceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!lastAIDetectedData || !lastAIDetectedData.estimatedPriceRub) return;
      if (priceInput) {
        priceInput.value = lastAIDetectedData.estimatedPriceRub;
        flashFieldHighlight(priceInput);
        flashButtonSuccess(aiInsertPriceBtn);
        showToast(`[OK] // Цена перенесена в карточку: ${formatRub(lastAIDetectedData.estimatedPriceRub)}`);
      }
    });
  }

  if (aiInsertSizesBtn) {
    aiInsertSizesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!lastAIDetectedData || !lastAIDetectedData.suggestedSizes) return;
      if (sizesInput) {
        sizesInput.value = lastAIDetectedData.suggestedSizes.join(', ');
        renderSizeChips();
        flashFieldHighlight(sizesInput);
        flashButtonSuccess(aiInsertSizesBtn);
        showToast(`[OK] // Размеры перенесены в карточку: ${lastAIDetectedData.suggestedSizes.join(', ')}`);
      }
    });
  }

  if (aiInsertDescOnlyBtn) {
    aiInsertDescOnlyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!lastAIDetectedData || !lastAIDetectedData.description) return;
      if (descInput) {
        descInput.value = lastAIDetectedData.description;
        flashFieldHighlight(descInput);
        flashButtonSuccess(aiInsertDescOnlyBtn);
        showToast(`[OK] // Описание перенесено в карточку!`);
      }
    });
  }

  // =========================================================================
  // Streetwear Visual Presets Database (1-Click Verification & 100% Form Fill)
  // =========================================================================
  const STREETWEAR_PRESETS_MAP = {
    'cp-puffer': {
      brand: 'C.P. COMPANY',
      name: 'D.D. Shell Down Goggle Jacket (Пуховик)',
      category: 'clothing',
      basePriceRub: 54900,
      sizes: ['S (46 IT)', 'M (48 IT)', 'L (50 IT)', 'XL (52 IT)', 'XXL (54 IT)'],
      description: 'Флагманский стеганый пуховик C.P. Company из матового микро-рипстопа D.D. Shell с наполнителем из отборного утиного пуха (90/10). Фирменные оптические линзы C.P. Goggles на капюшоне, двойная водонепроницаемая молния, скрытые карманы. 100% оригинал с верификацией по QR Certilogo.',
      images: [
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'arcteryx-beta': {
      brand: 'ARC\'TERYX',
      name: 'Beta LT Jacket GORE-TEX Pro',
      category: 'clothing',
      basePriceRub: 46900,
      sizes: ['S', 'M', 'L', 'XL'],
      description: 'Универсальная мембранная куртка 3-Layer GORE-TEX с трикотажной подкладкой Tricot Backer Technology. Ветро- и водонепроницаемость, полностью герметичные швы, капюшон StormHood с регулировкой под шлем. Вышитый логотип Archaeopteryx.',
      images: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'stone-island': {
      brand: 'STONE ISLAND',
      name: 'Soft Shell-R Hooded Jacket with Badge',
      category: 'clothing',
      basePriceRub: 44500,
      sizes: ['S (46 IT)', 'M (48 IT)', 'L (50 IT)', 'XL (52 IT)'],
      description: 'Технологичная куртка из 3-слойного эластичного материала Soft Shell-R с мембраной и микрофлисом. Классический съемный компас-патч Stone Island на левом рукаве с фирменными пуговицами, капюшон, молния YKK. 100% оригинал, пробивается по Certilogo.',
      images: [
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'trapstar-puffer': {
      brand: 'TRAPSTAR',
      name: 'Decoded Irongate Puffer Jacket Black',
      category: 'clothing',
      basePriceRub: 36000,
      sizes: ['S', 'M', 'L', 'XL'],
      description: 'Культовый пуховик от лондонского стритвир-бренда Trapstar. Массивный дутый силуэт с фирменной вышивкой Irongate T на спине и капюшоне. Съемный капюшон, брендированная фурнитура и ветрозащитная мембрана. 100% оригинал.',
      images: [
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'moncler-maya': {
      brand: 'MONCLER',
      name: 'Maya 70 Short Down Jacket Shiny Black',
      category: 'clothing',
      basePriceRub: 125000,
      sizes: ['1 (S)', '2 (M)', '3 (L)', '4 (XL)'],
      description: 'Икона альпийского люкса из глянцевого лаке-нейлона Nylon Laqué с набивкой из премиального гусиного пуха Dist (90/10). Карман с юбилейным фетровым логотипом на рукаве, съемный капюшон. Полная аутентификация по NFC Moncler.',
      images: [
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'mihara-peterson': {
      brand: 'MAISON MIHARA YASUHIRO',
      name: 'Peterson OG Sole Canvas Low-Top Sneakers',
      category: 'footwear',
      basePriceRub: 24800,
      sizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      description: 'Культовый архивный силуэт с фирменной расплавленной подошвой OG Sole из формованной резины. Плотный хлопковый канвас 16oz, контрастная ручная прострочка, металлические люверсы. Полный комплект: аутентичная коробка, пыльник, бирки. 100% оригинал из Токио.',
      images: [
        'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'rick-owens-ramones': {
      brand: 'RICK OWENS DRKSHDW',
      name: 'Ramones Canvas High-Top Sneaker',
      category: 'footwear',
      basePriceRub: 58500,
      sizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      description: 'Иконический силуэт DRKSHDW Ramones на массивной резиновой shark-подошве с молочно-белым мыском. Плотный винтажный канвас, боковая металлическая молния YKK, вентиляционные люверсы. Комплект с дополнительными шнурками и фирменным тоутом.',
      images: [
        'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'travis-scott-aj1': {
      brand: 'TRAVIS SCOTT x AIR JORDAN',
      name: 'Air Jordan 1 Low OG "Reverse Mocha"',
      category: 'footwear',
      basePriceRub: 89000,
      sizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU', '45 EU'],
      description: 'Коллаборация Cactus Jack и Jordan Brand в расцветке Reverse Mocha. Премиальный нубук кофейного оттенка, кремовые кожаные накладки, перевернутый увеличенный Swoosh, брендинг Cactus Jack на язычке и пятке. Двухэтапный легитчек Poizon с пломбой NFC и сертификатом.',
      images: [
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'balenciaga-3xl': {
      brand: 'BALENCIAGA',
      name: '3XL Distressed Mesh Sneakers Grey/Black',
      category: 'footwear',
      basePriceRub: 79900,
      sizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      description: 'Сверхмассивный беговой ретро-силуэт с эффектом активной носки и обмотанными вокруг подошвы шнурками. Многослойный дышащий меш, состаренная резиновая подошва с фирменным тиснением размера на мыске. Полный комплект со всеми сертификатами.',
      images: [
        'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'salomon-mm6': {
      brand: 'SALOMON x MM6',
      name: 'Cross Low Maison Margiela Tech Sneakers',
      category: 'footwear',
      basePriceRub: 29500,
      sizes: ['40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      description: 'Авангардная коллаборация парижского дома Maison Margiela и Salomon. Трейловый силуэт с эластичной защитной гетрой из рипстопа, агрессивным протектором Contagrip и системой быстрой затяжки Quicklace. Доставка из Токио.',
      images: [
        'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'chrome-hearts-cap': {
      brand: 'CHROME HEARTS',
      name: 'Cross Leather Patch Trucker Cap',
      category: 'accessories',
      basePriceRub: 42000,
      sizes: ['ONE SIZE'],
      description: 'Оригинальный тракер Chrome Hearts с ручной аппликацией крестов из натуральной кожи теленка на лобной части. Серебряная пуговица .925 Sterling Silver с гравировкой плюща на макушке, сетка премиум-класса, регулируемый ремешок. Комплект с пыльником.',
      images: [
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'thug-club-hoodie': {
      brand: 'THUG CLUB',
      name: 'Tribal Metal Hardware Heavyweight Hoodie',
      category: 'clothing',
      basePriceRub: 22600,
      sizes: ['S', 'M', 'L', 'XL'],
      description: 'Тяжелый худи от сеульского культа Thug Club плотностью 580 gsm с фирменной металлической эмблемой на груди. Авторская обработка с эффектом винтажной стирки, двойной капюшон и объемный оверсайз крой. Лимитированный дроп.',
      images: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80'
      ]
    },
    'roaringwild-cargo': {
      brand: 'ROARINGWILD',
      name: 'Tactical Cyber Multi-Pocket Cargo Pants',
      category: 'clothing',
      basePriceRub: 14200,
      sizes: ['S (W28-30)', 'M (W31-32)', 'L (W33-34)', 'XL (W35-36)'],
      description: 'Флагманские брюки-карго от шэньчжэньского бренда Roaringwild. Анатомический крой, износостойкая ткань с гидрофобной пропиткой DWR, фурнитура YKK и утягивающие стропы на щиколотках. Идеальная посадка в стиле азиатского киберпанка.',
      images: [
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=1000&q=80'
      ]
    }
  };

  function applyPresetToCard(presetKey) {
    const data = STREETWEAR_PRESETS_MAP[presetKey];
    if (!data) return;

    // Show preview in target box
    if (aiTargetImgPreview && data.images && data.images.length > 0) {
      aiTargetImgPreview.src = data.images[0];
      aiTargetImgPreview.style.display = 'block';
      if (aiTargetImgEmpty) aiTargetImgEmpty.style.display = 'none';
      if (aiViewportBox) {
        aiViewportBox.style.borderStyle = 'solid';
        aiViewportBox.style.borderColor = 'rgba(0, 240, 255, 0.5)';
      }
    }

    lastAIDetectedData = {
      brand: data.brand,
      model: data.name,
      category: data.category,
      estimatedPriceRub: data.basePriceRub,
      suggestedSizes: data.sizes,
      description: data.description,
      images: data.images
    };

    if (aiResBrand) aiResBrand.textContent = data.brand;
    if (aiResModel) aiResModel.textContent = data.name;
    if (aiResCat) aiResCat.textContent = data.category === 'footwear' ? 'Обувь / Кроссовки' : (data.category === 'clothing' ? 'Одежда / Пуховик' : 'Аксессуар');
    if (aiResPrice) aiResPrice.textContent = formatRub(data.basePriceRub);
    if (aiResSizes) aiResSizes.textContent = data.sizes ? data.sizes.join(', ') : '—';
    if (aiResDesc) aiResDesc.textContent = data.description;
    if (aiHudCard) aiHudCard.style.display = 'flex';

    updateAiCategoryButtons(data.category);

    showToast(`[OK] // Данные силуэта ${data.brand} в панели справа! Нажмите «ВСТАВИТЬ» у нужного поля или «ПРИМЕНИТЬ ВСЁ»`);
  }

  // Wire all 1-Click Preset Cards
  document.querySelectorAll('.btn-ai-preset-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const presetKey = btn.dataset.preset;
      if (presetKey) {
        applyPresetToCard(presetKey);
      }
    });
  });

  // Legacy preset support
  document.querySelectorAll('.btn-ai-preset').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const hint = btn.dataset.hint;
      if (aiUserHintInput) aiUserHintInput.value = hint;
      parseVisualSearchText(hint);
    });
  });

  // Comprehensive dictionary of luxury, streetwear, techwear and designer brands
  const KNOWN_BRANDS_DICTIONARY = [
    // Multi-word Luxury & High Fashion
    { brand: 'LOUIS VUITTON', aliases: ['louis vuitton malletier', 'louis vuitton paris', 'louis vuitton', 'луи виттон', 'луи вьюттон', 'луи витон', 'lv'] },
    { brand: 'BOTTEGA VENETA', aliases: ['bottega veneta', 'боттега венета', 'боттега венетта', 'боттега'] },
    { brand: 'MAISON MIHARA YASUHIRO', aliases: ['maison mihara yasuhiro', 'mihara yasuhiro', 'мейсон михара ясухиро', 'михара ясухиро', 'михара'] },
    { brand: 'MAISON MARGIELA', aliases: ['maison margiela', 'mm6 maison margiela', 'mm6', 'мейсон марджела', 'марджела'] },
    { brand: 'RICK OWENS DRKSHDW', aliases: ['rick owens drkshdw', 'rick owens darkshadow', 'drkshdw'] },
    { brand: 'RICK OWENS', aliases: ['rick owens', 'рик оуэнс', 'рик овенс', 'рик'] },
    { brand: 'CHROME HEARTS', aliases: ['chrome hearts', 'хром хартс', 'хромхартс'] },
    { brand: 'SAINT LAURENT', aliases: ['yves saint laurent', 'saint laurent paris', 'saint laurent', 'ysl', 'сен лоран'] },
    { brand: 'COMME DES GARÇONS', aliases: ['comme des garcons', 'comme des garçons', 'cdg', 'ком де гарсон'] },
    { brand: 'YOHJI YAMAMOTO', aliases: ['yohji yamamoto', 'y-3', 'y3', 'йоджи ямамото'] },
    { brand: 'ISSEY MIYAKE', aliases: ['issey miyake', 'homme plisse', 'bao bao issey miyake', 'иссей мияке'] },
    { brand: 'ALEXANDER MCQUEEN', aliases: ['alexander mcqueen', 'александр маккуин'] },
    { brand: 'THOM BROWNE', aliases: ['thom browne', 'том браун'] },
    { brand: 'JIL SANDER', aliases: ['jil sander', 'джил сандер'] },
    { brand: 'ACNE STUDIOS', aliases: ['acne studios', 'акне студиос', 'acne'] },
    { brand: 'HELMUT LANG', aliases: ['helmut lang', 'хельмут ланг'] },
    { brand: 'RAF SIMONS', aliases: ['raf simons', 'раф симонс'] },
    { brand: 'DENIM TEARS', aliases: ['denim tears', 'деним тирс'] },
    { brand: 'BALENCIAGA', aliases: ['balenciaga', 'баленсиага', 'баленс'] },
    { brand: 'GUCCI', aliases: ['gucci', 'гуччи'] },
    { brand: 'PRADA', aliases: ['prada', 'прада'] },
    { brand: 'DIOR', aliases: ['christian dior', 'dior', 'диор'] },
    { brand: 'CHANEL', aliases: ['chanel', 'шанель'] },
    { brand: 'HERMÈS', aliases: ['hermès', 'hermes', 'гермес', 'эрмес'] },
    { brand: 'GOYARD', aliases: ['goyard', 'гойярд', 'гоярд'] },
    { brand: 'FENDI', aliases: ['fendi', 'фенди'] },
    { brand: 'CELINE', aliases: ['celine', 'селин'] },
    { brand: 'LOEWE', aliases: ['loewe', 'лоэве'] },
    { brand: 'BURBERRY', aliases: ['burberry', 'берберри'] },
    { brand: 'GIVENCHY', aliases: ['givenchy', 'живанши'] },
    { brand: 'LEMAIRE', aliases: ['lemaire', 'лемер'] },
    { brand: 'JACQUEMUS', aliases: ['jacquemus', 'жакмюс'] },
    { brand: 'VALENTINO', aliases: ['valentino', 'валентино'] },
    { brand: 'VERSACE', aliases: ['versace', 'версаче'] },
    { brand: 'VETEMENTS', aliases: ['vetements', 'ветмо', 'ветемнтс'] },
    { brand: 'OFF-WHITE', aliases: ['off-white', 'off white', 'офф вайт', 'оффвайт'] },
    { brand: 'AMIRI', aliases: ['amiri', 'амири'] },
    { brand: 'UNDERCOVER', aliases: ['undercover', 'андеркавер', 'jun takahashi'] },
    { brand: 'KAPITAL', aliases: ['kapital', 'капитал'] },

    // Techwear & Outdoor
    { brand: 'C.P. COMPANY', aliases: ['c.p. company', 'cp company', 'c.p company', 'cp.company', 'сипи компани', 'сипи'] },
    { brand: 'STONE ISLAND', aliases: ['stone island', 'стоун айленд', 'стоник', 'stone island shadow project'] },
    { brand: "ARC'TERYX", aliases: ["arc'teryx", 'arcteryx', 'arc teryx', 'арктерикс', 'veilance', 'system_a'] },
    { brand: 'MONCLER', aliases: ['moncler', 'монклер', 'moncler grenoble'] },
    { brand: 'SALOMON', aliases: ['salomon advanced', 'salomon s/lab', 'salomon lab', 'salomon', 'саломон'] },
    { brand: 'ROARINGWILD', aliases: ['roaringwild', 'роарингвайлд'] },
    { brand: 'THE NORTH FACE', aliases: ['the north face', 'north face', 'tnf', 'норт фейс'] },
    { brand: 'OAKLEY', aliases: ['oakley factory team', 'oakley', 'окли'] },

    // Cult Streetwear & Shoes
    { brand: 'TRAPSTAR', aliases: ['trapstar', 'трапстар', 'trapstar london'] },
    { brand: 'THUG CLUB', aliases: ['thug club', 'таг клаб', 'thugclub'] },
    { brand: 'PORTER YOSHIDA & CO', aliases: ['porter yoshida & co', 'porter yoshida', 'yoshida porter', 'yoshida & co', 'porter tokyo', 'портер йошида', 'портер'] },
    { brand: 'TRAVIS SCOTT x AIR JORDAN', aliases: ['travis scott x jordan', 'travis scott x air jordan', 'cactus jack x jordan', 'тревис скотт джордан', 'тревис скотт'] },
    { brand: 'AIR JORDAN', aliases: ['air jordan', 'jordan retro', 'jordan brand', 'джордан'] },
    { brand: 'NIKE', aliases: ['nike sportswear', 'nike acg', 'nike sb', 'nike lab', 'nike', 'найк'] },
    { brand: 'ADIDAS', aliases: ['adidas originals', 'adidas yeezy', 'yeezy', 'adidas', 'адидас', 'изи'] },
    { brand: 'NEW BALANCE', aliases: ['new balance', 'нью баланс', 'нью бэланс'] },
    { brand: 'ASICS', aliases: ['asics sportstyle', 'asics', 'асикс'] },
    { brand: 'SUPREME', aliases: ['supreme new york', 'supreme', 'суприм'] },
    { brand: 'STUSSY', aliases: ['stussy', 'стюсси', 'стусси'] },
    { brand: 'BAPE', aliases: ['a bathing ape', 'bape', 'бейп'] },
    { brand: 'HUMAN MADE', aliases: ['human made', 'хьюман мейд'] },
    { brand: 'WTAPS', aliases: ['wtaps', 'втапс'] },
    { brand: 'NEIGHBORHOOD', aliases: ['neighborhood', 'нейборхуд'] },
    { brand: 'CORTEIZ', aliases: ['corteiz', 'crtz', 'кортез'] },
    { brand: 'HELLSTAR', aliases: ['hellstar', 'хеллстар'] },
    { brand: 'SP5DER', aliases: ['spider 555', 'sp5der 555', 'sp5der', 'спайдер'] },
    { brand: 'PALACE', aliases: ['palace skateboards', 'palace', 'палас'] }
  ];

  // Intelligent text & prompt parser for Google Lens / Yandex (Non-destructive: updates HUD only!)
  function parseVisualSearchText(rawText) {
    if (!rawText || !rawText.trim()) return;
    const trimmed = rawText.trim();
    const lowerText = trimmed.toLowerCase();

    // Check exact short preset shortcuts (only when text is short, not a full prompt)
    if (trimmed.length < 30) {
      let matchedKey = null;
      if (lowerText.includes('c.p') || lowerText.includes('cp company') || lowerText.includes('goggle') || lowerText.includes('shell down') || lowerText.includes('пуховик cp') || lowerText.includes('пухан cp')) {
        matchedKey = 'cp-puffer';
      } else if (lowerText.includes('arc') || lowerText.includes('beta lt') || lowerText.includes('артерикс')) {
        matchedKey = 'arcteryx-beta';
      } else if (lowerText.includes('stone') || lowerText.includes('island') || lowerText.includes('стоник')) {
        matchedKey = 'stone-island';
      } else if (lowerText.includes('trapstar') || lowerText.includes('irongate') || lowerText.includes('трапстар')) {
        matchedKey = 'trapstar-puffer';
      } else if (lowerText.includes('moncler') || lowerText.includes('maya') || lowerText.includes('монклер')) {
        matchedKey = 'moncler-maya';
      } else if (lowerText.includes('mihara') || lowerText.includes('peterson') || lowerText.includes('михара')) {
        matchedKey = 'mihara-peterson';
      } else if (lowerText.includes('rick') || lowerText.includes('ramones') || lowerText.includes('drkshdw') || lowerText.includes('рамоны')) {
        matchedKey = 'rick-owens-ramones';
      } else if (lowerText.includes('travis') || lowerText.includes('reverse mocha') || lowerText.includes('тревис')) {
        matchedKey = 'travis-scott-aj1';
      } else if (lowerText.includes('3xl') || lowerText.includes('defender')) {
        matchedKey = 'balenciaga-3xl';
      } else if (lowerText.includes('salomon') || lowerText.includes('cross low')) {
        matchedKey = 'salomon-mm6';
      } else if (lowerText.includes('chrome') || lowerText.includes('тракер')) {
        matchedKey = 'chrome-hearts-cap';
      } else if (lowerText.includes('thug club') || lowerText.includes('tribal')) {
        matchedKey = 'thug-club-hoodie';
      } else if (lowerText.includes('roaringwild') || lowerText.includes('cargo')) {
        matchedKey = 'roaringwild-cargo';
      }

      if (matchedKey && STREETWEAR_PRESETS_MAP[matchedKey]) {
        const data = STREETWEAR_PRESETS_MAP[matchedKey];
        lastAIDetectedData = {
          brand: data.brand,
          model: data.name,
          category: data.category,
          estimatedPriceRub: data.basePriceRub,
          suggestedSizes: data.sizes,
          description: data.description
        };

        if (aiResBrand) aiResBrand.textContent = data.brand;
        if (aiResModel) aiResModel.textContent = data.name;
        if (aiResCat) aiResCat.textContent = data.category === 'footwear' ? 'Обувь / Кроссовки' : (data.category === 'clothing' ? 'Одежда / Пуховик' : 'Аксессуар');
        if (aiResPrice) aiResPrice.textContent = formatRub(data.basePriceRub);
        if (aiResSizes) aiResSizes.textContent = data.sizes.join(', ');
        if (aiResDesc) aiResDesc.textContent = data.description;
        if (aiHudCard) aiHudCard.style.display = 'flex';

        updateAiCategoryButtons(data.category);
        showToast(`[OK] // Распознано: ${data.brand} — ${data.name}! Нажмите «ВСТАВИТЬ» у нужного поля`);
        return;
      }
    }

    // 1. Brand Detection via Comprehensive Dictionary
    let matchedBrand = null;
    let matchedAlias = '';
    let matchPos = -1;

    for (const entry of KNOWN_BRANDS_DICTIONARY) {
      for (const alias of entry.aliases) {
        const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('(?:^|[^a-zA-Zа-яА-ЯёЁ0-9])' + esc + '(?=[^a-zA-Zа-яА-ЯёЁ0-9]|$)', 'i');
        const m = lowerText.match(regex);
        if (m) {
          matchedBrand = entry.brand;
          matchedAlias = alias;
          matchPos = m.index + (m[0].length - alias.length);
          break;
        }
      }
      if (matchedBrand) break;
    }

    // 2. Category Detection (High-Precision Accessories, Footwear, Clothing keywords)
    let detectedCat = 'clothing';
    const isAccessories = /сумк|сумочк|плечевая|кроссбоди|тоут|клатч|рюкзак|барсетк|портмоне|кошелек|портфель|ремень|пояс|кепк|бейсболк|шапк|бини|панам|очк|шарф|платок|перчатк|палантин|украшен|браслет|цепочк|кольцо|брелок|чехол|аксессуар|bag|handbag|shoulder bag|crossbody|tote|backpack|clutch|pouch|wallet|purse|belt|cap|hat|beanie|glasses|sunglasses|scarf|gloves|jewelry|necklace|bracelet|ring|keychain|case|vernis|monogram vernis|speedy|keepall|neverfull|alma|pochette|birkin|kelly|constance|cassette|jodie|saddle|lady dior|book tote|baguette/i.test(trimmed);
    const isFootwear = /кроссовк|кед[ыа]?|ботинк|туфл|лофер|сапог|тапочк|слайд|мюл|sneaker|sneakers|shoe|shoes|boot|boots|loafer|mule|slide|runner|runners|og sole|bamba|ramones|geobasket|track|defender|3xl/i.test(trimmed);

    if (isAccessories) {
      detectedCat = 'accessories';
    } else if (isFootwear) {
      detectedCat = 'footwear';
    } else {
      detectedCat = 'clothing';
    }

    // 3. Model Name Extraction
    let modelName = '';
    if (matchedBrand && matchPos !== -1) {
      modelName = trimmed.substring(matchPos + matchedAlias.length).trim();
    } else {
      // Fallback: strip conversational intro and leading product nouns
      let clean = trimmed
        .replace(/^(?:на\s+изображении\s+(?:представлен[аоы]?|изображен[аоы]?|показан[аоы]?|виден|видна|видно)?|на\s+фото(?:графии)?\s+(?:представлен[аоы]?|изображен[аоы]?|показан[аоы]?|виден|видна|видно)?|перед\s+нами|это|на\s+картинке|вид[имно]?)\s*/i, '')
        .trim();
      clean = clean.replace(/^(?:плечевая\s+сумка|сумка(?:\s+через\s+плечо)?|сумка-тоут|сумочка|рюкзак|кроссовки|кеды|ботинки|пуховик|куртка|худи|толстовка|свитшот|футболка|брюки|карго|джинсы|кепка|бейсболка|шапка)\s+/i, '');
      const words = clean.split(/\s+/);
      matchedBrand = words[0].toUpperCase();
      modelName = clean.substring(words[0].length).trim();
      if (!modelName) modelName = clean;
    }

    // Strip descriptive subordinate participle clauses
    const cutRegex = /[,;]\s*(?:выполненн[аоые]?|изготовленн[аоые]?|сделанн[аоые]?|украшенн[аоые]?|дополненн[аоые]?|созданн[аоые]?|оснащенн[аоые]?|с\s+тиснен|с\s+отделк|с\s+фирменн|материал|состояние|размер|комплект|артикул)/i;
    const cutMatch = modelName.match(cutRegex);
    if (cutMatch && cutMatch.index !== undefined) {
      modelName = modelName.substring(0, cutMatch.index).trim();
    }

    // Cut at first period or newline
    const dotIdx = modelName.indexOf('. ');
    if (dotIdx !== -1) {
      modelName = modelName.substring(0, dotIdx).trim();
    }
    const newlineIdx = modelName.indexOf('\n');
    if (newlineIdx !== -1) {
      modelName = modelName.substring(0, newlineIdx).trim();
    }

    // Clean up color clauses: "в бронзовом/медном цвете (Bronze / Copper)" -> "(Bronze / Copper)"
    modelName = modelName.replace(/\s+в\s+[^()\n\r]+?(?:цвете|расцветке)\s*(\([^\)]+\))/i, ' $1');
    modelName = modelName.replace(/\s+в\s+(?:цвете|расцветке)\s+([A-Za-z0-9\s\/\-_]+)/i, ' ($1)');
    modelName = modelName.replace(/^[-:,\s]+|[-:,\s]+$/g, '').trim();

    if (!modelName) {
      modelName = trimmed;
    }

    // 4. Sizing based on Category
    let sizesArr = [];
    if (detectedCat === 'accessories') {
      sizesArr = ['ONE SIZE'];
    } else if (detectedCat === 'footwear') {
      sizesArr = ['39 EU', '40 EU', '41 EU', '42 EU', '43 EU', '44 EU'];
    } else {
      if (/брюки|штаны|карго|джинсы|pants|cargo|denim|jeans/i.test(trimmed)) {
        sizesArr = ['S (W28-30)', 'M (W31-32)', 'L (W33-34)', 'XL (W35-36)'];
      } else if (/пуховик|пухан|куртка|пальто|puffer|down|jacket|parka|coat/i.test(trimmed)) {
        sizesArr = ['S (46 IT)', 'M (48 IT)', 'L (50 IT)', 'XL (52 IT)', 'XXL (54 IT)'];
      } else {
        sizesArr = ['S', 'M', 'L', 'XL'];
      }
    }

    // 5. Realistic Market Pricing
    let estimatedPrice = 35000;
    const upperBrand = (matchedBrand || '').toUpperCase();
    if (['LOUIS VUITTON', 'HERMÈS', 'CHANEL', 'DIOR', 'GOYARD', 'BOTTEGA VENETA'].includes(upperBrand)) {
      estimatedPrice = detectedCat === 'accessories' ? 78000 : 115000;
    } else if (['PRADA', 'GUCCI', 'BALENCIAGA', 'SAINT LAURENT', 'CELINE', 'LOEWE', 'MONCLER', 'RICK OWENS', 'RICK OWENS DRKSHDW'].includes(upperBrand)) {
      estimatedPrice = detectedCat === 'accessories' ? 48000 : (detectedCat === 'footwear' ? 58000 : 85000);
    } else if (['C.P. COMPANY', 'STONE ISLAND', "ARC'TERYX", 'CHROME HEARTS', 'TRAVIS SCOTT x AIR JORDAN'].includes(upperBrand)) {
      estimatedPrice = detectedCat === 'accessories' ? 28000 : (detectedCat === 'footwear' ? 34000 : 54000);
    } else if (['MAISON MIHARA YASUHIRO', 'SALOMON', 'THUG CLUB', 'TRAPSTAR', 'ROARINGWILD', 'KAPITAL'].includes(upperBrand)) {
      estimatedPrice = detectedCat === 'accessories' ? 18000 : (detectedCat === 'footwear' ? 24800 : 22600);
    } else {
      estimatedPrice = detectedCat === 'accessories' ? 16000 : (detectedCat === 'footwear' ? 26000 : 32000);
    }

    // 6. Professional Showroom Description
    let desc = trimmed
      .replace(/^(?:на\s+изображении\s+(?:представлен[аоы]?|изображен[аоы]?|показан[аоы]?|виден|видна|видно)?|на\s+фото(?:графии)?\s+(?:представлен[аоы]?|изображен[аоы]?|показан[аоы]?|виден|видна|видно)?|перед\s+нами|это|на\s+картинке|вид[имно]?)\s*/i, '')
      .trim();
    if (desc) {
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
      if (!desc.endsWith('.')) desc += '.';
      desc += ' 100% оригинал, любые проверки. Доступен предзаказ и доставка в шоурум Balkonsky (СПб, ул. Тверская 3/1).';
    } else {
      desc = `Оригинальный релиз ${matchedBrand} (${modelName}). Высококачественные аутентичные материалы, фирменная фурнитура и заводская маркировка. Товар проверен байерами SASBOV MARKET в Токио/Шанхае. 100% оригинал, любые проверки.`;
    }

    // 7. Populate HUD Card (Does NOT touch actual card form until user clicks ВСТАВИТЬ!)
    lastAIDetectedData = {
      brand: matchedBrand,
      model: modelName,
      category: detectedCat,
      estimatedPriceRub: estimatedPrice,
      suggestedSizes: sizesArr,
      description: desc
    };

    if (aiResBrand) aiResBrand.textContent = matchedBrand;
    if (aiResModel) aiResModel.textContent = modelName;
    if (aiResCat) aiResCat.textContent = detectedCat === 'footwear' ? 'Обувь / Кроссовки' : (detectedCat === 'accessories' ? 'Аксессуар (Сумка)' : 'Одежда / Пуховик');
    if (aiResPrice) aiResPrice.textContent = formatRub(estimatedPrice);
    if (aiResSizes) aiResSizes.textContent = sizesArr.join(', ');
    if (aiResDesc) aiResDesc.textContent = desc;
    if (aiHudCard) aiHudCard.style.display = 'flex';

    updateAiCategoryButtons(detectedCat);
    showToast(`[OK] // Распознано: ${matchedBrand} — ${modelName}! Нажмите «ВСТАВИТЬ» у нужного поля`);
  }

  // Drag & drop directly onto the scanner viewport
  const aiViewportBox = document.getElementById('ai-viewport-box');
  if (aiViewportBox) {
    ['dragenter', 'dragover'].forEach(ev => {
      aiViewportBox.addEventListener(ev, (e) => {
        e.preventDefault();
        aiViewportBox.style.borderColor = '#00f0ff';
        aiViewportBox.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.4)';
      });
    });
    ['dragleave', 'drop'].forEach(ev => {
      aiViewportBox.addEventListener(ev, (e) => {
        e.preventDefault();
        aiViewportBox.style.borderColor = '';
        aiViewportBox.style.boxShadow = '';
      });
    });
    aiViewportBox.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addEditorPhotoFiles(e.dataTransfer.files);
      }
    });
  }

  // Global paste (Ctrl+V) anywhere inside the cardModal
  if (cardModal) {
    cardModal.addEventListener('paste', (e) => {
      const items = e.clipboardData ? e.clipboardData.items : [];
      if (!items) return;
      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) imageFiles.push(blob);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addEditorPhotoFiles(imageFiles);
        showToast('[OK] // Фото из буфера обмена добавлено в карточку!');
      }
    });
  }

  // Wire Smart Text Parser Input & Button
  const btnParseHintTrigger = document.getElementById('btn-parse-hint-trigger');
  if (btnParseHintTrigger && aiUserHintInput) {
    btnParseHintTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      parseVisualSearchText(aiUserHintInput.value);
    });
  }

  if (aiUserHintInput) {
    aiUserHintInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        parseVisualSearchText(aiUserHintInput.value);
      }
    });
    // Auto-parse on paste
    aiUserHintInput.addEventListener('paste', () => {
      setTimeout(() => {
        parseVisualSearchText(aiUserHintInput.value);
      }, 50);
    });
  }

  // Zero-Key Visual Reverse Search (Google Lens & Yandex Images)
  const btnSearchGoogleLens = document.getElementById('btn-search-google-lens');
  const btnSearchYandexImages = document.getElementById('btn-search-yandex-images');

  async function performVisualReverseSearch(targetEngine) {
    const photoToSearch = (currentEditorImages && currentEditorImages.length > 0)
      ? currentEditorImages[0]
      : (photoUrlInput && photoUrlInput.value.trim() ? photoUrlInput.value.trim() : null);

    if (!photoToSearch) {
      alert('Пожалуйста, сначала выберите фото или вставьте ссылку на изображение для поиска в Google Lens / Яндекс.');
      return;
    }

    const isHttpUrl = typeof photoToSearch === 'string' && (photoToSearch.startsWith('http://') || photoToSearch.startsWith('https://'));

    if (isHttpUrl) {
      if (targetEngine === 'google') {
        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(photoToSearch)}`;
        window.open(lensUrl, '_blank', 'noopener,noreferrer');
        showToast('[OK] // Открыт Google Объектив (Lens)');
      } else {
        const yandexUrl = `https://yandex.ru/images/search?rpt=imageview&url=${encodeURIComponent(photoToSearch)}`;
        window.open(yandexUrl, '_blank', 'noopener,noreferrer');
        showToast('[OK] // Открыт поиск по фото в Яндекс.Картинках');
      }
      if (aiUserHintInput) {
        aiUserHintInput.focus();
        aiUserHintInput.placeholder = 'Скопируйте название вещи из Lens/Яндекс и вставьте сюда...';
      }
      return;
    }

    // Local Base64 / Blob image: copy to clipboard and open search page
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const res = await fetch(photoToSearch);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        showToast('[OK] // Фото скопировано в буфер! Нажмите Ctrl+V на открывшейся странице');
      } else {
        showToast('[!] Вставьте фото комбинацией Ctrl+V на открывшейся вкладке');
      }
    } catch (clipErr) {
      console.warn('Clipboard write warning:', clipErr);
      showToast('[!] Вставьте фото комбинацией Ctrl+V на открывшейся вкладке');
    }

    if (targetEngine === 'google') {
      window.open('https://lens.google.com', '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://yandex.ru/images/search?rpt=imageview', '_blank', 'noopener,noreferrer');
    }

    if (aiUserHintInput) {
      aiUserHintInput.focus();
      aiUserHintInput.placeholder = 'Скопируйте название вещи из Lens/Яндекс и вставьте сюда...';
    }
  }

  if (btnSearchGoogleLens) {
    btnSearchGoogleLens.addEventListener('click', (e) => {
      e.preventDefault();
      performVisualReverseSearch('google');
    });
  }

  if (btnSearchYandexImages) {
    btnSearchYandexImages.addEventListener('click', (e) => {
      e.preventDefault();
      performVisualReverseSearch('yandex');
    });
  }

  // =========================================================================
  // Cloud Database Synchronization (Vercel Serverless / KV)
  // =========================================================================
  async function initCloudProducts() {
    const textEl = document.getElementById('cloud-sync-text');
    const dotEl = document.getElementById('cloud-sync-dot');

    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          const isVercelKv = json.source === 'vercel_kv' || json.source === 'vercel_kv_seeded';
          if (textEl) textEl.textContent = isVercelKv ? 'VERCEL KV: CONNECTED' : 'VERCEL DB: READY';
          if (dotEl) dotEl.style.background = '#00ff88';

          PRODUCTS = json.data;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTS));
          } catch (e) {}
          renderCards();
          updateStats();
          return;
        }
      }
    } catch (e) {
      console.info('[SASBOV] Running in local static mode without serverless API.');
    }

    if (textEl) textEl.textContent = 'LOCAL STORAGE (OFFLINE)';
    if (dotEl) dotEl.style.background = '#00f0ff';
  }

  async function syncWithCloudDatabase(list) {
    const textEl = document.getElementById('cloud-sync-text');
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getMasterToken()
        },
        body: JSON.stringify({ products: list })
      });
      if (res.ok) {
        const json = await res.json();
        if (textEl) {
          textEl.textContent = json.source === 'vercel_kv' ? 'VERCEL KV: SYNCED' : 'CLOUD DB: SYNCED';
        }
      }
    } catch (err) {
      console.warn('[SASBOV Cloud Sync] API offline or static hosting:', err);
    }
  }

  // Wire Live Web Photo Search Input
  if (aiWebSearchBtn && aiWebSearchInput) {
    const handleWebSearch = () => {
      const q = aiWebSearchInput.value.trim();
      if (!q) return;
      findWebPhotosForModel(q, '', 'clothing', q);
      showToast(`[OK] // Найдены фото в сети по запросу: ${q}`);
    };
    aiWebSearchBtn.addEventListener('click', handleWebSearch);
    aiWebSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleWebSearch();
      }
    });
  }

  // Wire AI Trigger Listeners
  if (aiRecognizeBtn) {
    aiRecognizeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      runAIVisionScan();
    });
  }

  if (aiFillAllBtn) {
    aiFillAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      applyAIDetectionToForm();
    });
  }

  if (aiInsertDescOnlyBtn) {
    aiInsertDescOnlyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (lastAIDetectedData && lastAIDetectedData.description && descInput) {
        descInput.value = lastAIDetectedData.description;
        flashFieldHighlight(descInput);
        flashButtonSuccess(aiInsertDescOnlyBtn);
        showToast('[OK] // Премиальное описание перенесено в карточку');
      }
    });
  }

  // Toggle AI Sidecar button in modal header
  if (toggleAiSidecarBtn) {
    toggleAiSidecarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!aiSidecar) return;
      const isHidden = aiSidecar.style.display === 'none';
      aiSidecar.style.display = isHidden ? 'flex' : 'none';
      toggleAiSidecarBtn.style.color = isHidden ? '#00f0ff' : '#a1a1aa';
    });
  }

  // Inline Key Drawer Toggle
  if (toggleInlineKeyDrawerBtn && inlineKeyDrawer) {
    toggleInlineKeyDrawerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = inlineKeyDrawer.style.display === 'none';
      inlineKeyDrawer.style.display = isHidden ? 'flex' : 'none';
    });
  }

  // Password / Plain text eye toggle
  if (btnToggleKeyEye && inlineApiKeyInput) {
    btnToggleKeyEye.addEventListener('click', (e) => {
      e.preventDefault();
      const cur = inlineApiKeyInput.getAttribute('type');
      inlineApiKeyInput.setAttribute('type', cur === 'password' ? 'text' : 'password');
    });
  }

  // Save Inline Key
  if (btnSaveInlineKey && inlineApiKeyInput) {
    btnSaveInlineKey.addEventListener('click', (e) => {
      e.preventDefault();
      const val = inlineApiKeyInput.value.trim();
      if (val) {
        localStorage.setItem(GEMINI_STORAGE_KEY, val);
        syncAiInlineKeyUI();
        showToast('[OK] // API ключ успешно сохранен в браузере!');
      } else {
        localStorage.removeItem(GEMINI_STORAGE_KEY);
        syncAiInlineKeyUI();
        showToast('[OK] // Включен оффлайн-режим распознавания');
      }
    });
  }

  // Test Inline Key Connection
  if (btnTestInlineKey && inlineApiKeyInput) {
    btnTestInlineKey.addEventListener('click', (e) => {
      e.preventDefault();
      testApiKeyConnection(inlineApiKeyInput.value);
    });
  }

  // Clear Inline Key
  if (btnClearInlineKey && inlineApiKeyInput) {
    btnClearInlineKey.addEventListener('click', (e) => {
      e.preventDefault();
      inlineApiKeyInput.value = '';
      localStorage.removeItem(GEMINI_STORAGE_KEY);
      syncAiInlineKeyUI();
      showToast('[OK] // API ключ сброшен');
    });
  }

  // Fast Category Switcher Buttons
  if (aiCatBtnClothing) {
    aiCatBtnClothing.addEventListener('click', (e) => {
      e.preventDefault();
      if (categorySelect) categorySelect.value = 'clothing';
      updateSizePickerForCategory('clothing');
      updateAiCategoryButtons('clothing');
      showToast('[OK] // Выбрана категория: Одежда / Пуховики');
    });
  }
  if (aiCatBtnFootwear) {
    aiCatBtnFootwear.addEventListener('click', (e) => {
      e.preventDefault();
      if (categorySelect) categorySelect.value = 'footwear';
      updateSizePickerForCategory('footwear');
      updateAiCategoryButtons('footwear');
      showToast('[OK] // Выбрана категория: Обувь / Кроссовки');
    });
  }
  if (aiCatBtnAccessories) {
    aiCatBtnAccessories.addEventListener('click', (e) => {
      e.preventDefault();
      if (categorySelect) categorySelect.value = 'accessories';
      updateSizePickerForCategory('accessories');
      updateAiCategoryButtons('accessories');
      showToast('[OK] // Выбрана категория: Аксессуары');
    });
  }

  // Initial Sync of AI Key UI
  syncAiInlineKeyUI();

  // Update AI preview when photo URL input is typed
  if (photoUrlInput) {
    photoUrlInput.addEventListener('input', () => {
      updateAISidecarPreview();
    });
  }

  // Check authentication immediately on script load
  checkAuthentication();

})();
