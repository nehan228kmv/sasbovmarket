/**
 * SASBOV MARKET — Full Catalogue Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sasbov_market_products_v1';

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
      const stored = localStorage.getItem(STORAGE_KEY);
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
            // Auto-migrate stockType if missing
            if (!p.stockType) {
              if (['sasbov-01', 'sasbov-02', 'sasbov-04', 'sasbov-06'].includes(p.id) || 
                  p.region === 'spb' || 
                  (p.brand && p.brand.includes('BALENCIAGA')) ||
                  (p.dropStatus && p.dropStatus.includes('НАЛИЧИ'))) {
                p.stockType = 'instock';
                p.partner = 'Balkonsky Store (Санкт-Петербург)';
                p.location = 'Санкт-Петербург, Balkonsky Store';
                p.deliveryTime = 'В наличии в СПб // Примерка и самовывоз сегодня';
              } else {
                p.stockType = 'preorder';
                p.partner = null;
                p.location = p.regionLabel || 'Зарубежные площадки';
                p.deliveryTime = 'Выкуп под заказ: 10-18 дней';
              }
            }
            // Auto-migrate condition & description if missing
            if (!p.condition) {
              const def = DEFAULT_PRODUCTS.find(d => d.id === p.id);
              p.condition = def ? def.condition : 'NEW // DEADSTOCK';
            }
            if (p.description === undefined) {
              const def = DEFAULT_PRODUCTS.find(d => d.id === p.id);
              p.description = def ? def.description : '';
            }
            return p;
          });
        }
      }
    } catch (e) {}
    return DEFAULT_PRODUCTS;
  }

  function saveStoredProducts(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function formatRub(num) {
    return Math.round(num).toLocaleString('ru-RU') + ' ₽';
  }

  let PRODUCTS = getStoredProducts();

  const state = {
    activeStock: 'all',
    activeRegion: 'all',
    activeCategory: 'all',
    searchQuery: '',
    selectedProduct: null,
    selectedSize: '',
    selectedSpeed: 'express',
    trayItems: []
  };

  const el = {
    grid: document.getElementById('products-grid'),
    searchInput: document.getElementById('catalog-search-input'),
    resultsCount: document.getElementById('results-count'),
    stockBtns: document.querySelectorAll('.stock-tab-btn'),
    countStockAll: document.getElementById('count-stock-all'),
    countStockInstock: document.getElementById('count-stock-instock'),
    countStockPreorder: document.getElementById('count-stock-preorder'),
    regionBtns: document.querySelectorAll('[data-filter-type="region"]'),
    categoryBtns: document.querySelectorAll('[data-filter-type="category"]'),

    openAddProductBtn: document.getElementById('open-add-product-btn'),
    resetCatalogBtn: document.getElementById('reset-catalog-btn'),
    addModal: document.getElementById('add-product-modal'),
    addModalBackdrop: document.getElementById('add-modal-backdrop'),
    addModalCloseBtn: document.getElementById('add-modal-close-btn'),
    addProductForm: document.getElementById('add-product-form'),

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

    trayDrawer: document.getElementById('tray-drawer'),
    trayBtn: document.getElementById('preorder-tray-btn'),
    trayCloseBtn: document.getElementById('tray-close-btn'),
    trayCountBadge: document.getElementById('tray-count'),
    trayContainer: document.getElementById('tray-items-container'),
    trayFooter: document.getElementById('tray-footer'),
    trayTotalPrice: document.getElementById('tray-total-price'),
    trayCheckoutBtn: document.getElementById('tray-checkout-btn'),

    clockTokyo: document.getElementById('clock-tokyo'),
    clockShanghai: document.getElementById('clock-shanghai'),
    clockMoscow: document.getElementById('clock-moscow')
  };

  function updateStockTabCounts() {
    if (el.countStockAll) el.countStockAll.textContent = PRODUCTS.length;
    if (el.countStockInstock) el.countStockInstock.textContent = PRODUCTS.filter(p => p.stockType === 'instock').length;
    if (el.countStockPreorder) el.countStockPreorder.textContent = PRODUCTS.filter(p => p.stockType === 'preorder').length;
  }

  function renderProducts() {
    if (!el.grid) return;
    updateStockTabCounts();

    const filtered = PRODUCTS.filter(p => {
      const matchStock = state.activeStock === 'all' || p.stockType === state.activeStock;
      const matchRegion = state.activeRegion === 'all' || p.region === state.activeRegion || (state.activeRegion === 'spb' && p.stockType === 'instock');
      const matchCategory = state.activeCategory === 'all' || p.category === state.activeCategory;
      const matchSearch = !state.searchQuery || 
        p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
        p.brand.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        (p.partner && p.partner.toLowerCase().includes(state.searchQuery.toLowerCase()));
      
      return matchStock && matchRegion && matchCategory && matchSearch;
    });

    if (el.resultsCount) {
      el.resultsCount.textContent = `Показано ${filtered.length} из ${PRODUCTS.length} позиций`;
    }

    if (filtered.length === 0) {
      el.grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px;">
          <p style="font-family: var(--font-mono); font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">// НИЧЕГО НЕ НАЙДЕНО</p>
          <p style="font-size: 0.9rem;">Попробуйте выбрать другой фильтр (например, «Все дропы») или сбросьте параметры поиска.</p>
        </div>
      `;
      return;
    }

    el.grid.innerHTML = filtered.map(product => {
      const sizesHtml = product.sizes.slice(0, 4).map(s => `<span class="size-pill">${s}</span>`).join('');
      const moreSizes = product.sizes.length > 4 ? `<span class="size-pill">+${product.sizes.length - 4}</span>` : '';

      const images = (Array.isArray(product.images) && product.images.length > 0)
        ? product.images.filter(Boolean)
        : (product.image ? [product.image] : []);

      const isInstock = product.stockType === 'instock';
      const originBadge = isInstock 
        ? `<span class="origin-badge badge-instock">✦ В НАЛИЧИИ // СПБ</span>`
        : `<span class="origin-badge ${product.badgeClass}">${product.regionLabel}</span>`;

      const partnerTag = isInstock
        ? `<span class="partner-store-pill">📍 СПБ // BALKONSKY STORE (Примерка / СДЭК 1-2 дня)</span>`
        : '';

      const mainActionBtn = isInstock
        ? `<button type="button" class="btn btn-instock-buy btn-block open-preorder-btn" data-id="${product.id}">КУПИТЬ В СПБ (BALKONSKY)</button>`
        : `<button type="button" class="btn btn-primary btn-block open-preorder-btn" data-id="${product.id}">ПРЕДЗАКАЗАТЬ</button>`;

      let imageContent = '';
      if (images.length === 0) {
        imageContent = `
          <div class="slot-center-placeholder">
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

      const condition = product.condition || 'NEW // DEADSTOCK';
      const conditionClass = condition.toLowerCase().includes('deadstock') || condition.toLowerCase().includes('новое')
        ? 'deadstock'
        : (condition.toLowerCase().includes('vintage') || condition.toLowerCase().includes('винтаж') ? 'vintage' : '');
      const conditionBadge = `<span class="product-condition-pill ${conditionClass}">● ${condition}</span>`;

      const descriptionHtml = product.description
        ? `<p class="product-mini-desc">${product.description}</p>`
        : '';

      return `
        <article class="product-card ${isInstock ? 'is-instock' : ''}" data-product-id="${product.id}">
          <div class="product-slot-frame">
            <div class="slot-hud-corner slot-hud-tl"></div>
            <div class="slot-hud-corner slot-hud-tr"></div>
            <div class="slot-hud-corner slot-hud-bl"></div>
            <div class="slot-hud-corner slot-hud-br"></div>

            ${imageContent}

            <div class="slot-inner-content">
              <div class="slot-top-row">
                ${originBadge}
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

          <div class="product-info">
            <div class="product-brand-row">
              <span class="product-brand">${product.brand}</span>
              ${conditionBadge}
            </div>
            <h3 class="product-name">${product.name}</h3>
            ${partnerTag}
            ${descriptionHtml}

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
                <span class="price-detail">${isInstock ? 'в наличии в СПб' : 'под ключ с доставкой'}</span>
              </div>
            </div>

            <div class="card-actions">
              ${mainActionBtn}
              <button type="button" class="btn btn-outline quick-add-tray-btn" data-id="${product.id}" title="Добавить в поднос предзаказов">
                +
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

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

  function setupFilters() {
    el.stockBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.stockBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeStock = btn.dataset.stockFilter || 'all';
        renderProducts();
      });
    });

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

    if (el.resetCatalogBtn) {
      el.resetCatalogBtn.addEventListener('click', () => {
        if (confirm('Сбросить каталог к оригинальным позициям?')) {
          localStorage.removeItem('sasbov_products_v2');
          PRODUCTS = getStoredProducts();
          renderProducts();
        }
      });
    }
  }

  function setupAddProductModal() {
    if (el.openAddProductBtn && el.addModal) {
      el.openAddProductBtn.addEventListener('click', () => el.addModal.showModal());
    }

    const closeAddModal = () => {
      if (el.addModal && el.addModal.open) el.addModal.close();
    };

    if (el.addModalCloseBtn) el.addModalCloseBtn.addEventListener('click', closeAddModal);
    if (el.addModalBackdrop) el.addModalBackdrop.addEventListener('click', closeAddModal);

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
            stockType: 'preorder',
            closingIn: '03 дн. 12:00',
            image: imageSrc || null
          };

          PRODUCTS.unshift(newProduct);
          saveStoredProducts(PRODUCTS);
          renderProducts();
          closeAddModal();
          el.addProductForm.reset();
        };

        if (fileInput?.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => createAndInsert(event.target.result);
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          createAndInsert(imageUrlInput || null);
        }
      });
    }
  }

  function openPreorderModal(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product || !el.modal) return;

    state.selectedProduct = product;
    state.selectedSize = product.sizes[0] || 'Стандарт';

    const isInstock = product.stockType === 'instock';
    const speedWrap = document.getElementById('modal-speed-wrap');
    const pricingTitle = document.getElementById('modal-pricing-title');
    const pricingNote = document.getElementById('modal-pricing-note');
    const balkonskyBox = document.getElementById('modal-balkonsky-box');

    if (isInstock) {
      if (speedWrap) speedWrap.style.display = 'none';
      if (pricingTitle) pricingTitle.textContent = 'Цена в наличии (Санкт-Петербург):';
      if (pricingNote) pricingNote.textContent = 'Примерка и покупка в шоуруме Balkonsky Store или доставка курьером / СДЭК.';
      if (balkonskyBox) balkonskyBox.style.display = 'flex';

      el.modalRegionTag.className = 'origin-badge badge-instock';
      el.modalRegionTag.textContent = '✦ В НАЛИЧИИ: СПБ // BALKONSKY STORE';
      el.modalItemSku.textContent = `АРТИКУЛ: ${product.sku} // НАЛИЧИЕ В СПБ: ПРИМЕРКА И САМОВЫВОЗ СЕГОДНЯ`;
      if (el.modalSubmitTgBtn) {
        el.modalSubmitTgBtn.className = 'btn btn-instock-buy btn-block';
        el.modalSubmitTgBtn.innerHTML = `<span>КУПИТЬ / ЗАБРОНИРОВАТЬ В BALKONSKY STORE (СПБ)</span>`;
      }
    } else {
      if (speedWrap) speedWrap.style.display = 'block';
      if (pricingTitle) pricingTitle.textContent = 'Стоимость предзаказа под ключ:';
      if (pricingNote) pricingNote.textContent = 'Включает выкуп, легитчек на складе в Азии и доставку в РФ.';
      if (balkonskyBox) balkonskyBox.style.display = 'none';

      el.modalRegionTag.className = `origin-badge ${product.badgeClass}`;
      el.modalRegionTag.textContent = product.regionLabel;
      el.modalItemSku.textContent = `АРТИКУЛ: ${product.sku} // ДЕДЛАЙН: ${product.closingIn}`;
      if (el.modalSubmitTgBtn) {
        el.modalSubmitTgBtn.className = 'btn btn-primary btn-block';
        el.modalSubmitTgBtn.innerHTML = `<span>ОФОРМИТЬ ПРЕДЗАКАЗ В TELEGRAM</span>`;
      }
    }

    el.modalItemTitle.textContent = `${product.brand} — ${product.name}`;
    el.modalPriceVal.textContent = formatRub(product.basePriceRub);

    const conditionEl = document.getElementById('modal-condition-val');
    if (conditionEl) {
      conditionEl.textContent = `● ${product.condition || 'NEW // DEADSTOCK'}`;
    }

    const descEl = document.getElementById('modal-desc-text');
    const descWrap = document.getElementById('modal-desc-wrap');
    if (descEl && descWrap) {
      if (product.description) {
        descEl.textContent = product.description;
        descWrap.style.display = 'block';
      } else {
        descWrap.style.display = 'none';
      }
    }

    const firstImg = (Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : product.image;
    if (firstImg) {
      el.modalImgPreview.innerHTML = `
        <img src="${firstImg}" alt="${product.brand} - ${product.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
      `;
    } else {
      el.modalImgPreview.innerHTML = `
        <div class="slot-badge">ПРЕВЬЮ СЛОТА // ${product.brand}</div>
        <div class="slot-hud-brackets"></div>
      `;
    }

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

    el.modal.showModal();
  }

  function closePreorderModal() {
    if (el.modal && el.modal.open) el.modal.close();
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
        const isInstock = p.stockType === 'instock';
        let messageText = '';

        if (isInstock) {
          messageText = 
`Здравствуйте! Хочу забронировать / купить позицию из наличия в Санкт-Петербурге:
— Товар: ${p.brand} ${p.name}
— Состояние: ${p.condition || 'NEW // DEADSTOCK'}
— Артикул: ${p.sku}
— Размер: ${state.selectedSize}
— Локация: Санкт-Петербург, Balkonsky Store (ул. Тверская 3/1, Подъезд 2)
— Условия: Примерка / самовывоз в СПб день-в-день, отправка СДЭК 1-2 дня
— Стоимость: ${formatRub(p.basePriceRub)}
${p.description ? `— Описание: ${p.description}\n` : ''}
Подтвердите наличие на точке и забронируйте вещь за мной!`;

          const tgUrl = `https://t.me/sasbov?text=${encodeURIComponent(messageText)}`;
          window.open(tgUrl, '_blank', 'noopener,noreferrer');
          closePreorderModal();
        } else {
          const selectedSpeedVal = Array.from(el.modalSpeedRadios).find(r => r.checked)?.value || 'Авиа-экспресс (7-10 дней)';
          messageText = 
`Здравствуйте! Хочу оформить предзаказ в SASBOV MARKET (выкуп с зарубежных площадок):
— Товар: ${p.brand} ${p.name}
— Состояние: ${p.condition || 'NEW // DEADSTOCK'}
— Артикул: ${p.sku}
— Размер: ${state.selectedSize}
— Регион / Площадка: ${p.regionLabel}
— Тариф доставки: ${selectedSpeedVal}
— Стоимость под ключ: ${formatRub(p.basePriceRub)}
${p.description ? `— Описание: ${p.description}\n` : ''}
Подтвердите возможность выкупа и пришлите реквизиты!`;

          const tgUrl = `https://t.me/sasbovstore?text=${encodeURIComponent(messageText)}`;
          window.open(tgUrl, '_blank', 'noopener,noreferrer');
          closePreorderModal();
        }
      });
    }
  }

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
    if (el.trayCountBadge) el.trayCountBadge.textContent = state.trayItems.length;
    if (!el.trayContainer) return;

    if (state.trayItems.length === 0) {
      el.trayContainer.innerHTML = `
        <div class="tray-empty">
          <p>Вы пока не добавили вещи в предзаказ.</p>
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
        <button type="button" class="tray-item-remove" data-item-id="${item.id}">✕</button>
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
          `${idx + 1}. ${item.brand} ${item.name} (Разм: ${item.size}) — ${formatRub(item.price)}`
        ).join('\n');

        const messageText = 
`Здравствуйте! Хочу оформить пакетный предзаказ в SASBOV MARKET:
${listText}
— Итого под ключ: ${formatRub(total)}
Жду реквизиты!`;

        const tgUrl = `https://t.me/sasbovstore?text=${encodeURIComponent(messageText)}`;
        window.open(tgUrl, '_blank', 'noopener,noreferrer');
        closeTray();
      });
    }
  }

  function updateTelemetryClocks() {
    const now = new Date();
    const formatTime = (timeZone) => new Intl.DateTimeFormat('ru-RU', {
      timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(now);

    if (el.clockTokyo) el.clockTokyo.textContent = `TYO: ${formatTime('Asia/Tokyo')} JST`;
    if (el.clockShanghai) el.clockShanghai.textContent = `SHA: ${formatTime('Asia/Shanghai')} CST`;
    if (el.clockMoscow) el.clockMoscow.textContent = `MSK: ${formatTime('Europe/Moscow')} MSK`;
  }

  async function fetchCloudProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          saveStoredProducts(json.data);
          PRODUCTS = getStoredProducts();
          renderProducts();
        }
      }
    } catch (e) {}
  }

  function init() {
    renderProducts();
    setupFilters();
    setupAddProductModal();
    setupModalEvents();
    setupTrayEvents();
    updateTelemetryClocks();
    setInterval(updateTelemetryClocks, 1000);

    // Initial background sync with Vercel Database API
    fetchCloudProducts();

    // Cross-tab real-time synchronization with Admin Panel
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY || e.key === 'sasbov_market_sync_ts') {
        PRODUCTS = getStoredProducts();
        renderProducts();
      }
    });
    window.addEventListener('sasbov:products_updated', (e) => {
      if (Array.isArray(e.detail)) {
        PRODUCTS = e.detail;
      } else {
        PRODUCTS = getStoredProducts();
      }
      renderProducts();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
