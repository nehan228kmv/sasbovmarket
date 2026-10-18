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

  const copySecretLinkBtn = document.getElementById('copy-secret-link-btn');
  const changeTokenBtn = document.getElementById('change-master-token-btn');
  const logoutBtn = document.getElementById('logout-admin-btn');

  function checkAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token') || urlParams.get('key') || urlParams.get('auth');
    const validToken = getMasterToken();

    // 1. Check if valid token is provided in URL
    if (tokenFromUrl && tokenFromUrl.trim() === validToken.trim()) {
      sessionStorage.setItem(AUTH_SESSION_KEY, '1');
      unlockDashboard(false);
      showToast('[OK] // Вход по секретной ссылке выполнен успешно');
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

  if (copySecretLinkBtn) {
    copySecretLinkBtn.addEventListener('click', () => {
      const token = getMasterToken();
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const secretUrl = `${origin}${pathname}?token=${encodeURIComponent(token)}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(secretUrl).then(() => {
          showToast('[OK] // Секретная ссылка с токеном скопирована!');
        }).catch(() => {
          prompt('Ваша секретная ссылка для прямого входа:', secretUrl);
        });
      } else {
        prompt('Ваша секретная ссылка для прямого входа:', secretUrl);
      }
    });
  }

  if (changeTokenBtn) {
    changeTokenBtn.addEventListener('click', () => {
      const current = getMasterToken();
      const next = prompt('Введите новый секретный мастер-токен для панели управления:', current);
      if (next && next.trim() && next.trim() !== current) {
        setMasterToken(next.trim());
        showToast('[OK] // Мастер-токен успешно изменен!');
      }
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
      region: 'japan',
      regionLabel: 'JAPAN [JP] // TOKYO ARCHIVE',
      category: 'footwear',
      sku: 'MMY-PET-904',
      basePriceRub: 24800,
      sizes: ['39 EU', '40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'jp',
      closingIn: '03 дн. 16:45',
      image: null,
      images: []
    },
    {
      id: 'sasbov-02',
      brand: 'KAPITAL',
      name: '14oz Denim Bone Embroidered Jacket',
      region: 'japan',
      regionLabel: 'JAPAN [JP] // KOJIMA ARCHIVE',
      category: 'clothing',
      sku: 'KAP-BONE-14OZ',
      basePriceRub: 42500,
      sizes: ['1 (S)', '2 (M)', '3 (L)', '4 (XL)'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'jp',
      closingIn: '01 дн. 08:20',
      image: null,
      images: []
    },
    {
      id: 'sasbov-03',
      brand: 'ROARINGWILD',
      name: 'Modular Waterproof Tech Shell Parka',
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
      region: 'japan',
      regionLabel: 'JAPAN [JP] // EBAY JP ARCHIVE',
      category: 'footwear',
      sku: 'SAL-MM6-BLK',
      basePriceRub: 32000,
      sizes: ['40.5 EU', '41.5 EU', '42 EU', '43 EU', '44 EU'],
      dropStatus: 'СКОРО ЗАКРЫТИЕ',
      badgeClass: 'jp',
      closingIn: '14 ч. 22 мин',
      image: null,
      images: []
    },
    {
      id: 'sasbov-05',
      brand: 'THUG CLUB',
      name: 'Tribal Gladiator Heavy Fleece Hoodie',
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
      region: 'japan',
      regionLabel: 'JAPAN [JP] // MERCARI JP',
      category: 'accessories',
      sku: 'POR-TNK-2WAY',
      basePriceRub: 21400,
      sizes: ['ONE SIZE (W480/H520)'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'jp',
      closingIn: '05 дн. 04:15',
      image: null,
      images: []
    },
    {
      id: 'sasbov-07',
      brand: 'ANTA x KYRIE IRVING',
      name: 'KAI 1 "Artist on Court" Special Edition',
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
    } catch (e) {
      console.error('LocalStorage save error in admin:', e);
      alert('Ошибка при сохранении в память браузера (LocalStorage переполнен).');
    }
  }

  let PRODUCTS = loadProducts();
  let currentFilter = 'all';
  let searchQuery = '';

  // Multi-Photo Gallery State for Card Editor
  let currentEditorImages = [];

  // DOM Elements
  const grid = document.getElementById('admin-cards-grid');
  const searchInput = document.getElementById('admin-search-input');
  const filterPills = document.querySelectorAll('.admin-pill');
  const statTotal = document.getElementById('stat-total-cards');
  const statJp = document.getElementById('stat-jp-cards');
  const statCn = document.getElementById('stat-cn-cards');
  const statVal = document.getElementById('stat-total-val');
  const countAll = document.getElementById('count-all');
  const countJp = document.getElementById('count-jp');
  const countCn = document.getElementById('count-cn');

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
  const regionSelect = document.getElementById('card-region-select');
  const categorySelect = document.getElementById('card-category-select');
  const priceInput = document.getElementById('card-price-input');
  const sizesInput = document.getElementById('card-sizes-input');
  const timerInput = document.getElementById('card-timer-input');
  const statusSelect = document.getElementById('card-status-select');

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

  function formatRub(num) {
    return Math.round(num).toLocaleString('ru-RU') + ' ₽';
  }

  // Update Stats & Counts
  function updateStats() {
    const total = PRODUCTS.length;
    const jpCount = PRODUCTS.filter(p => p.region === 'japan').length;
    const cnCount = PRODUCTS.filter(p => p.region === 'china').length;
    const sumVal = PRODUCTS.reduce((sum, p) => sum + (Number(p.basePriceRub) || 0), 0);

    if (statTotal) statTotal.textContent = total;
    if (statJp) statJp.textContent = jpCount;
    if (statCn) statCn.textContent = cnCount;
    if (statVal) statVal.textContent = formatRub(sumVal);

    if (countAll) countAll.textContent = total;
    if (countJp) countJp.textContent = jpCount;
    if (countCn) countCn.textContent = cnCount;
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
      const matchFilter = currentFilter === 'all' || p.region === currentFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));

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
      const isJp = item.region === 'japan';
      const isGlobal = item.region === 'global';
      const badgeCls = isJp ? 'jp' : (isGlobal ? 'global' : 'cn');
      const regionText = isJp ? 'ЯПОНИЯ [JP]' : (isGlobal ? 'GLOBAL [GLB]' : 'КИТАЙ [CN]');

      const imgs = getItemImages(item);
      const photoBadge = imgs.length > 1 ? `<span class="thumb-badge" style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.85); color: #00f0ff; border: 1px solid rgba(0,240,255,0.3); font-size: 9px;">${imgs.length} ФОТО</span>` : '';

      const thumb = imgs.length > 0 ? `
        <img src="${imgs[0]}" alt="${item.brand} ${item.name}" class="admin-card-thumb-img">
        ${photoBadge}
      ` : `
        <div class="admin-thumb-empty">НЕТ ФОТО<br><span style="font-size:0.5rem; opacity:0.6;">[СЛОТ]</span></div>
      `;

      return `
        <div class="admin-card-row" data-id="${item.id}">
          <div class="admin-card-thumb-wrap" style="position: relative;">
            ${thumb}
          </div>

          <div class="admin-card-title-col">
            <span class="admin-card-brand">${item.brand || 'БРЕНД'}</span>
            <span class="admin-card-name">${item.name || 'Название позиции'}</span>
            <span class="admin-card-sku">SKU: ${item.sku || 'N/A'} • ${item.category || 'Одежда'} • <strong>${imgs.length} фото</strong></span>
          </div>

          <div class="admin-card-meta-col">
            <span class="admin-region-badge ${badgeCls}">${regionText}</span>
            <span class="admin-card-sizes" title="${sizesStr}">Размеры: ${sizesStr || 'Универсальный'}</span>
            <span class="admin-card-sku">[EXP: ${item.closingIn || '03 дн.'}]</span>
          </div>

          <div class="admin-card-price-col">
            <span class="admin-card-price">${formatRub(item.basePriceRub || 0)}</span>
            <span class="admin-card-status-pill">● ${item.dropStatus || 'ПРЕДЗАКАЗ ОТКРЫТ'}</span>
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
  // Multi-Photo Manager in Card Editor
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
      return `
        <div class="editor-thumb-card ${isCover ? 'is-cover' : ''}" data-idx="${idx}">
          <img src="${src}" alt="Фото ${idx + 1}" class="editor-thumb-img">
          <div class="editor-thumb-overlay">
            <div class="thumb-top-row">
              <span class="thumb-badge ${isCover ? 'cover' : ''}">${isCover ? '[COVER // #1]' : '#' + (idx + 1)}</span>
              <button type="button" class="thumb-del-btn" data-del-photo="${idx}" title="Удалить это фото">&times;</button>
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
  }

  function addEditorPhotoFiles(fileList) {
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    let loaded = 0;
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        currentEditorImages.push(e.target.result);
        loaded++;
        if (loaded === validFiles.length) {
          renderEditorGallery();
          showToast(`[OK] // Добавлено ${loaded} фото в карточку`);
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

  // Open Add Card Modal
  function openAddModal() {
    editIdInput.value = '';
    cardModalTitle.textContent = 'ДОБАВЛЕНИЕ НОВОЙ КАРТОЧКИ';
    cardForm.reset();
    currentEditorImages = [];
    renderEditorGallery();
    timerInput.value = '03 дн. 18:00';
    statusSelect.value = 'ПРЕДЗАКАЗ ОТКРЫТ';
    cardModal.showModal();
  }

  // Open Edit Card Modal
  function openEditModal(id) {
    const item = PRODUCTS.find(p => p.id === id);
    if (!item) return;

    editIdInput.value = item.id;
    cardModalTitle.textContent = `РЕДАКТИРОВАНИЕ: ${item.brand}`;
    brandInput.value = item.brand || '';
    nameInput.value = item.name || '';
    regionSelect.value = item.region || 'japan';
    categorySelect.value = item.category || 'footwear';
    priceInput.value = item.basePriceRub || 20000;
    sizesInput.value = Array.isArray(item.sizes) ? item.sizes.join(', ') : (item.sizes || '');
    timerInput.value = item.closingIn || '03 дн. 18:00';
    statusSelect.value = item.dropStatus || 'ПРЕДЗАКАЗ ОТКРЫТ';

    currentEditorImages = getItemImages(item);
    renderEditorGallery();

    cardModal.showModal();
  }

  function closeCardModal() {
    if (cardModal.open) cardModal.close();
  }

  // Delete Card Object
  function deleteCard(id) {
    const item = PRODUCTS.find(p => p.id === id);
    if (!item) return;

    const confirmMsg = `УДАЛИТЬ КАРТОЧКУ ОБЪЕКТА?\n\nБренд: ${item.brand}\nМодель: ${item.name}\nЦена: ${formatRub(item.basePriceRub)}\n\nКарточка будет мгновенно удалена с Главной, из Каталога и из TikTok-ленты.`;

    if (confirm(confirmMsg)) {
      PRODUCTS = PRODUCTS.filter(p => p.id !== id);
      saveProducts(PRODUCTS);
      renderCards();
      showToast(`[OK] // Карточка «${item.brand}» удалена`);
    }
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
      const regionVal = regionSelect.value;
      const categoryVal = categorySelect.value;
      const priceVal = parseFloat(priceInput.value) || 20000;
      const sizesArray = sizesInput.value.split(',').map(s => s.trim()).filter(Boolean);
      const timerVal = timerInput.value.trim() || '03 дн. 18:00';
      const statusVal = statusSelect.value;

      const regionLabelVal = regionVal === 'japan' 
        ? 'JAPAN [JP] // TOKYO ARCHIVE' 
        : (regionVal === 'global' ? 'GLOBAL [GLB] // GRAILED ARCHIVE' : 'CHINA [CN] // POIZON & GOOFISH');
      const badgeClassVal = regionVal === 'japan' ? 'jp' : (regionVal === 'global' ? 'global' : 'cn');

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
            region: regionVal,
            regionLabel: regionLabelVal,
            category: categoryVal,
            basePriceRub: priceVal,
            sizes: sizesArray,
            closingIn: timerVal,
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
          region: regionVal,
          regionLabel: regionLabelVal,
          category: categoryVal,
          sku: newSku,
          basePriceRub: priceVal,
          sizes: sizesArray,
          closingIn: timerVal,
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

  // Check authentication immediately on script load
  checkAuthentication();

})();
