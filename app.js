/**
 * SASBOV MARKET — Application Logic & Store State
 * Features:
 * - Dynamic Drop Catalogue (China & Japan) with ready photo slots & live image uploads
 * - Full CRUD Item Management (Add, Delete, Reset in LocalStorage)
 * - TikTok / Reels Feed cross-sync
 * - Instant Filtering & Search
 * - Interactive Pre-order Modal with direct Telegram order generator
 * - Pre-order Tray (Multi-item cart)
 * - Transparent International Logistics & Currency Calculator
 * - Live World Telemetry Clocks (Tokyo, Shanghai, Moscow)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sasbov_market_products_v1';

  // Config & Exchange Rates
  const RATES = {
    CNY: 13.85, // 1 CNY to RUB (Poizon / Dewu / Goofish)
    JPY: 0.66,  // 1 JPY to RUB (Mercari JP / eBay JP / Yahoo)
    USD: 98.50, // 1 USD to RUB (Grailed / Global Archive)
    SERVICE_FEE_PCT: 0.08, // 8% Legit check + sourcing concierge fee
    INSURANCE_FEE_RUB: 500, // Fixed insurance fee
  };

  // Logistics Rates per Category
  const LOGISTICS_RATES = {
    shoes: { weightKg: 1.6, expressRub: 2400, standardRub: 1600 },
    hoodie: { weightKg: 0.9, expressRub: 1500, standardRub: 1000 },
    jacket: { weightKg: 1.8, expressRub: 2700, standardRub: 1800 },
    tshirt: { weightKg: 0.35, expressRub: 900, standardRub: 600 },
    accessories: { weightKg: 0.45, expressRub: 1100, standardRub: 750 }
  };

  // Curated Default Drops (Japan, China, Global Archives)
  // Curated Default Drops (Japan, China, Global Archives)
  const DEFAULT_PRODUCTS = [
    {
      id: 'sasbov-01',
      brand: 'MAISON MIHARA YASUHIRO',
      name: 'Peterson OG Sole Canvas Low-Top',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      condition: 'NEW // DEADSTOCK',
      description: 'Культовый архивный силуэт с фирменной расплавленной подошвой OG Sole, плотный хлопковый канвас, комплект с коробкой.',
      region: 'japan',
      regionLabel: 'СПБ // BALKONSKY STORE',
      category: 'footwear',
      sku: 'MMY-PET-904',
      basePriceRub: 24800,
      sizes: ['39 EU', '40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: 'В НАЛИЧИИ',
      image: null
    },
    {
      id: 'sasbov-02',
      brand: 'KAPITAL',
      name: '14oz Denim Bone Embroidered Jacket',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      condition: '9.5/10 EXCELLENT',
      description: 'Архивный японский деним 14oz с фирменной костяной вышивкой. Редкий релиз из Кодзимы в идеальном состоянии.',
      region: 'japan',
      regionLabel: 'СПБ // BALKONSKY STORE',
      category: 'clothing',
      sku: 'KAP-BONE-14OZ',
      basePriceRub: 42500,
      sizes: ['1 (S)', '2 (M)', '3 (L)', '4 (XL)'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: 'В НАЛИЧИИ',
      image: null
    },
    {
      id: 'sasbov-03',
      brand: 'ROARINGWILD',
      name: 'Modular Waterproof Tech Shell Parka',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Shenzhen Lab',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      condition: 'NEW // DEADSTOCK',
      description: 'Шэньчжэньский теквир нового поколения: трехслойная мембрана 20k/20k, магнитные клапаны и модульные съемные карманы.',
      region: 'china',
      regionLabel: 'CHINA [CN] // SHENZHEN LAB',
      category: 'clothing',
      sku: 'RW-TECH-26X',
      basePriceRub: 17900,
      sizes: ['S (46)', 'M (48)', 'L (50)', 'XL (52)'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '04 дн. 12:10',
      image: null
    },
    {
      id: 'sasbov-04',
      brand: 'SALOMON x MM6',
      name: 'Cross Low Sneaker "Black Edition"',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      condition: 'NEW // DEADSTOCK',
      description: 'Коллаборация Salomon и Maison Margiela. Гетровая конструкция с быстрой шнуровкой, подошва Contagrip, навесные бирки.',
      region: 'japan',
      regionLabel: 'СПБ // BALKONSKY STORE',
      category: 'footwear',
      sku: 'SAL-MM6-BLK',
      basePriceRub: 32000,
      sizes: ['40.5 EU', '41.5 EU', '42 EU', '43 EU', '44 EU'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: 'В НАЛИЧИИ',
      image: null
    },
    {
      id: 'sasbov-05',
      brand: 'THUG CLUB',
      name: 'Tribal Gladiator Heavy Fleece Hoodie',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Goofish Xianyu',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      condition: 'NEW // DEADSTOCK',
      description: 'Плотный корейский хлопок 650 GSM с металлической фурнитурой, оверсайз-крой, аутентичный дроп с площадки Xianyu.',
      region: 'china',
      regionLabel: 'CHINA [CN] // GOOFISH XIANYU',
      category: 'clothing',
      sku: 'TC-GLAD-091',
      basePriceRub: 19500,
      sizes: ['M (Oversize)', 'L (Oversize)', 'XL (Oversize)'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '02 дн. 19:30',
      image: null
    },
    {
      id: 'sasbov-06',
      brand: 'PORTER YOSHIDA & CO',
      name: 'Tanker 2Way Helmet Shoulder Bag',
      stockType: 'instock',
      partner: 'Balkonsky Store (Санкт-Петербург)',
      location: 'Санкт-Петербург, Balkonsky Store',
      deliveryTime: 'В наличии в СПб // Примерка и самовывоз сегодня',
      condition: '9.5/10 EXCELLENT',
      description: 'Оригинальный японский трехслойный нейлон Tanker цвета Sage Green, оранжевая подкладка, фурнитура YKK, идеальное состояние.',
      region: 'japan',
      regionLabel: 'СПБ // BALKONSKY STORE',
      category: 'accessories',
      sku: 'POR-TNK-2WAY',
      basePriceRub: 21400,
      sizes: ['ONE SIZE (W480/H520)'],
      dropStatus: 'В НАЛИЧИИ В СПБ',
      badgeClass: 'jp',
      closingIn: 'В НАЛИЧИИ',
      image: null
    },
    {
      id: 'sasbov-07',
      brand: 'ANTA x KYRIE IRVING',
      name: 'KAI 1 "Artist on Court" Special Edition',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Poizon Auth',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      condition: 'NEW // DEADSTOCK',
      description: 'Первая именная модель Кайри Ирвинга с ANTA. Карбоновая пластина в мидсоли, аутентичный сертификат Poizon Dewu.',
      region: 'china',
      regionLabel: 'CHINA [CN] // POIZON AUTH',
      category: 'footwear',
      sku: 'ANTA-KAI1-ART',
      basePriceRub: 16800,
      sizes: ['41 EU', '42 EU', '42.5 EU', '43 EU', '44 EU', '45 EU'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '03 дн. 21:00',
      image: null
    },
    {
      id: 'sasbov-08',
      brand: 'UNDERCOVERISM',
      name: 'Hybrid MA-1 Vintage Military Bomber',
      stockType: 'preorder',
      partner: null,
      location: 'Япония // Harajuku Archive',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      condition: '9/10 VINTAGE',
      description: 'Винтажный японский архивный бомбер Дзюна Такахаси. Деконструированные трикотажные вставки, аутентичные патчи.',
      region: 'japan',
      regionLabel: 'JAPAN [JP] // HARAJUKU',
      category: 'clothing',
      sku: 'UC-HYB-MA1',
      basePriceRub: 48900,
      sizes: ['2 (M)', '3 (L)', '4 (XL)'],
      dropStatus: 'СКОРО ЗАКРЫТИЕ',
      badgeClass: 'jp',
      closingIn: '09 ч. 40 мин',
      image: null
    },
    {
      id: 'sasbov-09',
      brand: 'HARSH AND CRUEL',
      name: 'Cyber Crossbody Tactical Harness Rig',
      stockType: 'preorder',
      partner: null,
      location: 'Китай // Dewu Boutique',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      condition: 'NEW // DEADSTOCK',
      description: 'Киберпанк тактическая разгрузочная система. Ткань Cordura 1000D, водонепроницаемые молнии, быстросъемные фастексы.',
      region: 'china',
      regionLabel: 'CHINA [CN] // DEWU BOUTIQUE',
      category: 'accessories',
      sku: 'HAC-RIG-004',
      basePriceRub: 8400,
      sizes: ['ADJUSTABLE ONE SIZE'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'cn',
      closingIn: '06 дн. 11:20',
      image: null
    },
    {
      id: 'sasbov-10',
      brand: 'HELMUT LANG',
      name: '1998 M-65 Astro Biker Ballistic Jacket',
      stockType: 'preorder',
      partner: null,
      location: 'Global // Grailed Archive',
      deliveryTime: 'Выкуп под заказ: 10-18 дней',
      condition: '9/10 ARCHIVE',
      description: 'Музейный архивный лот 1998 года из Grailed Archive. Баллистический нейлон, внутренние ремни для ношения на спине.',
      region: 'global',
      regionLabel: 'GLOBAL [GLB] // GRAILED ARCHIVE',
      category: 'clothing',
      sku: 'HL-98-ASTRO',
      basePriceRub: 89000,
      sizes: ['48 IT', '50 IT'],
      dropStatus: 'LIMITED DROP',
      badgeClass: 'global',
      closingIn: '01 дн. 18:30',
      image: null
    }
  ];

  function getStoredProducts() {
    try {
      const stored = localStorage.getItem('sasbov_products_v2') || localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(p => {
            if (!Array.isArray(p.images)) {
              p.images = p.image ? [p.image] : [];
            }
            if (p.regionLabel) {
              p.regionLabel = p.regionLabel.replace(/🇯🇵/g, '[JP]').replace(/🇨🇳/g, '[CN]');
            }
            const def = DEFAULT_PRODUCTS.find(d => d.id === p.id);
            if (!p.stockType) {
              if (['sasbov-01', 'sasbov-02', 'sasbov-04', 'sasbov-06'].includes(p.id) || 
                  p.region === 'spb' || 
                  (p.brand && p.brand.includes('BALENCIAGA')) ||
                  (p.dropStatus && p.dropStatus.includes('НАЛИЧИИ'))) {
                p.stockType = 'instock';
                p.partner = 'Balkonsky Store (Санкт-Петербург)';
                p.location = 'Санкт-Петербург, Balkonsky Store';
                p.deliveryTime = 'В наличии в СПб // Примерка и самовывоз сегодня';
              } else {
                p.stockType = def ? def.stockType : 'preorder';
                p.partner = def ? def.partner : null;
                p.location = def ? def.location : 'Зарубежный выкуп';
                p.deliveryTime = def ? def.deliveryTime : 'Выкуп под заказ: 10-18 дней';
              }
            }
            if (!p.condition) {
              p.condition = def ? def.condition : 'NEW // DEADSTOCK';
            }
            if (!p.description) {
              p.description = def ? def.description : 'Аутентичный релиз с зарубежных и локальных архивных площадок.';
            }
            return p;
          });
        }
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return DEFAULT_PRODUCTS;
  }

  function saveStoredProducts(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  let PRODUCTS = getStoredProducts();

  // Application State
  const state = {
    activeRegion: 'all',
    activeCategory: 'all',
    searchQuery: '',
    selectedProduct: null,
    selectedSize: '',
    selectedSpeed: 'express',
    trayItems: []
  };

  // DOM Elements Cache
  const el = {
    grid: document.getElementById('fresh-products-grid') || document.getElementById('products-grid'),
    searchInput: document.getElementById('catalog-search-input'),
    regionBtns: document.querySelectorAll('[data-filter-type="region"]'),
    categoryBtns: document.querySelectorAll('[data-filter-type="category"]'),

    // Add Product Modal & Controls
    openAddProductBtn: document.getElementById('open-add-product-btn'),
    resetCatalogBtn: document.getElementById('reset-catalog-btn'),
    addModal: document.getElementById('add-product-modal'),
    addModalBackdrop: document.getElementById('add-modal-backdrop'),
    addModalCloseBtn: document.getElementById('add-modal-close-btn'),
    addProductForm: document.getElementById('add-product-form'),
    
    // Pre-order Modal
    modal: document.getElementById('preorder-modal'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    modalRegionTag: document.getElementById('modal-region-tag'),
    modalItemTitle: document.getElementById('modal-item-title'),
    modalItemSku: document.getElementById('modal-item-sku'),
    modalImgPreview: document.getElementById('modal-img-preview'),
    modalSizesList: document.getElementById('modal-sizes-list'),
    modalPriceVal: document.getElementById('modal-price-val'),
    modalSubmitTgBtn: document.getElementById('modal-submit-tg-btn'),
    modalSpeedRadios: document.querySelectorAll('input[name="modal-speed"]'),

    // Pre-order Tray (Cart Drawer)
    trayDrawer: document.getElementById('tray-drawer'),
    trayBtn: document.getElementById('preorder-tray-btn'),
    trayCloseBtn: document.getElementById('tray-close-btn'),
    trayCountBadge: document.getElementById('tray-count'),
    trayContainer: document.getElementById('tray-items-container'),
    trayFooter: document.getElementById('tray-footer'),
    trayTotalPrice: document.getElementById('tray-total-price'),
    trayCheckoutBtn: document.getElementById('tray-checkout-btn'),

    // Calculator Elements
    calcOriginBtns: document.querySelectorAll('[data-calc-origin]'),
    calcItemPrice: document.getElementById('calc-item-price'),
    calcPriceLabel: document.getElementById('calc-price-label'),
    calcCurrencySymbol: document.getElementById('calc-currency-symbol'),
    calcCategorySelect: document.getElementById('calc-item-category'),
    calcSpeedRadios: document.querySelectorAll('input[name="delivery-speed"]'),
    calcBasePrice: document.getElementById('summary-base-price'),
    calcShipping: document.getElementById('summary-shipping'),
    calcService: document.getElementById('summary-service'),
    calcTotalPrice: document.getElementById('summary-total-price'),
    calcApplyBtn: document.getElementById('calc-apply-order-btn'),

    // Telemetry Clocks
    clockTokyo: document.getElementById('clock-tokyo'),
    clockShanghai: document.getElementById('clock-shanghai'),
    clockMoscow: document.getElementById('clock-moscow')
  };

  /**
   * Format numbers to Russian Ruble format
   */
  function formatRub(num) {
    return Math.round(num).toLocaleString('ru-RU') + ' ₽';
  }

  /**
   * Render Filtered Product Grid
   */
  function renderProducts() {
    if (!el.grid) return;

    const filtered = PRODUCTS.filter(p => {
      const matchRegion = state.activeRegion === 'all' || p.region === state.activeRegion;
      const matchCategory = state.activeCategory === 'all' || p.category === state.activeCategory;
      const matchSearch = !state.searchQuery || 
        p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
        p.brand.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(state.searchQuery.toLowerCase());
      
      return matchRegion && matchCategory && matchSearch;
    });

    const isFreshPreview = el.grid.id === 'fresh-products-grid';
    const displayList = isFreshPreview ? filtered.slice(0, 3) : filtered;

    if (displayList.length === 0) {
      el.grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px;">
          <p style="font-family: var(--font-mono); font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">// НИЧЕГО НЕ НАЙДЕНО</p>
          <p style="font-size: 0.9rem;">Попробуйте сбросить параметры фильтра или перейдите в полный каталог.</p>
        </div>
      `;
      return;
    }

    el.grid.innerHTML = displayList.map(product => {
      const sizesHtml = product.sizes.slice(0, 4).map(s => `<span class="size-pill">${s}</span>`).join('');
      const moreSizes = product.sizes.length > 4 ? `<span class="size-pill">+${product.sizes.length - 4}</span>` : '';

      const images = (Array.isArray(product.images) && product.images.length > 0)
        ? product.images.filter(Boolean)
        : (product.image ? [product.image] : []);

      let imageContent = '';
      if (images.length === 0) {
        imageContent = `
          <div class="slot-center-placeholder" title="Слот подготовлен для фотографии товара">
            <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span class="placeholder-text">МЕСТО ДЛЯ ФОТО</span>
            <span class="placeholder-subtext">${product.brand}</span>
          </div>
        `;
      } else if (images.length === 1) {
        imageContent = `
          <img src="${images[0]}" alt="${product.brand} - ${product.name}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;">
        `;
      } else {
        imageContent = `
          <div class="card-carousel-wrap" data-card-id="${product.id}">
            <div class="card-carousel-slides">
              ${images.map((src, i) => `
                <img src="${src}" alt="${product.brand} - ${product.name} (Фото ${i + 1})" class="card-carousel-img ${i === 0 ? 'active' : ''}" data-idx="${i}">
              `).join('')}
            </div>
            <button type="button" class="card-arrow-btn arrow-prev" data-dir="prev" title="Предыдущее фото" aria-label="Предыдущее фото">‹</button>
            <button type="button" class="card-arrow-btn arrow-next" data-dir="next" title="Следующее фото" aria-label="Следующее фото">›</button>
            <div class="card-carousel-meta">
              <span class="card-photo-counter"><span class="cur-idx">1</span>/${images.length}</span>
              <div class="card-photo-dots">
                ${images.map((_, i) => `<span class="photo-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
              </div>
            </div>
          </div>
        `;
      }

      return `
        <article class="product-card" data-product-id="${product.id}">
          <!-- Photo Slot Frame (3:4 ratio) -->
          <div class="product-slot-frame">
            <div class="slot-hud-corner slot-hud-tl"></div>
            <div class="slot-hud-corner slot-hud-tr"></div>
            <div class="slot-hud-corner slot-hud-bl"></div>
            <div class="slot-hud-corner slot-hud-br"></div>

            ${imageContent}

            <div class="slot-inner-content">
              <div class="slot-top-row">
                <span class="origin-badge ${product.badgeClass}">${product.regionLabel}</span>
                <span class="drop-status-pill">${product.dropStatus}</span>
              </div>

              <div class="slot-bottom-row">
                <div class="slot-telemetry-left">
                  <span class="slot-sku">${product.sku}</span>
                  <span class="slot-timer">[TIME: ${product.closingIn}]</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Product Details -->
          <div class="product-info">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 2px;">
              <span class="product-brand">${product.brand}</span>
              <span class="product-condition-pill">● ${product.condition || 'NEW // DEADSTOCK'}</span>
            </div>
            <h3 class="product-name">${product.name}</h3>
            ${product.description ? `<p class="product-mini-desc">${product.description}</p>` : ''}

            <div class="product-sizes-wrap">
              <span class="sizes-label">ДОСТУПНЫЕ РАЗМЕРЫ:</span>
              <div class="sizes-chips">
                ${sizesHtml}
                ${moreSizes}
              </div>
            </div>

            <div class="product-price-row">
              <div>
                <span class="price-tag">${formatRub(product.basePriceRub)}</span>
                <span class="price-detail">под ключ с доставкой</span>
              </div>
            </div>

            <div class="card-actions">
              <button type="button" class="btn btn-primary btn-block open-preorder-btn" data-id="${product.id}">
                ${product.stockType === 'instock' ? 'ЗАБРОНИРОВАТЬ' : 'ПРЕДЗАКАЗАТЬ'}
              </button>
              <button type="button" class="btn btn-outline quick-add-tray-btn" data-id="${product.id}" title="Добавить в поднос предзаказов">
                +
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach Event Listeners to rendered cards
    el.grid.querySelectorAll('.open-preorder-btn').forEach(btn => {
      btn.addEventListener('click', () => openPreorderModal(btn.dataset.id));
    });

    el.grid.querySelectorAll('.quick-add-tray-btn').forEach(btn => {
      btn.addEventListener('click', () => addToTray(btn.dataset.id));
    });

    // Carousel side arrows click handler (browse photos without opening preorder modal)
    el.grid.querySelectorAll('.card-arrow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const wrap = btn.closest('.card-carousel-wrap');
        if (!wrap) return;

        const slides = wrap.querySelectorAll('.card-carousel-img');
        const dots = wrap.querySelectorAll('.photo-dot');
        const counter = wrap.querySelector('.cur-idx');
        if (!slides.length) return;

        let curIdx = 0;
        slides.forEach((s, idx) => {
          if (s.classList.contains('active')) curIdx = idx;
        });

        const dir = btn.dataset.dir;
        const nextIdx = dir === 'next' ? (curIdx + 1) % slides.length : (curIdx - 1 + slides.length) % slides.length;

        slides[curIdx].classList.remove('active');
        slides[nextIdx].classList.add('active');

        if (dots[curIdx]) dots[curIdx].classList.remove('active');
        if (dots[nextIdx]) dots[nextIdx].classList.add('active');

        if (counter) counter.textContent = String(nextIdx + 1);
      });
    });
  }

  /**
   * Filter Event Handlers
   */
  function setupFilters() {
    el.regionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.regionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeRegion = btn.dataset.filterVal;
        renderProducts();
      });
    });

    el.categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeCategory = btn.dataset.filterVal;
        renderProducts();
      });
    });

    if (el.searchInput) {
      el.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        renderProducts();
      });
    }
  }

  /**
   * Add Custom Product Modal Logic
   */
  function setupAddProductModal() {
    if (el.openAddProductBtn && el.addModal) {
      el.openAddProductBtn.addEventListener('click', () => {
        el.addModal.showModal();
      });
    }

    const closeAddModal = () => {
      if (el.addModal && el.addModal.open) {
        el.addModal.close();
      }
    };

    if (el.addModalCloseBtn) el.addModalCloseBtn.addEventListener('click', closeAddModal);
    if (el.addModalBackdrop) el.addModalBackdrop.addEventListener('click', closeAddModal);

    // Reset catalog button
    if (el.resetCatalogBtn) {
      el.resetCatalogBtn.addEventListener('click', () => {
        if (confirm('Сбросить каталог к 9 оригинальным дропам?')) {
          PRODUCTS = [...DEFAULT_PRODUCTS];
          saveStoredProducts(PRODUCTS);
          renderProducts();
          alert('Каталог сброшен к заводским позициям!');
        }
      });
    }

    // Add Product Form Submit
    if (el.addProductForm) {
      el.addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const brand = document.getElementById('new-brand')?.value.trim().toUpperCase() || 'BRAND';
        const name = document.getElementById('new-name')?.value.trim() || 'Custom Drop Item';
        const region = document.getElementById('new-region')?.value || 'china';
        const category = document.getElementById('new-category')?.value || 'clothing';
        const price = parseFloat(document.getElementById('new-price')?.value) || 15000;
        const rawSizes = document.getElementById('new-sizes')?.value || 'S, M, L';
        const sizes = rawSizes.split(',').map(s => s.trim()).filter(Boolean);
        const imageUrlInput = document.getElementById('new-image-url')?.value.trim();
        const fileInput = document.getElementById('new-image-file');

        const regionLabel = region === 'japan' 
          ? 'JAPAN [JP] // TOKYO ARCHIVE' 
          : (region === 'global' ? 'GLOBAL [GLB] // GRAILED ARCHIVE' : 'CHINA [CN] // POIZON AUTH');
        const badgeClass = region === 'japan' ? 'jp' : (region === 'global' ? 'global' : 'cn');
        const sku = `SAS-${brand.slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;

        const createAndInsert = (imageSrc) => {
          const newProduct = {
            id: 'custom-' + Date.now(),
            brand,
            name,
            region,
            regionLabel,
            category,
            sku,
            basePriceRub: price,
            sizes: sizes.length ? sizes : ['ONE SIZE'],
            dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
            badgeClass,
            closingIn: '03 дн. 12:00',
            image: imageSrc || null
          };

          PRODUCTS.unshift(newProduct);
          saveStoredProducts(PRODUCTS);
          renderProducts();
          closeAddModal();
          el.addProductForm.reset();
          alert(`Вещь «${brand} ${name}» успешно добавлена в каталог и TikTok-ленту!`);
        };

        if (fileInput?.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            createAndInsert(event.target.result);
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          createAndInsert(imageUrlInput || null);
        }
      });
    }
  }

  /**
   * Pre-order Modal Logic
   */
  function openPreorderModal(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product || !el.modal) return;

    state.selectedProduct = product;
    state.selectedSize = product.sizes[0] || 'Стандарт';

    el.modalRegionTag.textContent = product.regionLabel;
    el.modalItemTitle.textContent = `${product.brand} — ${product.name}`;
    el.modalItemSku.textContent = `АРТИКУЛ: ${product.sku} // ДЕДЛАЙН: ${product.closingIn}`;
    el.modalPriceVal.textContent = formatRub(product.basePriceRub);

    if (product.image) {
      el.modalImgPreview.innerHTML = `
        <img src="${product.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
      `;
    } else {
      el.modalImgPreview.innerHTML = `
        <div class="slot-badge">ПРЕВЬЮ СЛОТА // ${product.brand}</div>
        <div class="slot-hud-brackets"></div>
      `;
    }

    // Render Size Options
    el.modalSizesList.innerHTML = product.sizes.map((s, idx) => `
      <button type="button" class="modal-size-btn ${idx === 0 ? 'active' : ''}" data-size="${s}">
        ${s}
      </button>
    `).join('');

    el.modalSizesList.querySelectorAll('.modal-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.modalSizesList.querySelectorAll('.modal-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedSize = btn.dataset.size;
      });
    });

    // Reset Speed to Express
    el.modalSpeedRadios.forEach(r => {
      r.checked = r.value.includes('Авиа');
      r.parentElement.classList.toggle('active', r.checked);
    });

    el.modal.showModal();
  }

  function closePreorderModal() {
    if (el.modal && el.modal.open) {
      el.modal.close();
    }
  }

  function setupModalEvents() {
    if (el.modalCloseBtn) el.modalCloseBtn.addEventListener('click', closePreorderModal);
    if (el.modalBackdrop) el.modalBackdrop.addEventListener('click', closePreorderModal);

    el.modalSpeedRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        el.modalSpeedRadios.forEach(r => r.parentElement.classList.toggle('active', r.checked));
      });
    });

    if (el.modalSubmitTgBtn) {
      el.modalSubmitTgBtn.addEventListener('click', () => {
        if (!state.selectedProduct) return;

        const p = state.selectedProduct;
        const selectedSpeedVal = Array.from(el.modalSpeedRadios).find(r => r.checked)?.value || 'Авиа-экспресс (7-10 дней)';
        const isInstock = p.stockType === 'instock';

        const greeting = isInstock
          ? 'Здравствуйте! Хочу забронировать вещь В НАЛИЧИИ (СПб, Balkonsky Store):'
          : 'Здравствуйте! Хочу оформить предзаказ в SASBOV MARKET:';

        const messageText = 
`${greeting}
— Товар: ${p.brand} ${p.name}
— Состояние: ${p.condition || 'NEW // DEADSTOCK'}
— Артикул: ${p.sku}
— Размер: ${state.selectedSize}
— Локация / Площадка: ${p.regionLabel}
— Тариф: ${isInstock ? 'Самовывоз в СПб / СДЭК' : selectedSpeedVal}
— Стоимость под ключ: ${formatRub(p.basePriceRub)}

${isInstock ? 'Подскажите, когда можно подъехать на примерку или отправить СДЭКом?' : 'Подтвердите, пожалуйста, наличие на зарубежной площадке и пришлите реквизиты для выкупа!'}`;

        const tgUrl = `https://t.me/sasbovstore?text=${encodeURIComponent(messageText)}`;
        window.open(tgUrl, '_blank', 'noopener,noreferrer');
        closePreorderModal();
      });
    }
  }

  /**
   * Pre-order Tray (Cart Drawer)
   */
  function addToTray(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    state.trayItems.push({
      id: product.id + '-' + Date.now(),
      brand: product.brand,
      name: product.name,
      price: product.basePriceRub,
      size: product.sizes[0] || 'Default',
      sku: product.sku
    });

    updateTrayUI();
    openTray();
  }

  function removeFromTray(itemId) {
    state.trayItems = state.trayItems.filter(item => item.id !== itemId);
    updateTrayUI();
  }

  function openTray() {
    if (el.trayDrawer) {
      el.trayDrawer.classList.add('open');
      el.trayDrawer.setAttribute('aria-hidden', 'false');
    }
  }

  function closeTray() {
    if (el.trayDrawer) {
      el.trayDrawer.classList.remove('open');
      el.trayDrawer.setAttribute('aria-hidden', 'true');
    }
  }

  function updateTrayUI() {
    if (el.trayCountBadge) {
      el.trayCountBadge.textContent = state.trayItems.length;
    }

    if (!el.trayContainer) return;

    if (state.trayItems.length === 0) {
      el.trayContainer.innerHTML = `
        <div class="tray-empty">
          <p>Вы пока не добавили вещи в предзаказ.</p>
          <p class="text-muted">Выберите нужные позиции из каталога ниже.</p>
        </div>
      `;
      if (el.trayFooter) el.trayFooter.style.display = 'none';
      return;
    }

    const total = state.trayItems.reduce((sum, item) => sum + item.price, 0);

    el.trayContainer.innerHTML = state.trayItems.map(item => `
      <div class="tray-item">
        <div>
          <span class="tray-item-title">${item.brand}</span>
          <span class="tray-item-meta">${item.name} (${item.size}) — ${formatRub(item.price)}</span>
        </div>
        <button type="button" class="tray-item-remove" data-item-id="${item.id}" aria-label="Удалить">
          ✕
        </button>
      </div>
    `).join('');

    el.trayContainer.querySelectorAll('.tray-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromTray(btn.dataset.itemId));
    });

    if (el.trayFooter && el.trayTotalPrice) {
      el.trayFooter.style.display = 'block';
      el.trayTotalPrice.textContent = formatRub(total);
    }
  }

  function setupTrayEvents() {
    if (el.trayBtn) el.trayBtn.addEventListener('click', openTray);
    if (el.trayCloseBtn) el.trayCloseBtn.addEventListener('click', closeTray);

    if (el.trayCheckoutBtn) {
      el.trayCheckoutBtn.addEventListener('click', () => {
        if (state.trayItems.length === 0) return;

        const total = state.trayItems.reduce((sum, item) => sum + item.price, 0);
        const listText = state.trayItems.map((item, idx) => 
          `${idx + 1}. ${item.brand} ${item.name} (Арт: ${item.sku}, Разм: ${item.size}) — ${formatRub(item.price)}`
        ).join('\n');

        const messageText = 
`Здравствуйте! Хочу оформить пакетный предзаказ в SASBOV MARKET:

${listText}

— Итого к оплате под ключ: ${formatRub(total)}
Жду подтверждения наличия и реквизитов!`;

        const tgUrl = `https://t.me/sasbovstore?text=${encodeURIComponent(messageText)}`;
        window.open(tgUrl, '_blank', 'noopener,noreferrer');
        closeTray();
      });
    }
  }

  /**
   * Transparent Cost Calculator Logic
   */
  let calcOrigin = 'cn';

  function calculateEstimate() {
    const priceVal = parseFloat(el.calcItemPrice?.value) || 0;
    const categoryKey = el.calcCategorySelect?.value || 'shoes';
    const isExpress = Array.from(el.calcSpeedRadios).find(r => r.checked)?.value === 'express';

    const logisticsConfig = LOGISTICS_RATES[categoryKey] || LOGISTICS_RATES.shoes;
    const rate = calcOrigin === 'cn' ? RATES.CNY : (calcOrigin === 'jp' ? RATES.JPY : RATES.USD);

    const baseRub = priceVal * rate;
    const serviceFee = (baseRub * RATES.SERVICE_FEE_PCT) + RATES.INSURANCE_FEE_RUB;
    const shippingFee = isExpress ? logisticsConfig.expressRub : logisticsConfig.standardRub;
    const totalRub = baseRub + serviceFee + shippingFee;

    if (el.calcBasePrice) el.calcBasePrice.textContent = formatRub(baseRub);
    if (el.calcShipping) el.calcShipping.textContent = formatRub(shippingFee);
    if (el.calcService) el.calcService.textContent = formatRub(serviceFee);
    if (el.calcTotalPrice) el.calcTotalPrice.textContent = formatRub(totalRub);

    return { priceVal, baseRub, shippingFee, serviceFee, totalRub, isExpress, categoryKey };
  }

  function setupCalculator() {
    el.calcOriginBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.calcOriginBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        calcOrigin = btn.dataset.calcOrigin;

        if (calcOrigin === 'cn') {
          el.calcPriceLabel.textContent = 'ЦЕНА В МАГАЗИНЕ (В ЮАНЯХ ¥)';
          el.calcCurrencySymbol.textContent = '¥ CNY';
          if (el.calcItemPrice.value == 28000 || el.calcItemPrice.value == 250) el.calcItemPrice.value = 899;
        } else if (calcOrigin === 'jp') {
          el.calcPriceLabel.textContent = 'ЦЕНА В МАГАЗИНЕ (В ИЕНАХ ¥)';
          el.calcCurrencySymbol.textContent = '¥ JPY';
          if (el.calcItemPrice.value == 899 || el.calcItemPrice.value == 250) el.calcItemPrice.value = 28000;
        } else {
          el.calcPriceLabel.textContent = 'ЦЕНА В МАГАЗИНЕ (В ДОЛЛАРАХ $)';
          el.calcCurrencySymbol.textContent = '$ USD';
          if (el.calcItemPrice.value == 899 || el.calcItemPrice.value == 28000) el.calcItemPrice.value = 250;
        }

        calculateEstimate();
      });
    });

    if (el.calcItemPrice) el.calcItemPrice.addEventListener('input', calculateEstimate);
    if (el.calcCategorySelect) el.calcCategorySelect.addEventListener('change', calculateEstimate);

    el.calcSpeedRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        el.calcSpeedRadios.forEach(r => r.parentElement.classList.toggle('active', r.checked));
        calculateEstimate();
      });
    });

    if (el.calcApplyBtn) {
      el.calcApplyBtn.addEventListener('click', () => {
        const est = calculateEstimate();
        const originName = calcOrigin === 'cn' 
          ? 'Китай [CN] (Poizon / Goofish ¥)' 
          : (calcOrigin === 'jp' ? 'Япония [JP] (Mercari / eBay JP ¥)' : 'Global [GLB] (Grailed Archive $)');
        const currTag = calcOrigin === 'cn' ? '¥ CNY' : (calcOrigin === 'jp' ? '¥ JPY' : '$ USD');
        const speedText = est.isExpress ? 'Авиа-экспресс (7–10 дней)' : 'Стандарт (14–18 дней)';
        const catText = el.calcCategorySelect.options[el.calcCategorySelect.selectedIndex].text;

        const message = 
`Здравствуйте! Рассчитал стоимость вещи на сайте SASBOV MARKET:
— Страна / Площадка: ${originName}
— Цена в магазине: ${est.priceVal} ${currTag}
— Категория: ${catText}
— Тариф: ${speedText}
— Расчётная сумма под ключ: ${formatRub(est.totalRub)}

Помогите, пожалуйста, найти и оформить эту позицию!`;

        const tgUrl = `https://t.me/sasbovstore?text=${encodeURIComponent(message)}`;
        window.open(tgUrl, '_blank', 'noopener,noreferrer');
      });
    }

    calculateEstimate();
  }

  /**
   * Live Telemetry Clocks
   */
  function updateTelemetryClocks() {
    const now = new Date();

    const formatTime = (timeZone) => {
      return new Intl.DateTimeFormat('ru-RU', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
    };

    if (el.clockTokyo) el.clockTokyo.textContent = `TYO: ${formatTime('Asia/Tokyo')} JST`;
    if (el.clockShanghai) el.clockShanghai.textContent = `SHA: ${formatTime('Asia/Shanghai')} CST`;
    if (el.clockMoscow) el.clockMoscow.textContent = `MSK: ${formatTime('Europe/Moscow')} MSK`;
  }

  /**
   * Interactive 3D/4D Holographic Monolith Effect
   */
  function setup3DMonolith() {
    const card = document.getElementById('sasbov-3d-card');
    const stage = document.getElementById('hero-3d-stage');
    const glare = document.getElementById('monolith-glare');

    if (!card || !stage) return;

    stage.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -16;
      const rotateY = ((x - centerX) / centerX) * 16;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;

      if (glare) {
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.35) 0%, transparent 60%)`;
        glare.style.opacity = '1';
      }
    });

    stage.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      if (glare) glare.style.opacity = '0';
    });
  }

  /**
   * Secret Hidden Admin Console & Mass AI Drop Importer
   * Access: Ctrl+Shift+A, ?admin=1 in URL, or click on [ // ADMIN TERMINAL ] in footer
   */
  function setupHiddenAdminModal() {
    const adminModal = document.getElementById('hidden-admin-modal');
    const adminBackdrop = document.getElementById('admin-modal-backdrop');
    const adminCloseBtn = document.getElementById('admin-modal-close-btn');
    const adminTrigger = document.getElementById('admin-secret-trigger');
    const dropzone = document.getElementById('admin-dropzone');
    const fileInput = document.getElementById('admin-file-input');
    const queueContainer = document.getElementById('admin-batch-queue');
    const footerBar = document.getElementById('admin-footer-bar');
    const clearQueueBtn = document.getElementById('admin-clear-queue-btn');
    const publishAllBtn = document.getElementById('admin-publish-all-btn');

    if (!adminModal) return;

    let batchItems = [];

    const openAdmin = () => {
      adminModal.showModal();
    };

    const closeAdmin = () => {
      if (adminModal.open) adminModal.close();
    };

    // Trigger 1: Secret button in footer
    if (adminTrigger) {
      adminTrigger.addEventListener('click', openAdmin);
    }

    // Trigger 2: Keyboard shortcut Ctrl+Shift+A or Cmd+Shift+A
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a' || e.key === 'Ф' || e.key === 'ф')) {
        e.preventDefault();
        if (adminModal.open) {
          closeAdmin();
        } else {
          openAdmin();
        }
      }
    });

    // Trigger 3: URL Parameter ?admin=1
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1') {
      openAdmin();
    }

    // Close actions
    if (adminCloseBtn) adminCloseBtn.addEventListener('click', closeAdmin);
    if (adminBackdrop) adminBackdrop.addEventListener('click', closeAdmin);

    // AI Heuristic Model & Brand Guesser
    const guessBrandAndDetails = (filename) => {
      const fn = filename.toLowerCase();
      
      const brandMap = [
        { key: 'mihara', brand: 'MAISON MIHARA YASUHIRO', cat: 'footwear', reg: 'japan', price: 24800, sizes: '39 EU, 40 EU, 41 EU, 42 EU, 43 EU, 44 EU' },
        { key: 'kapital', brand: 'KAPITAL', cat: 'clothing', reg: 'japan', price: 38500, sizes: '1 (S), 2 (M), 3 (L), 4 (XL)' },
        { key: 'roaring', brand: 'ROARINGWILD', cat: 'clothing', reg: 'china', price: 16900, sizes: 'S, M, L, XL' },
        { key: 'salomon', brand: 'SALOMON x MM6', cat: 'footwear', reg: 'japan', price: 31000, sizes: '40.5 EU, 41.5 EU, 42 EU, 43 EU, 44 EU' },
        { key: 'thug', brand: 'THUG CLUB', cat: 'clothing', reg: 'china', price: 19500, sizes: 'M, L, XL' },
        { key: 'undercover', brand: 'UNDERCOVERISM', cat: 'clothing', reg: 'japan', price: 36000, sizes: '2 (M), 3 (L), 4 (XL)' },
        { key: 'yohji', brand: 'YOHJI YAMAMOTO', cat: 'clothing', reg: 'japan', price: 46000, sizes: '2 (M), 3 (L)' },
        { key: 'rick', brand: 'RICK OWENS DRKSHDW', cat: 'clothing', reg: 'japan', price: 49000, sizes: '48 (M), 50 (L), 52 (XL)' },
        { key: 'bape', brand: 'A BATHING APE', cat: 'clothing', reg: 'japan', price: 28000, sizes: 'M, L, XL, XXL' },
        { key: 'stussy', brand: 'STUSSY JAPAN', cat: 'clothing', reg: 'japan', price: 14500, sizes: 'S, M, L, XL' },
        { key: 'porter', brand: 'PORTER YOSHIDA & CO', cat: 'accessories', reg: 'japan', price: 22000, sizes: 'ONE SIZE' },
        { key: 'anta', brand: 'ANTA SPORTS', cat: 'footwear', reg: 'china', price: 16800, sizes: '41 EU, 42 EU, 43 EU, 44 EU' },
        { key: 'li-ning', brand: 'LI-NING 1990', cat: 'footwear', reg: 'china', price: 18500, sizes: '40 EU, 41 EU, 42 EU, 43 EU' },
        { key: 'clot', brand: 'CLOT', cat: 'clothing', reg: 'china', price: 17000, sizes: 'S, M, L, XL' },
        { key: 'comme', brand: 'COMME DES GARÇONS', cat: 'clothing', reg: 'japan', price: 32000, sizes: 'S, M, L' },
        { key: 'arcteryx', brand: "ARC'TERYX SYSTEM_A", cat: 'clothing', reg: 'japan', price: 44000, sizes: 'S, M, L, XL' },
        { key: 'human', brand: 'HUMAN MADE', cat: 'clothing', reg: 'japan', price: 18000, sizes: 'M, L, XL' },
        { key: 'wtaps', brand: 'WTAPS', cat: 'clothing', reg: 'japan', price: 26000, sizes: '1 (S), 2 (M), 3 (L), 4 (XL)' }
      ];

      for (const m of brandMap) {
        if (fn.includes(m.key)) {
          let cleanName = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase();
          return {
            brand: m.brand,
            name: cleanName || (m.brand + ' Special Release'),
            category: m.cat,
            region: m.reg,
            price: m.price,
            sizes: m.sizes
          };
        }
      }

      const randomPresets = [
        { brand: 'MAISON MIHARA YASUHIRO', name: 'Hank Low-Top Vintage Sneaker', category: 'footwear', region: 'japan', price: 26500, sizes: '40 EU, 41 EU, 42 EU, 43 EU, 44 EU' },
        { brand: 'ROARINGWILD', name: 'Raw Minimalist Techwear Jacket', category: 'clothing', region: 'china', price: 18900, sizes: 'S, M, L, XL' },
        { brand: 'KAPITAL', name: 'Bandana Pattern Heavyweight Fleeced Coat', category: 'clothing', region: 'japan', price: 44000, sizes: '2 (M), 3 (L), 4 (XL)' },
        { brand: 'UNDERCOVERISM', name: 'Gyakusou Archive Layered Shell', category: 'clothing', region: 'japan', price: 34000, sizes: 'M, L, XL' },
        { brand: 'THUG CLUB', name: 'Dragon Leather Trim Heavy Hoodie', category: 'clothing', region: 'china', price: 21000, sizes: '1, 2, 3' }
      ];
      
      const cleanFileName = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      const preset = randomPresets[Math.floor(Math.random() * randomPresets.length)];
      return {
        brand: preset.brand,
        name: cleanFileName.length > 3 ? cleanFileName : preset.name,
        category: preset.category,
        region: preset.region,
        price: preset.price,
        sizes: preset.sizes
      };
    };

    // Render Batch Queue
    const renderBatchQueue = () => {
      if (!queueContainer) return;
      if (batchItems.length === 0) {
        queueContainer.innerHTML = '';
        if (footerBar) footerBar.style.display = 'none';
        return;
      }

      if (footerBar) footerBar.style.display = 'flex';

      queueContainer.innerHTML = batchItems.map((item, idx) => `
        <div class="admin-item-card" data-idx="${idx}">
          <div class="admin-item-thumb-box">
            <img src="${item.image}" alt="Preview" class="admin-item-thumb">
            <span class="admin-item-ai-tag">AI READY</span>
          </div>

          <div class="admin-item-fields">
            <div class="admin-field-group">
              <label class="admin-field-label">БРЕНД (BRAND):</label>
              <input type="text" class="admin-field-input" data-field="brand" data-idx="${idx}" value="${item.brand}">
            </div>

            <div class="admin-field-group">
              <label class="admin-field-label">МОДЕЛЬ / НАЗВАНИЕ:</label>
              <input type="text" class="admin-field-input" data-field="name" data-idx="${idx}" value="${item.name}">
            </div>

            <div class="admin-field-group">
              <label class="admin-field-label">РЕГИОН ВЫКУПА:</label>
              <select class="admin-field-select" data-field="region" data-idx="${idx}">
                <option value="japan" ${item.region === 'japan' ? 'selected' : ''}>Япония [JP] (Tokyo / eBay JP)</option>
                <option value="china" ${item.region === 'china' ? 'selected' : ''}>Китай [CN] (Poizon / Goofish)</option>
                <option value="global" ${item.region === 'global' ? 'selected' : ''}>Global [GLB] (Grailed Archive)</option>
              </select>
            </div>

            <div class="admin-field-group">
              <label class="admin-field-label">КАТЕГОРИЯ:</label>
              <select class="admin-field-select" data-field="category" data-idx="${idx}">
                <option value="clothing" ${item.category === 'clothing' ? 'selected' : ''}>Одежда</option>
                <option value="footwear" ${item.category === 'footwear' ? 'selected' : ''}>Обувь</option>
                <option value="accessories" ${item.category === 'accessories' ? 'selected' : ''}>Аксессуары</option>
              </select>
            </div>

            <div class="admin-field-group">
              <label class="admin-field-label">ЦЕНА В РУБЛЯХ (ПОД КЛЮЧ):</label>
              <input type="number" class="admin-field-input" data-field="price" data-idx="${idx}" value="${item.price}" step="100">
            </div>

            <div class="admin-field-group">
              <label class="admin-field-label">РАЗМЕРЫ (ЧЕРЕЗ ЗАПЯТУЮ):</label>
              <input type="text" class="admin-field-input" data-field="sizes" data-idx="${idx}" value="${item.sizes}">
            </div>
          </div>

          <button type="button" class="admin-item-remove-btn" data-remove-idx="${idx}" title="Удалить из очереди">&times;</button>
        </div>
      `).join('');

      // Attach sync handlers for user edits in inputs
      queueContainer.querySelectorAll('.admin-field-input, .admin-field-select').forEach(input => {
        input.addEventListener('input', (e) => {
          const index = parseInt(e.target.dataset.idx, 10);
          const field = e.target.dataset.field;
          if (batchItems[index]) {
            batchItems[index][field] = e.target.value;
          }
        });
      });

      // Attach remove handlers
      queueContainer.querySelectorAll('.admin-item-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.removeIdx, 10);
          batchItems.splice(index, 1);
          renderBatchQueue();
        });
      });
    };

    // File Processing (DataURL conversion & AI parsing)
    const processFiles = (files) => {
      const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
      if (fileList.length === 0) return;

      let processedCount = 0;

      fileList.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageSrc = e.target.result;
          const aiData = guessBrandAndDetails(file.name);

          batchItems.push({
            image: imageSrc,
            brand: aiData.brand,
            name: aiData.name,
            region: aiData.region,
            category: aiData.category,
            price: aiData.price,
            sizes: aiData.sizes
          });

          processedCount++;
          if (processedCount === fileList.length) {
            renderBatchQueue();
          }
        };
        reader.readAsDataURL(file);
      });
    };

    // Drag & Drop event bindings
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
          e.preventDefault();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) {
          processFiles(e.dataTransfer.files);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          processFiles(e.target.files);
        }
      });
    }

    // Clear queue
    if (clearQueueBtn) {
      clearQueueBtn.addEventListener('click', () => {
        batchItems = [];
        renderBatchQueue();
      });
    }

    // Publish all batch items
    if (publishAllBtn) {
      publishAllBtn.addEventListener('click', () => {
        if (batchItems.length === 0) return;

        const newProducts = batchItems.map((item, idx) => {
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
            image: item.image
          };
        });

        PRODUCTS = [...newProducts, ...PRODUCTS];
        saveStoredProducts(PRODUCTS);
        renderProducts();

        batchItems = [];
        renderBatchQueue();
        closeAdmin();

        alert(`[OK] // Успешно опубликовано ${newProducts.length} позиций!\nВсе айтемы мгновенно доступны на Главной, в Каталоге и в TikTok-ленте.`);
      });
    }
  }

  /**
   * Initialization
   */
  function init() {
    renderProducts();
    setupFilters();
    setupAddProductModal();
    setupHiddenAdminModal();
    setupModalEvents();
    setupTrayEvents();
    setupCalculator();
    setup3DMonolith();

    // Start Clocks
    updateTelemetryClocks();
    setInterval(updateTelemetryClocks, 1000);
  }

  // Kickoff on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
