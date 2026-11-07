/**
 * SASBOV MARKET — Standalone Product Page Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sasbov_market_products_v1';
  const TRAY_STORAGE_KEY = 'sasbov_market_tray_items_v1';

  let currentProduct = null;
  let allProducts = [];
  let currentImages = [];
  let activeImageIdx = 0;
  let selectedSize = '';
  let trayItems = [];

  // DOM Elements
  const el = {
    docTitle: document.getElementById('doc-title'),
    metaDesc: document.getElementById('meta-desc'),
    canonicalUrl: document.getElementById('canonical-url'),
    ogTitle: document.getElementById('og-title'),
    ogDesc: document.getElementById('og-desc'),
    ogImage: document.getElementById('og-image'),
    crumbBrand: document.getElementById('crumb-brand'),
    crumbBrandSep: document.getElementById('crumb-brand-sep'),
    crumbProduct: document.getElementById('crumb-product'),
    mainImg: document.getElementById('main-product-img'),
    mainVisualBox: document.getElementById('main-visual-box'),
    originBadge: document.getElementById('p-origin-badge'),
    conditionPill: document.getElementById('p-condition-pill'),
    prevBtn: document.getElementById('gallery-prev'),
    nextBtn: document.getElementById('gallery-next'),
    galleryCounter: document.getElementById('gallery-counter'),
    zoomBtn: document.getElementById('gallery-zoom'),
    thumbnailsStrip: document.getElementById('thumbnails-strip'),
    brand: document.getElementById('p-brand'),
    sku: document.getElementById('p-sku'),
    name: document.getElementById('p-name'),
    pricingCard: document.getElementById('pricing-card'),
    price: document.getElementById('p-price'),
    priceCaption: document.getElementById('p-price-caption'),
    dropStatus: document.getElementById('p-drop-status'),
    deliveryNoticeBox: document.getElementById('delivery-notice-box'),
    deliveryIcon: document.getElementById('delivery-icon'),
    deliveryText: document.getElementById('delivery-text'),
    sizesGrid: document.getElementById('p-sizes-grid'),
    btnTgOrder: document.getElementById('btn-tg-order'),
    btnAddTray: document.getElementById('btn-add-tray'),
    btnShareItem: document.getElementById('btn-share-item'),
    descBox: document.getElementById('product-desc-box'),
    descText: document.getElementById('p-desc'),
    specsBox: document.getElementById('product-specs-box'),
    specsGrid: document.getElementById('specs-grid'),
    editorialBox: document.getElementById('product-editorial-box'),
    editorialTitle: document.getElementById('editorial-title'),
    editorialExcerpt: document.getElementById('editorial-excerpt'),
    editorialLink: document.getElementById('editorial-link'),
    relatedGrid: document.getElementById('related-grid'),
    lightbox: document.getElementById('product-lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close'),
    trayDrawer: document.getElementById('tray-drawer'),
    trayItemsContainer: document.getElementById('tray-items-container'),
    trayFooter: document.getElementById('tray-footer'),
    trayTotalVal: document.getElementById('tray-total-val'),
    trayCloseBtn: document.getElementById('tray-close-btn'),
    trayCountBadges: document.querySelectorAll('#tray-count, .footer-tray-count'),
    trayOpenBtns: document.querySelectorAll('#preorder-tray-btn, #footer-tray-btn'),
    traySubmitTgBtn: document.getElementById('tray-submit-tg-btn'),
    mobileNavToggle: document.getElementById('mobile-nav-toggle'),
    mobileDrawer: document.getElementById('mobile-drawer'),
    mobileDrawerOverlay: document.getElementById('mobile-drawer-overlay'),
    mobileDrawerClose: document.getElementById('mobile-drawer-close'),
    themePillBtns: document.querySelectorAll('.theme-pill-btn[data-theme-val]'),
    randomPosterBtns: document.querySelectorAll('.poster-switch-btn, #btn-random-poster, #footer-btn-random-poster'),
    ambientPosterImg: document.getElementById('ambient-poster-img')
  };

  function formatRub(num) {
    if (!num || isNaN(num)) return '0 ₽';
    return Math.round(Number(num)).toLocaleString('ru-RU') + ' ₽';
  }

  function showToast(msg) {
    let t = document.getElementById('product-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'product-toast';
      t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(15,15,22,0.95);backdrop-filter:blur(16px);border:1px solid #00f0ff;color:#ffffff;padding:10px 20px;border-radius:24px;font-family:var(--font-mono);font-size:0.8rem;font-weight:600;z-index:99999;box-shadow:0 10px 35px rgba(0,240,255,0.3);letter-spacing:0.02em;pointer-events:none;transition:opacity 0.25s ease;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2400);
  }

  // Load Tray items from localStorage
  function loadTray() {
    try {
      const stored = localStorage.getItem(TRAY_STORAGE_KEY);
      if (stored) {
        trayItems = JSON.parse(stored);
        if (!Array.isArray(trayItems)) trayItems = [];
      }
    } catch (e) {
      trayItems = [];
    }
    updateTrayBadges();
  }

  function saveTray() {
    try {
      localStorage.setItem(TRAY_STORAGE_KEY, JSON.stringify(trayItems));
    } catch (e) {}
    updateTrayBadges();
  }

  function updateTrayBadges() {
    el.trayCountBadges.forEach(b => {
      b.textContent = trayItems.length;
    });
  }

  function renderTray() {
    if (!el.trayItemsContainer) return;
    if (trayItems.length === 0) {
      el.trayItemsContainer.innerHTML = `
        <div class="tray-empty">
          <p>В корзине предзаказов пока пусто.</p>
          <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #8e8e93;">Добавляйте любые айтемы для единого пакетного выкупа.</p>
        </div>
      `;
      if (el.trayFooter) el.trayFooter.style.display = 'none';
      return;
    }

    const total = trayItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
    if (el.trayTotalVal) el.trayTotalVal.textContent = formatRub(total);
    if (el.trayFooter) el.trayFooter.style.display = 'block';

    el.trayItemsContainer.innerHTML = trayItems.map(item => `
      <div class="tray-item">
        <div class="tray-item-info">
          <div class="tray-item-brand">${item.brand || ''}</div>
          <div class="tray-item-title">${item.name}</div>
          <div class="tray-item-meta">
            <span class="tray-item-size-tag">Размер: ${item.size}</span>
            <span class="tray-item-price-tag">${formatRub(item.price)}</span>
          </div>
        </div>
        <button type="button" class="btn-remove-tray-item" data-tray-id="${item.id}" aria-label="Удалить позицию" title="Удалить">&times;</button>
      </div>
    `).join('');

    el.trayItemsContainer.querySelectorAll('.btn-remove-tray-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.trayId;
        trayItems = trayItems.filter(it => it.id !== id);
        saveTray();
        renderTray();
      });
    });
  }

  function openTray() {
    renderTray();
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

  // Fetch Products
  async function fetchProducts() {
    // 1. Try local API
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          allProducts = json.data;
          return allProducts;
        }
      }
    } catch (e) {}

    // 2. Try static products.json
    try {
      const res = await fetch('data/products.json');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          allProducts = list;
          return allProducts;
        }
      }
    } catch (e) {}

    // 3. Fallback localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) {
          allProducts = list;
          return allProducts;
        }
      }
    } catch (e) {}

    return [];
  }

  function renderGallery() {
    if (!currentImages.length) {
      el.mainImg.src = '/uploads/poster_travis_jordan.jpg';
      el.thumbnailsStrip.innerHTML = '';
      el.galleryCounter.textContent = '1 / 1';
      return;
    }

    if (activeImageIdx >= currentImages.length) activeImageIdx = 0;
    if (activeImageIdx < 0) activeImageIdx = currentImages.length - 1;

    el.mainImg.style.opacity = '0.3';
    setTimeout(() => {
      el.mainImg.src = currentImages[activeImageIdx];
      el.mainImg.alt = `${currentProduct.brand} ${currentProduct.name} — фото оригинала, легитчек SASBOV MARKET (ракурс ${activeImageIdx + 1})`;
      el.mainImg.style.opacity = '1';
    }, 120);

    el.galleryCounter.textContent = `${activeImageIdx + 1} / ${currentImages.length}`;

    // Show/hide arrows if single photo
    const showArrows = currentImages.length > 1;
    el.prevBtn.style.display = showArrows ? 'flex' : 'none';
    el.nextBtn.style.display = showArrows ? 'flex' : 'none';

    // Render thumbnails
    if (currentImages.length > 1) {
      el.thumbnailsStrip.style.display = 'flex';
      el.thumbnailsStrip.innerHTML = currentImages.map((src, idx) => `
        <div class="product-thumb-item ${idx === activeImageIdx ? 'active' : ''}" data-thumb-idx="${idx}">
          <img src="${src}" alt="${currentProduct.brand} ${currentProduct.name} — ракурс ${idx + 1}" loading="lazy">
        </div>
      `).join('');

      el.thumbnailsStrip.querySelectorAll('.product-thumb-item').forEach(th => {
        th.addEventListener('click', () => {
          activeImageIdx = parseInt(th.dataset.thumbIdx, 10);
          renderGallery();
        });
      });
    } else {
      el.thumbnailsStrip.style.display = 'none';
      el.thumbnailsStrip.innerHTML = '';
    }
  }

  function updateOrderTgLink() {
    if (!currentProduct) return;
    const isInstock = currentProduct.stockType === 'instock';
    const cleanUrl = window.location.origin + window.location.pathname + '?id=' + currentProduct.id;

    let msg = '';
    if (isInstock) {
      msg = 
`Здравствуйте! Хочу забронировать / купить позицию из НАЛИЧИЯ (Санкт-Петербург):
— Товар: ${currentProduct.brand} — ${currentProduct.name}
— Артикул: ${currentProduct.sku}
— Состояние: ${currentProduct.condition || 'NEW // DEADSTOCK'}
— Размер: ${selectedSize || 'Стандарт'}
— Стоимость: ${formatRub(currentProduct.basePriceRub)}
— Локация: Санкт-Петербург, Balkonsky Store (Невский просп., 110В)
— Ссылка на айтем: ${cleanUrl}

Подтвердите наличие на точке и забронируйте вещь за мной!`;
    } else {
      msg = 
`Здравствуйте! Хочу оформить предзаказ под ключ:
— Товар: ${currentProduct.brand} — ${currentProduct.name}
— Артикул: ${currentProduct.sku}
— Состояние: ${currentProduct.condition || 'NEW // DEADSTOCK'}
— Размер: ${selectedSize || 'Стандарт'}
— Стоимость: ${formatRub(currentProduct.basePriceRub)}
— Площадка / Логистика: ${currentProduct.regionLabel || 'Зарубежный выкуп: 10-18 дней'}
— Ссылка на айтем: ${cleanUrl}

Подтвердите возможность выкупа на зарубежной площадке и пришлите реквизиты!`;
    }

    el.btnTgOrder.href = `https://t.me/Sasbov?text=${encodeURIComponent(msg)}`;
  }

  function renderProduct(p) {
    currentProduct = p;

    // Collect all photos
    const rawImages = (Array.isArray(p.images) && p.images.length > 0)
      ? p.images.filter(Boolean)
      : (p.image ? [p.image] : []);
    currentImages = rawImages.length > 0 ? rawImages : ['/uploads/poster_travis_jordan.jpg'];
    activeImageIdx = 0;

    // Default sizes
    const sizes = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ['ONE SIZE'];
    selectedSize = sizes[0];

    // Page Titles & Meta
    const fullTitle = `${p.brand} — ${p.name} | SASBOV MARKET`;
    el.docTitle.textContent = fullTitle;
    if (el.ogTitle) el.ogTitle.content = fullTitle;
    if (el.metaDesc) el.metaDesc.content = `${p.brand} — ${p.name}. Оригинал 100%, легитчек, цена ${formatRub(p.basePriceRub)}. Быстрый предзаказ или примерка в шоуруме СПб.`;
    if (el.ogImage) el.ogImage.content = currentImages[0].startsWith('http') ? currentImages[0] : window.location.origin + currentImages[0];
    if (el.canonicalUrl) el.canonicalUrl.href = window.location.origin + window.location.pathname + '?id=' + p.id;

    // Breadcrumbs
    if (p.brand) {
      el.crumbBrand.textContent = p.brand;
      el.crumbBrand.href = `catalog.html?search=${encodeURIComponent(p.brand)}`;
      el.crumbBrand.style.display = 'inline';
      el.crumbBrandSep.style.display = 'inline';
    }
    el.crumbProduct.textContent = p.name;

    // Origin & Condition Badges
    const isInstock = p.stockType === 'instock';
    if (isInstock) {
      el.originBadge.className = 'origin-badge badge-instock';
      el.originBadge.textContent = 'В НАЛИЧИИ: СПБ // BALKONSKY STORE';
      el.pricingCard.classList.add('is-instock');
      el.dropStatus.textContent = 'В НАЛИЧИИ (СПБ)';
      el.dropStatus.className = 'drop-status-pill instock';
      el.priceCaption.textContent = 'в наличии в Санкт-Петербурге // самовывоз сегодня';
      el.deliveryIcon.textContent = '📍';
      el.deliveryText.innerHTML = `<strong>Наличие в Санкт-Петербурге:</strong> Оффлайн-шоурум Balkonsky Store (Невский просп., 110В). Примерка и покупка сегодня до 22:00, курьер по СПб за 2 часа, экспресс-отправка СДЭК 1-2 дня.`;
      el.btnTgOrder.className = 'btn btn-instock-buy btn-product-tg instock';
      el.btnTgOrder.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.92 9.07c-.14.65-.53.81-1.07.51l-2.97-2.19-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.04 5.53-5c.24-.22-.05-.34-.38-.13l-6.84 4.3-2.95-.92c-.64-.2-.65-.64.13-.95l11.53-4.44c.53-.2 1 .12.89.82z"/></svg>
        <span>КУПИТЬ В СПБ // BALKONSKY STORE</span>
      `;
    } else {
      el.originBadge.className = `origin-badge ${p.badgeClass || 'glb'}`;
      el.originBadge.textContent = p.regionLabel || 'GLOBAL PREORDER';
      el.pricingCard.classList.remove('is-instock');
      el.dropStatus.textContent = p.dropStatus || 'ПРЕДЗАКАЗ ОТКРЫТ';
      el.dropStatus.className = 'drop-status-pill';
      el.priceCaption.textContent = 'под ключ с выкупом, легитчеком и доставкой в РФ';
      el.deliveryIcon.textContent = '✈️';
      el.deliveryText.innerHTML = `<strong>Сроки и логистика (${p.regionLabel || 'Зарубеж'}):</strong> Срок доставки 10-18 дней в РФ. Включает выкуп на авторизованных площадках, двойной легитчек на складе в Азии, страховку груза и доставку СДЭК до двери.`;
      el.btnTgOrder.className = 'btn btn-primary btn-product-tg';
      el.btnTgOrder.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.92 9.07c-.14.65-.53.81-1.07.51l-2.97-2.19-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.04 5.53-5c.24-.22-.05-.34-.38-.13l-6.84 4.3-2.95-.92c-.64-.2-.65-.64.13-.95l11.53-4.44c.53-.2 1 .12.89.82z"/></svg>
        <span>ОФОРМИТЬ ПРЕДЗАКАЗ В TELEGRAM</span>
      `;
    }

    const condition = p.condition || 'NEW // DEADSTOCK';
    el.conditionPill.textContent = `● ${condition}`;
    el.brand.textContent = p.brand;
    el.name.textContent = p.name;
    el.sku.textContent = `АРТИКУЛ: ${p.sku || 'SASBOV-ITEM'}`;
    el.price.textContent = formatRub(p.basePriceRub);

    // Sizes Grid
    el.sizesGrid.innerHTML = sizes.map((s, idx) => `
      <button type="button" class="product-size-pill ${idx === 0 ? 'active' : ''}" data-size="${s}">
        ${s}
      </button>
    `).join('');

    el.sizesGrid.querySelectorAll('.product-size-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        el.sizesGrid.querySelectorAll('.product-size-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.dataset.size;
        updateOrderTgLink();
      });
    });

    // Description
    if (p.description) {
      el.descText.textContent = p.description;
      el.descBox.style.display = 'block';
    } else {
      el.descText.textContent = `Аутентичный айтем ${p.brand} ${p.name}. Доступен к заказу через закрытые маркеты и архивные бутики. Полная гарантия оригинальности, легитчек на физическом складе перед отправкой, фирменная упаковка.`;
    }

    // Specifications & Editorial Cross-linking
    const cleanUrl = window.location.origin + window.location.pathname + '?id=' + p.id;
    renderSpecs(p, isInstock);
    renderEditorial(p);
    renderJsonLd(p, isInstock, cleanUrl);

    // Gallery
    renderGallery();
    updateOrderTgLink();

    // Related Products
    renderRelatedProducts(p);
  }

  function renderSpecs(p, isInstock) {
    if (!el.specsGrid) return;
    const condition = p.condition || 'NEW // DEADSTOCK';
    const locText = isInstock 
      ? 'Шоурум Балконский (СПб, Невский просп., 110В) — примерка и самовывоз сегодня'
      : `${p.regionLabel || 'Зарубежный выкуп'} — авиа-доставка 7–12 рабочих дней`;

    el.specsGrid.innerHTML = `
      <div class="spec-item">
        <span class="spec-label">БРЕНД:</span>
        <span class="spec-val">${p.brand}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">МОДЕЛЬ:</span>
        <span class="spec-val">${p.name}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">АРТИКУЛ (SKU):</span>
        <span class="spec-val">${p.sku || 'SASBOV-ORIGIN'}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">СОСТОЯНИЕ:</span>
        <span class="spec-val">${condition}</span>
      </div>
      <div class="spec-item" style="grid-column: 1 / -1;">
        <span class="spec-label">ЛОГИСТИКА И НАЛИЧИЕ:</span>
        <span class="spec-val">${locText}</span>
      </div>
      <div class="spec-item" style="grid-column: 1 / -1;">
        <span class="spec-label">АУТЕНТИФИКАЦИЯ:</span>
        <span class="spec-val" style="color: #00f0ff;">100% Legit Check — тройной экспертный контроль, лабораторные пломбы Poizon</span>
      </div>
    `;
  }

  function renderEditorial(p) {
    if (!el.editorialBox || !el.editorialTitle || !el.editorialLink) return;
    const b = (p.brand || '').toLowerCase();
    let match = null;

    if (b.includes('stone island') || b.includes('c.p. company') || b.includes('cp company')) {
      match = {
        title: 'Гид по проверке оригинальности Stone Island & C.P. Company',
        excerpt: 'Как проверять Certilogo, пуговицы, микрокоды, патчи и швы на архивных и свежих коллекциях.',
        url: '/blog-stone-island-legit-check'
      };
    } else if (b.includes('arc\'teryx') || b.includes('arcteryx')) {
      match = {
        title: 'Arc\'teryx и феномен Gorpcore: технологии и архивы',
        excerpt: 'Разбор мембран GORE-TEX Pro, линеек Alpha/Beta/Veilance и защиты от азиатских подделок.',
        url: '/blog-arcteryx-gorpcore'
      };
    } else if (b.includes('stussy') || b.includes('stüssy')) {
      match = {
        title: 'Феномен Stüssy: от калифорнийского серфинга до мирового хайпа',
        excerpt: 'История бренда, знаковые коллаборации с Nike и правильный подбор оверсайз-посадки.',
        url: '/blog-stussy'
      };
    } else if (b.includes('rick owens')) {
      match = {
        title: 'Rick Owens: темный авангард, геометрия и культовые силуэты',
        excerpt: 'Культовые кроссовки Ramones и Geobasket: материалы кожи, подошвы и проверка подлинности.',
        url: '/blog-rick-owens'
      };
    } else if (b.includes('denim tears')) {
      match = {
        title: 'Denim Tears: хлопковый венок и культурный код Tremaine Emory',
        excerpt: 'Разбор знаковых джинсов с венками, коллаборации с Levi\'s и выкуп редких расцветок.',
        url: '/blog-denim-tears'
      };
    } else if (b.includes('corteiz')) {
      match = {
        title: 'Corteiz RTW: восстание лондонского андерграунда',
        excerpt: 'Как Clint419 перевернул правила стритвира и почему за вещами охотятся коллекционеры.',
        url: '/blog-corteiz'
      };
    } else if (b.includes('sp5der') || b.includes('spider')) {
      match = {
        title: 'Sp5der Worldwide: психоделика и стразы от Young Thug',
        excerpt: 'Секреты культовых худи со стразами, паутиной и проверка оригинальности принтов.',
        url: '/blog-sp5der'
      };
    } else if (b.includes('hellstar')) {
      match = {
        title: 'Hellstar: эстетика падших звезд и космический панк',
        excerpt: 'Винтажные стирки, тяжелый плотный хлопок и защита от фейков на вторичном рынке.',
        url: '/blog-hellstar'
      };
    } else if (b.includes('kith')) {
      match = {
        title: 'Kith: империя Ронни Файга и эстетика Нью-Йорка',
        excerpt: 'Премиальные ткани, лимитированные дропы и коллаборации с мировыми брендами.',
        url: '/blog-kith-ny'
      };
    } else if (b.includes('vetements') || b.includes('balenciaga')) {
      match = {
        title: 'Vetements и Balenciaga: постирония и оверсайз Демны',
        excerpt: 'Культовые принты, пропорции кроя и детали проверки подлинности бирки и плотности хлопка.',
        url: '/blog-vetements'
      };
    } else if (b.includes('gallery dept')) {
      match = {
        title: 'Gallery Dept: винтажная кастомизация и арт-стритвир',
        excerpt: 'Масляные брызги, клешеные винтажные брюки и архивные силуэты Josué Thomas.',
        url: '/blog-gallery-dept'
      };
    } else if (p.stockType === 'instock') {
      match = {
        title: 'Гараж-сейл и шоурум Балконский в Санкт-Петербурге',
        excerpt: 'Как устроен наш оффлайн-шоурум на Невском 110В: живая примерка, самовывоз и редкие дропы.',
        url: '/blog-garagesale-spb'
      };
    } else {
      match = {
        title: 'Как работает выкуп с Poizon и лаборатория верификации',
        excerpt: 'Полный гид по проверке обуви и одежды: ультрафиолет, микрокоды, фирменные пломбы и QR-сертификаты.',
        url: '/blog-poizon-guide'
      };
    }

    if (match) {
      el.editorialTitle.textContent = match.title;
      if (el.editorialExcerpt) el.editorialExcerpt.textContent = match.excerpt;
      el.editorialLink.href = match.url;
      el.editorialBox.style.display = 'block';
    } else {
      el.editorialBox.style.display = 'none';
    }
  }

  function renderJsonLd(p, isInstock, cleanUrl) {
    let scriptTag = document.getElementById('product-jsonld');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'product-jsonld';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const imgs = currentImages.map(img => img.startsWith('http') ? img : (window.location.origin + img));

    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          "name": `${p.brand} ${p.name}`,
          "image": imgs,
          "description": p.description || `Оригинальный айтем ${p.brand} ${p.name}. Проверен экспертами SASBOV MARKET. Доставка по РФ или самовывоз в шоуруме Санкт-Петербурга.`,
          "sku": p.sku || `SASBOV-${p.id}`,
          "mpn": p.sku || `SASBOV-${p.id}`,
          "brand": {
            "@type": "Brand",
            "name": p.brand
          },
          "offers": {
            "@type": "Offer",
            "url": cleanUrl,
            "priceCurrency": "RUB",
            "price": p.basePriceRub || 0,
            "priceValidUntil": "2026-12-31",
            "itemCondition": (p.condition && p.condition.toLowerCase().includes('deadstock')) 
              ? "https://schema.org/NewCondition" 
              : "https://schema.org/UsedCondition",
            "availability": isInstock ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
            "seller": {
              "@type": "Organization",
              "name": "SASBOV MARKET",
              "url": "https://sasbov.online"
            }
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Главная",
              "item": "https://sasbov.online/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Каталог",
              "item": "https://sasbov.online/catalog"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": p.brand,
              "item": `https://sasbov.online/catalog?search=${encodeURIComponent(p.brand)}`
            },
            {
              "@type": "ListItem",
              "position": 4,
              "name": p.name,
              "item": cleanUrl
            }
          ]
        }
      ]
    };

    scriptTag.textContent = JSON.stringify(schema, null, 2);
  }

  function renderRelatedProducts(p) {
    if (!el.relatedGrid || !allProducts.length) return;

    let related = allProducts.filter(item => item.id !== p.id && (item.category === p.category || item.brand === p.brand));
    if (related.length < 4) {
      const rest = allProducts.filter(item => item.id !== p.id && !related.includes(item));
      related = related.concat(rest);
    }
    related = related.slice(0, 4);

    el.relatedGrid.innerHTML = related.map(item => {
      const img = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.image || '/uploads/poster_travis_jordan.jpg');
      const isInstock = item.stockType === 'instock';

      return `
        <article class="product-card ${isInstock ? 'is-instock' : ''}">
          <a href="product.html?id=${item.id}" class="product-slot-frame" style="text-decoration: none; display: block;">
            <div class="slot-hud-corner slot-hud-tl"></div>
            <div class="slot-hud-corner slot-hud-tr"></div>
            <div class="slot-hud-corner slot-hud-bl"></div>
            <div class="slot-hud-corner slot-hud-br"></div>
            <img src="${img}" alt="${item.brand} - ${item.name}" loading="lazy" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;">
            <div class="slot-inner-content">
              <div class="slot-top-row">
                ${isInstock
                  ? '<span class="origin-badge badge-instock">🟢 В НАЛИЧИИ // СПБ</span>'
                  : (item.region === 'transit_spb' || item.stockType === 'transit_spb')
                    ? '<span class="origin-badge badge-transit-spb">✈ В ПУТИ // СПБ</span>'
                    : (item.region === 'transit_irkutsk' || item.stockType === 'transit_irkutsk')
                      ? '<span class="origin-badge badge-transit-irk">✈ В ПУТИ // ИРКУТСК</span>'
                      : '<span class="origin-badge ' + (item.badgeClass || 'glb') + '">' + (item.region === 'japan' ? 'JAPAN [JP]' : item.region === 'global' ? 'GLOBAL [GLB]' : 'CHINA [CN]') + '</span><span class="drop-status-pill">ПРЕДЗАКАЗ</span>'
                }
              </div>
            </div>
          </a>

          <div class="product-info">
            <div class="product-brand-row">
              <span class="product-brand">${item.brand}</span>
              <span class="product-condition-pill" style="font-size: 8px; padding: 1px 5px;">● ${item.condition || 'NEW'}</span>
            </div>
            <a href="product.html?id=${item.id}" style="text-decoration: none; color: inherit;">
              <h3 class="product-name" style="font-size: 0.95rem; margin: 0.35rem 0;">${item.name}</h3>
            </a>
            <div class="product-price-row" style="margin-top: 0.5rem;">
              <span class="price-tag">${formatRub(item.basePriceRub)}</span>
            </div>
            <div style="margin-top: 0.75rem;">
              <a href="product.html?id=${item.id}" class="btn btn-outline btn-block" style="font-size: 0.78rem; padding: 8px 12px; justify-content: center;">
                СТРАНИЦА АЙТЕМА →
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Setup Gallery Controls
  function setupGallery() {
    if (el.prevBtn) {
      el.prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeImageIdx = (activeImageIdx - 1 + currentImages.length) % currentImages.length;
        renderGallery();
      });
    }

    if (el.nextBtn) {
      el.nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeImageIdx = (activeImageIdx + 1) % currentImages.length;
        renderGallery();
      });
    }

    // Lightbox Zoom
    if (el.zoomBtn && el.lightbox) {
      el.zoomBtn.addEventListener('click', () => {
        if (!currentImages.length) return;
        el.lightboxImg.src = currentImages[activeImageIdx];
        el.lightboxImg.alt = `${currentProduct ? (currentProduct.brand + ' ' + currentProduct.name) : 'SASBOV'} — снимок оригинального товара в высоком разрешении (фото ${activeImageIdx + 1})`;
        el.lightbox.classList.add('active');
      });
    }

    if (el.mainImg && el.lightbox) {
      el.mainImg.addEventListener('click', () => {
        if (!currentImages.length) return;
        el.lightboxImg.src = currentImages[activeImageIdx];
        el.lightboxImg.alt = `${currentProduct ? (currentProduct.brand + ' ' + currentProduct.name) : 'SASBOV'} — снимок оригинального товара в высоком разрешении (фото ${activeImageIdx + 1})`;
        el.lightbox.classList.add('active');
      });
    }

    if (el.lightboxClose && el.lightbox) {
      el.lightboxClose.addEventListener('click', () => {
        el.lightbox.classList.remove('active');
      });
    }

    if (el.lightbox) {
      el.lightbox.addEventListener('click', (e) => {
        if (e.target === el.lightbox) el.lightbox.classList.remove('active');
      });
    }

    // Touch swipe on gallery image
    let touchStartX = 0;
    let touchStartY = 0;
    if (el.mainVisualBox) {
      el.mainVisualBox.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      el.mainVisualBox.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1 && currentImages.length > 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
            if (deltaX < 0) {
              // Swipe left -> next photo
              activeImageIdx = (activeImageIdx + 1) % currentImages.length;
            } else {
              // Swipe right -> prev photo
              activeImageIdx = (activeImageIdx - 1 + currentImages.length) % currentImages.length;
            }
            renderGallery();
          }
        }
      }, { passive: true });
    }
  }

  // Setup Actions
  function setupActions() {
    // Copy SKU
    if (el.sku) {
      el.sku.addEventListener('click', () => {
        if (!currentProduct || !currentProduct.sku) return;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(currentProduct.sku);
          showToast(`Артикул ${currentProduct.sku} скопирован в буфер!`);
        }
      });
    }

    // Add to Preorder Tray
    if (el.btnAddTray) {
      el.btnAddTray.addEventListener('click', () => {
        if (!currentProduct) return;
        trayItems.push({
          id: currentProduct.id + '-' + Date.now(),
          productId: currentProduct.id,
          brand: currentProduct.brand,
          name: currentProduct.name,
          price: currentProduct.basePriceRub,
          size: selectedSize || 'Стандарт',
          sku: currentProduct.sku
        });
        saveTray();
        showToast(`«${currentProduct.name}» добавлен в поднос предзаказов!`);
        openTray();
      });
    }

    // Share Item
    if (el.btnShareItem) {
      el.btnShareItem.addEventListener('click', async () => {
        if (!currentProduct) return;
        const url = window.location.origin + window.location.pathname + '?id=' + currentProduct.id;
        const title = `${currentProduct.brand} — ${currentProduct.name}`;
        if (navigator.share) {
          try {
            await navigator.share({
              title: title,
              text: `Смотри «${title}» на SASBOV MARKET:`,
              url: url
            });
            return;
          } catch (e) {}
        }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url);
          showToast('Прямая ссылка на айтем скопирована!');
        }
      });
    }

    // Tray Drawer Listeners
    el.trayOpenBtns.forEach(btn => {
      btn.addEventListener('click', openTray);
    });
    if (el.trayCloseBtn) {
      el.trayCloseBtn.addEventListener('click', closeTray);
    }

    if (el.traySubmitTgBtn) {
      el.traySubmitTgBtn.addEventListener('click', () => {
        if (!trayItems.length) return;
        const total = trayItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
        const listText = trayItems.map((it, idx) => 
          `${idx + 1}. ${it.brand} ${it.name} (Размер: ${it.size}, Арт: ${it.sku}) — ${formatRub(it.price)}`
        ).join('\n');

        const message = 
`Здравствуйте! Хочу оформить предзаказ на позиции из подноса SASBOV MARKET:
${listText}

— ИТОГО: ${formatRub(total)}
— Прошу подтвердить наличие и выставить реквизиты для выкупа!`;

        window.open(`https://t.me/Sasbov?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      });
    }
  }

  // Setup Clocks HUD
  function setupClocks() {
    function tick() {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');

      const tokyo = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
      const shanghai = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
      const moscow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));

      const tyoStr = `TYO: ${pad(tokyo.getHours())}:${pad(tokyo.getMinutes())} JST`;
      const shaStr = `SHA: ${pad(shanghai.getHours())}:${pad(shanghai.getMinutes())} CST`;
      const mskStr = `MSK: ${pad(moscow.getHours())}:${pad(moscow.getMinutes())} MSK`;

      const tyoEl = document.getElementById('clock-tokyo');
      const shaEl = document.getElementById('clock-shanghai');
      const mskEl = document.getElementById('clock-moscow');
      if (tyoEl) tyoEl.textContent = tyoStr;
      if (shaEl) shaEl.textContent = shaStr;
      if (mskEl) mskEl.textContent = mskStr;

      const fTyoEl = document.getElementById('footer-clock-tokyo');
      const fShaEl = document.getElementById('footer-clock-shanghai');
      const fMskEl = document.getElementById('footer-clock-moscow');
      if (fTyoEl) fTyoEl.textContent = tyoStr;
      if (fShaEl) fShaEl.textContent = shaStr;
      if (fMskEl) fMskEl.textContent = mskStr;
    }
    tick();
    setInterval(tick, 1000);
  }

  // Setup Theme & Poster
  function setupTheme() {
    el.themePillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.themeVal;
        document.documentElement.setAttribute('data-theme', val);
        localStorage.setItem('sasbov_theme', val);
        el.themePillBtns.forEach(b => b.classList.toggle('active', b.dataset.themeVal === val));
      });
    });

    const POSTERS = [
      '/uploads/poster_travis_jordan.jpg',
      '/uploads/poster_corteiz_london.jpg',
      '/uploads/poster_denim_tears.jpg',
      '/uploads/poster_rick_owens_geobasket.jpg',
      '/uploads/poster_gallery_dept.jpg',
      '/uploads/poster_sp5der_hoodie.jpg',
      '/uploads/poster_stone_island_ghost.jpg'
    ];

    let currentPosterIdx = 0;
    el.randomPosterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentPosterIdx = (currentPosterIdx + 1) % POSTERS.length;
        if (el.ambientPosterImg) {
          el.ambientPosterImg.src = POSTERS[currentPosterIdx];
          showToast('Атмосферный постер обновлён!');
        }
      });
    });
  }

  // Setup Mobile Drawer
  function setupDrawer() {
    function openDrawer() {
      if (el.mobileDrawer) el.mobileDrawer.classList.add('active');
      if (el.mobileDrawerOverlay) el.mobileDrawerOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      if (el.mobileDrawer) el.mobileDrawer.classList.remove('active');
      if (el.mobileDrawerOverlay) el.mobileDrawerOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (el.mobileNavToggle) el.mobileNavToggle.addEventListener('click', openDrawer);
    if (el.mobileDrawerClose) el.mobileDrawerClose.addEventListener('click', closeDrawer);
    if (el.mobileDrawerOverlay) el.mobileDrawerOverlay.addEventListener('click', closeDrawer);
  }

  // Initialize
  async function init() {
    loadTray();
    setupGallery();
    setupActions();
    setupClocks();
    setupTheme();
    setupDrawer();

    const products = await fetchProducts();
    if (!products.length) {
      el.name.textContent = 'Ошибка загрузки каталога';
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id') || urlParams.get('item');

    let matched = products.find(p => p.id === targetId);
    if (!matched) {
      matched = products[0];
      // Sync URL without reload
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `product.html?id=${matched.id}`);
      }
    }

    renderProduct(matched);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

