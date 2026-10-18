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
      region: 'japan',
      regionLabel: 'JAPAN [JP] // TOKYO ARCHIVE',
      category: 'footwear',
      sku: 'MMY-PET-904',
      basePriceRub: 24800,
      sizes: ['39 EU', '40 EU', '41 EU', '42 EU', '43 EU', '44 EU'],
      dropStatus: 'ПРЕДЗАКАЗ ОТКРЫТ',
      badgeClass: 'jp',
      closingIn: '03 дн. 16:45',
      image: null
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
      image: null
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
      image: null
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
      image: null
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
      image: null
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
      image: null
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
      image: null
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
      image: null
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
      closingIn: '06 дн. 11:20',
      image: null
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

    if (el.resultsCount) {
      el.resultsCount.textContent = `Показано ${filtered.length} из ${PRODUCTS.length} позиций`;
    }

    if (filtered.length === 0) {
      el.grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px;">
          <p style="font-family: var(--font-mono); font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">// НИЧЕГО НЕ НАЙДЕНО</p>
          <p style="font-size: 0.9rem;">Попробуйте сбросить параметры поиска или добавьте новую вещь в каталог.</p>
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

      return `
        <article class="product-card" data-product-id="${product.id}">
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
                <span class="slot-sku">${product.sku}</span>
                <span class="slot-timer">[TIME: ${product.closingIn}]</span>
              </div>
            </div>
          </div>

          <div class="product-info">
            <span class="product-brand">${product.brand}</span>
            <h3 class="product-name">${product.name}</h3>

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
                ПРЕДЗАКАЗАТЬ
              </button>
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
        if (confirm('Сбросить каталог к 9 оригинальным дропам?')) {
          PRODUCTS = [...DEFAULT_PRODUCTS];
          saveStoredProducts(PRODUCTS);
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
        const selectedSpeedVal = Array.from(el.modalSpeedRadios).find(r => r.checked)?.value || 'Авиа-экспресс (7-10 дней)';

        const messageText = 
`Здравствуйте! Хочу оформить предзаказ в SASBOV MARKET:
— Товар: ${p.brand} ${p.name}
— Артикул: ${p.sku}
— Размер: ${state.selectedSize}
— Регион: ${p.regionLabel}
— Тариф: ${selectedSpeedVal}
— Стоимость под ключ: ${formatRub(p.basePriceRub)}

Подтвердите наличие и пришлите реквизиты для выкупа!`;

        const tgUrl = `https://t.me/sasbovmarket?text=${encodeURIComponent(messageText)}`;
        window.open(tgUrl, '_blank', 'noopener,noreferrer');
        closePreorderModal();
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

        const tgUrl = `https://t.me/sasbovmarket?text=${encodeURIComponent(messageText)}`;
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

  function init() {
    renderProducts();
    setupFilters();
    setupAddProductModal();
    setupModalEvents();
    setupTrayEvents();
    updateTelemetryClocks();
    setInterval(updateTelemetryClocks, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
