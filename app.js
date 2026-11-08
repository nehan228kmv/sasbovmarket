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
  const DEFAULT_PRODUCTS = [];

  function getProductTimestamp(p) {
    if (!p) return 0;
    if (typeof p.timestamp === 'number') return p.timestamp;
    if (p.createdAt) {
      const t = new Date(p.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (p.id) {
      const match = String(p.id).match(/sasbov-card-(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 0;
  }

  function getProductSubcategory(p) {
    if (!p) return 'other';
    const text = `${p.category || ''} ${p.name || ''} ${p.brand || ''} ${p.description || ''} ${p.sku || ''}`.toLowerCase();
    
    if (text.includes('худи') || text.includes('hoodie') || text.includes('толстовк') || text.includes('свитшот') || text.includes('зипк') || text.includes('zip') || text.includes('crewneck')) {
      return 'hoodie';
    }
    if (text.includes('футболк') || text.includes('t-shirt') || text.includes('tee') || text.includes('лонгслив') || text.includes('майк') || text.includes('longsleeve')) {
      return 'tshirt';
    }
    if (text.includes('кроссовк') || text.includes('sneaker') || text.includes('shoe') || text.includes('ботинк') || text.includes('boots') || text.includes('кед') || text.includes('тапочк') || text.includes('loafer') || text.includes('mule') || p.category === 'shoes') {
      return 'footwear';
    }
    if (text.includes('куртк') || text.includes('jacket') || text.includes('пуховик') || text.includes('down') || text.includes('бомбер') || text.includes('ветровк') || text.includes('parka') || text.includes('coat') || text.includes('пальто') || p.category === 'jacket') {
      return 'jacket';
    }
    if (text.includes('штан') || text.includes('брюк') || text.includes('джинс') || text.includes('jeans') || text.includes('pants') || text.includes('trousers') || text.includes('шорт') || text.includes('cargo') || text.includes('карго')) {
      return 'pants';
    }
    if (text.includes('сумк') || text.includes('bag') || text.includes('ремень') || text.includes('belt') || text.includes('очки') || text.includes('glasses') || text.includes('кепк') || text.includes('cap') || text.includes('шапк') || text.includes('beanie') || text.includes('шарф') || text.includes('scarf') || text.includes('часы') || text.includes('watch') || text.includes('кошелек') || text.includes('wallet') || text.includes('украшен') || text.includes('браслет') || text.includes('кольцо') || text.includes('подвеск') || text.includes('цепь') || p.category === 'accessories') {
      return 'accessories';
    }
    return p.category === 'shoes' ? 'footwear' : (p.category === 'hoodie' ? 'hoodie' : 'accessories');
  }

  function getStoredProducts() {
    try {
      localStorage.removeItem('sasbov_products_v2');
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed.filter(p => !p.deletedAt && !p.archived).map(p => {
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
          list.sort((a, b) => getProductTimestamp(b) - getProductTimestamp(a));
          return list;
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

  let freshSliderPage = 0;
  const FRESH_PAGE_SIZE = 4;

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
  
  function openTelegramChat(text) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const encoded = encodeURIComponent(text || '');
    if (isMobile) {
      window.location.href = 'tg://resolve?domain=Sasbov' + (encoded ? '&text=' + encoded : '');
      setTimeout(() => {
        window.location.href = 'https://t.me/Sasbov' + (encoded ? '?text=' + encoded : '');
      }, 600);
    } else {
      window.open('https://t.me/Sasbov' + (encoded ? '?text=' + encoded : ''), '_blank', 'noopener,noreferrer');
    }
  }

  function formatRub(num) {
    const val = Number(num);
    if (!val || isNaN(val) || val <= 0) return '0 ₽';
    return Math.round(val).toLocaleString('ru-RU') + ' ₽';
  }

  /**
   * Render Filtered Product Grid
   */
  function renderProducts() {
    if (!el.grid) return;

    const filtered = PRODUCTS.filter(p => {
      const matchRegion = state.activeRegion === 'all' || p.region === state.activeRegion;
      const matchCategory = state.activeCategory === 'all' || p.category === state.activeCategory;
      const q = (state.searchQuery || '').toLowerCase().trim();
      let matchSearch = true;
      if (q) {
        const pool = [
          p.name,
          p.brand,
          p.sku,
          p.itemType,
          ...(Array.isArray(p.subcategories) ? p.subcategories : [p.subcategories]),
          ...(Array.isArray(p.tags) ? p.tags : []),
          p.category
        ].filter(Boolean).join(' ').toLowerCase();

        const stem = (w) => (w.length > 3 && /[иыаяео]$/.test(w)) ? w.slice(0, -1) : w;
        const words = q.split(/\s+/).filter(Boolean);
        matchSearch = words.every(w => {
          const st = stem(w);
          return pool.includes(w) || pool.includes(st);
        });
      }
      
      return matchRegion && matchCategory && matchSearch;
    });

    const isFreshPreview = el.grid.id === 'fresh-products-grid';
    let displayList = filtered;

    if (isFreshPreview) {
      const totalFreshPages = Math.ceil(filtered.length / FRESH_PAGE_SIZE) || 1;
      if (freshSliderPage >= totalFreshPages) freshSliderPage = 0;
      if (freshSliderPage < 0) freshSliderPage = totalFreshPages - 1;
      const start = freshSliderPage * FRESH_PAGE_SIZE;
      displayList = filtered.slice(start, start + FRESH_PAGE_SIZE);

      const pageCountEl = document.getElementById('fresh-page-count');
      if (pageCountEl) {
        pageCountEl.textContent = `${freshSliderPage + 1} / ${totalFreshPages}`;
      }
      const allLinkEl = document.getElementById('fresh-all-link');
      if (allLinkEl) {
        allLinkEl.textContent = `СМОТРЕТЬ ВСЕ В КАТАЛОГЕ (${filtered.length}+) →`;
      }
    }

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
          <img src="${images[0]}" alt="${product.brand} - ${product.name}" width="600" height="800" loading="lazy" decoding="async" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;">
        `;
      } else {
        imageContent = `
          <div class="card-carousel-wrap" data-card-id="${product.id}">
            <div class="card-carousel-slides">
              ${images.map((src, i) => `
                <img src="${src}" alt="${product.brand} - ${product.name} (Фото ${i + 1})" width="600" height="800" class="card-carousel-img ${i === 0 ? 'active' : ''}" data-idx="${i}" loading="lazy" decoding="async">
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
        <article class="product-card reveal-on-scroll is-revealed" data-product-id="${product.id}">
          <!-- Photo Slot Frame (3:4 ratio) -->
          <div class="product-slot-frame">
            <div class="slot-hud-corner slot-hud-tl"></div>
            <div class="slot-hud-corner slot-hud-tr"></div>
            <div class="slot-hud-corner slot-hud-bl"></div>
            <div class="slot-hud-corner slot-hud-br"></div>

            ${imageContent}

            <div class="slot-inner-content">
              <div class="slot-top-row">
                ${product.stockType === 'instock' || product.region === 'spb'
                  ? '<span class="origin-badge badge-instock">🟢 В НАЛИЧИИ // СПБ</span>'
                  : (product.region === 'transit_spb' || product.stockType === 'transit_spb')
                    ? '<span class="origin-badge badge-transit-spb">✈ В ПУТИ // СПБ</span>'
                    : (product.region === 'transit_irkutsk' || product.stockType === 'transit_irkutsk')
                      ? '<span class="origin-badge badge-transit-irk">✈ В ПУТИ // ИРКУТСК</span>'
                      : '<span class="origin-badge ' + product.badgeClass + '">' + (product.region === 'japan' ? 'JAPAN [JP]' : product.region === 'global' ? 'GLOBAL [GLB]' : 'CHINA [CN]') + '</span><span class="drop-status-pill">ПРЕДЗАКАЗ</span>'
                }
              </div>

              <div class="slot-bottom-row">
                <div class="slot-telemetry-left">
                  <span class="slot-sku">${product.sku}</span>
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
            <h3 class="product-name"><a href="/product?id=${product.id}" style="color: inherit; text-decoration: none;">${product.name}</a></h3>
            ${(product.stockType === 'instock' || product.region === 'spb') ? `<a href="https://yandex.ru/maps/org/balkonskiy_stor/109683827425/?indoorLevel=1&ll=30.358538%2C59.932829&z=17" target="_blank" rel="noopener noreferrer" class="partner-store-pill" title="Открыть Balkonsky Store на Яндекс Картах">СПБ // BALKONSKY STORE (Невский просп., 110В ↗)</a>` : ''}
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
                <span class="price-tag">${formatRub(product.basePriceRub || product.price)}</span>
                <span class="price-detail">под ключ с доставкой</span>
              </div>
            </div>

            <div class="card-actions">
              <a href="/product?id=${product.id}" class="btn btn-primary btn-block" style="color: #000000 !important; -webkit-text-fill-color: #000000 !important; background: #ffffff !important; text-decoration: none; justify-content: center; font-weight: 900 !important;">
                ${product.stockType === 'instock' ? 'КУПИТЬ В СПБ →' : 'ПРЕДЗАКАЗАТЬ →'}
              </a>
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

    // Clicking card image frame opens dedicated product page
    el.grid.querySelectorAll('.product-slot-frame').forEach(frame => {
      frame.style.cursor = 'pointer';
      frame.addEventListener('click', (e) => {
        if (e.target.closest('.card-arrow-btn')) return;
        const card = frame.closest('.product-card');
        if (card && card.dataset.productId) {
          window.location.href = `product.html?id=${card.dataset.productId}`;
        }
      });
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
   * Fresh Drops 4-Item Slider Controls
   */
  function setupFreshSlider() {
    const prevBtn = document.getElementById('fresh-prev-btn');
    const nextBtn = document.getElementById('fresh-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const filtered = PRODUCTS.filter(p => {
          const matchRegion = state.activeRegion === 'all' || p.region === state.activeRegion;
          const matchCategory = state.activeCategory === 'all' || p.category === state.activeCategory;
          return matchRegion && matchCategory;
        });
        const totalFreshPages = Math.ceil(filtered.length / FRESH_PAGE_SIZE) || 1;
        freshSliderPage = (freshSliderPage - 1 + totalFreshPages) % totalFreshPages;
        if (el.grid) {
          el.grid.style.opacity = '0';
          el.grid.style.transform = 'translateX(12px)';
          setTimeout(() => {
            renderProducts();
            el.grid.style.opacity = '1';
            el.grid.style.transform = 'translateX(0)';
          }, 160);
        } else {
          renderProducts();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const filtered = PRODUCTS.filter(p => {
          const matchRegion = state.activeRegion === 'all' || p.region === state.activeRegion;
          const matchCategory = state.activeCategory === 'all' || p.category === state.activeCategory;
          return matchRegion && matchCategory;
        });
        const totalFreshPages = Math.ceil(filtered.length / FRESH_PAGE_SIZE) || 1;
        freshSliderPage = (freshSliderPage + 1) % totalFreshPages;
        if (el.grid) {
          el.grid.style.opacity = '0';
          el.grid.style.transform = 'translateX(-12px)';
          setTimeout(() => {
            renderProducts();
            el.grid.style.opacity = '1';
            el.grid.style.transform = 'translateX(0)';
          }, 160);
        } else {
          renderProducts();
        }
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
        if (confirm('Сбросить фильтры каталога?')) {
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

        let regionLabel = 'CHINA [CN] // POIZON AUTH';
        let badgeClass = 'cn';
        if (region === 'japan') {
          regionLabel = 'JAPAN [JP] // TOKYO ARCHIVE';
          badgeClass = 'jp';
        } else if (region === 'global') {
          regionLabel = 'GLOBAL [GLB] // GRAILED ARCHIVE';
          badgeClass = 'global';
        } else if (region === 'spb') {
          regionLabel = '🟢 В НАЛИЧИИ В СПБ';
          badgeClass = 'badge-instock';
        } else if (region === 'transit_spb') {
          regionLabel = 'В ПУТИ: СПБ';
          badgeClass = 'badge-transit-spb';
        } else if (region === 'transit_irkutsk') {
          regionLabel = 'В ПУТИ: ИРКУТСК';
          badgeClass = 'badge-transit-irk';
        }
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

    const isInstock = product.stockType === 'instock';
    const speedWrap = document.getElementById('modal-speed-wrap');
    const pricingTitle = document.getElementById('modal-pricing-title');
    const pricingNote = document.getElementById('modal-pricing-note');
    const balkonskyBox = document.getElementById('modal-balkonsky-box');

    if (isInstock) {
      if (speedWrap) speedWrap.style.display = 'none';
      if (pricingTitle) pricingTitle.textContent = 'Цена в наличии (Санкт-Петербург):';
      if (pricingNote) pricingNote.textContent = 'Примерка и покупка в шоуруме Balkonsky Store или быстрая отправка СДЭК.';
      if (balkonskyBox) balkonskyBox.style.display = 'flex';

      el.modalRegionTag.className = 'origin-badge badge-instock';
      el.modalRegionTag.textContent = 'В НАЛИЧИИ: СПБ // BALKONSKY STORE';
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
      el.modalItemSku.textContent = `АРТИКУЛ: ${product.sku} // ГАРАНТИЯ ОРИГИНАЛА`;
      if (el.modalSubmitTgBtn) {
        el.modalSubmitTgBtn.className = 'btn btn-primary btn-block';
        el.modalSubmitTgBtn.innerHTML = `<span>ОФОРМИТЬ В TELEGRAM</span>`;
      }
    }

    el.modalItemTitle.textContent = `${product.brand} — ${product.name}`;
    el.modalPriceVal.textContent = formatRub(product.basePriceRub);

    const firstImg = (Array.isArray(product.images) && product.images.length > 0) ? product.images[0] : product.image;
    if (firstImg) {
      el.modalImgPreview.innerHTML = `
        <img src="${firstImg}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
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
        const isInstock = p.stockType === 'instock';

        if (isInstock) {
          const messageText = 
`Здравствуйте! Хочу забронировать / купить позицию из наличия в Санкт-Петербурге:
— Товар: ${p.brand} ${p.name}
— Состояние: ${p.condition || 'NEW // DEADSTOCK'}
— Артикул: ${p.sku}
— Размер: ${state.selectedSize}
— Локация: Санкт-Петербург, Balkonsky Store (Невский просп., 110В | https://yandex.ru/maps/org/balkonskiy_stor/109683827425/?indoorLevel=1&ll=30.358538%2C59.932829&z=17)
— Условия: Примерка / самовывоз в СПб день-в-день, отправка СДЭК 1-2 дня
— Стоимость: ${formatRub(p.basePriceRub)}
${p.description ? `— Описание: ${p.description}\n` : ''}
Подтвердите наличие на точке и забронируйте вещь за мной!`;

          const tgUrl = `https://t.me/sasbov?text=${encodeURIComponent(messageText)}`;
          window.open(tgUrl, '_blank', 'noopener,noreferrer');
          closePreorderModal();
        } else {
          const selectedSpeedVal = Array.from(el.modalSpeedRadios).find(r => r.checked)?.value || 'Авиа-экспресс (7-10 дней)';
          const messageText = 
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

          const tgUrl = `https://t.me/Sasbov?text=${encodeURIComponent(messageText)}`;
          window.open(tgUrl, '_blank', 'noopener,noreferrer');
          closePreorderModal();
        }
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
      size: (product.sizes && product.sizes[0]) || 'ONE SIZE',
      sku: product.sku
    });

    try {
      localStorage.setItem('sasbov_tray_v1', JSON.stringify(state.trayItems));
    } catch (e) {}

    updateTrayUI();
    openTray();
  }

  function removeFromTray(itemId) {
    state.trayItems = state.trayItems.filter(item => item.id !== itemId);
    try {
      localStorage.setItem('sasbov_tray_v1', JSON.stringify(state.trayItems));
    } catch (e) {}
    updateTrayUI();
  }

  function loadSavedTray() {
    try {
      const saved = localStorage.getItem('sasbov_tray_v1');
      if (saved) {
        state.trayItems = JSON.parse(saved);
        if (!Array.isArray(state.trayItems)) state.trayItems = [];
      }
    } catch (e) {
      state.trayItems = [];
    }
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
    document.querySelectorAll('#tray-count, .footer-tray-count').forEach(badge => {
      badge.textContent = state.trayItems.length;
    });

    if (!el.trayContainer) return;

    if (state.trayItems.length === 0) {
      el.trayContainer.innerHTML = `
        <div class="tray-empty">
          <p>В корзине предзаказов пока пусто.</p>
          <p style="margin-top: 0.5rem; font-size: 0.75rem; color: #8e8e93;">Добавляйте любые айтемы из каталога для единого заказа.</p>
        </div>
      `;
      if (el.trayFooter) el.trayFooter.style.display = 'none';
      return;
    }

    const total = state.trayItems.reduce((sum, item) => sum + item.price, 0);

    el.trayContainer.innerHTML = state.trayItems.map(item => `
      <div class="tray-item">
        <div class="tray-item-info">
          <div class="tray-item-brand">${item.brand || ''}</div>
          <div class="tray-item-title">${item.name}</div>
          <div class="tray-item-meta">
            <span class="tray-item-size-tag">Размер: ${item.size}</span>
            <span class="tray-item-price-tag">${formatRub(item.price)}</span>
          </div>
        </div>
        <button type="button" class="tray-item-remove" data-item-id="${item.id}" aria-label="Удалить позицию" title="Удалить">&times;</button>
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
    document.querySelectorAll('#preorder-tray-btn, .footer-tray-btn, #footer-preorder-tray-btn').forEach(btn => {
      btn.addEventListener('click', openTray);
    });
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

        const tgUrl = `https://t.me/Sasbov?text=${encodeURIComponent(messageText)}`;
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
    let rawVal = parseFloat(el.calcItemPrice?.value);
    const defaultPlaceholder = calcOrigin === 'cn' ? 899 : (calcOrigin === 'jp' ? 28000 : 250);
    const priceVal = (!rawVal || isNaN(rawVal) || rawVal <= 0) ? defaultPlaceholder : rawVal;
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

        openTelegramChat(message);
      });
    }

    calculateEstimate();
    fetchLiveRates();
  }
  function fetchLiveRates() {
    fetch('/api/rates')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.rates) {
          if (data.rates.CNY) RATES.CNY = data.rates.CNY;
          if (data.rates.JPY) RATES.JPY = data.rates.JPY;
          if (data.rates.USD) RATES.USD = data.rates.USD;
          const notice = document.getElementById('calc-rate-notice');
          if (notice) {
            notice.textContent = `АКТУАЛЬНЫЙ КУРС ВЫКУПА: 1 ¥ = ${RATES.CNY.toFixed(2)} ₽ • ОБНОВЛЁН: СЕГОДНЯ // БЕЗ СКРЫТЫХ ПЛАТЕЖЕЙ`;
          }
          calculateEstimate();
        }
      })
      .catch(() => {});
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

    const tyo = `TYO: ${formatTime('Asia/Tokyo')} JST`;
    const sha = `SHA: ${formatTime('Asia/Shanghai')} CST`;
    const msk = `MSK: ${formatTime('Europe/Moscow')} MSK`;
    document.querySelectorAll('#clock-tokyo, #footer-clock-tokyo, .clock-tokyo').forEach(e => e.textContent = tyo);
    document.querySelectorAll('#clock-shanghai, #footer-clock-shanghai, .clock-shanghai').forEach(e => e.textContent = sha);
    document.querySelectorAll('#clock-moscow, #footer-clock-moscow, .clock-moscow').forEach(e => e.textContent = msk);
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

  async function fetchCloudProducts() {
    try {
      const res = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
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

  // =========================================================================
  // Ambient Luxury Poster Backdrop Controller (Random / Selectable)
  // =========================================================================
  const POSTER_COLLECTION = [
      "/uploads/poster_glogang.jpg",
      "/uploads/poster_chrome_hearts.jpg",
      "/uploads/poster_bape_harajuku.jpg",
      "/uploads/poster_gorpcore_arcteryx.jpg",
      "/uploads/poster_mihara_yasuhiro.jpg",
      "/uploads/poster_travis_jordan.jpg",
      "/uploads/poster_balenciaga.jpg",
      "/uploads/poster_gucci_luxury.jpg",
      "/uploads/poster_amiri_luxury.jpg",
      "/uploads/poster_stone_cp_grail.jpg",
      "/uploads/poster_rick_owens.jpg",
      "/uploads/poster_corteiz_london.jpg",
      "/uploads/poster_sp5der_worldwide.jpg",
      "/uploads/poster_hellstar_studios.jpg",
      "/uploads/poster_stussy_heritage.jpg",
      "/uploads/poster_gallery_dept.jpg",
      "/uploads/poster_arcteryx_alpine.jpg",
      "/uploads/poster_denim_tears.jpg",
      "/uploads/poster_vetements_oversized.jpg",
      "/uploads/poster_kith_newyork.jpg"
  ];

  function setupAmbientPosterBackdrop() {
    const posterImg = document.getElementById('ambient-poster-img');
    const randomBtn = document.getElementById('btn-random-poster');
    if (!posterImg) return;

    function applyRandomPoster() {
      const idx = Math.floor(Math.random() * POSTER_COLLECTION.length);
      const chosen = POSTER_COLLECTION[idx];
      posterImg.classList.add('is-switching');
      setTimeout(() => {
        posterImg.src = chosen;
        posterImg.onload = () => {
          posterImg.classList.remove('is-switching');
        };
      }, 180);
    }

    applyRandomPoster();

    if (randomBtn) {
      randomBtn.addEventListener('click', applyRandomPoster);
    }
  }

  /**
   * Initialization
   */
  
  // ---------------------------------------------------------------------------
  // Hero Search & Autocomplete
  // ---------------------------------------------------------------------------
  function setupHeroSearch() {
    const input = document.getElementById('hero-search-input');
    const submitBtn = document.getElementById('hero-search-btn');
    const clearBtn = document.getElementById('hero-search-clear');
    const dropdown = document.getElementById('hero-search-dropdown');
    const countEl = document.getElementById('search-dropdown-count');
    const resultsContainer = document.getElementById('hero-search-results');
    const quickTags = document.querySelectorAll('.quick-tag-btn');

    if (!input) return;

    function doSearchRedirect(query) {
      const q = (query || input.value || '').trim();
      if (!q) return;
      window.location.href = 'catalog.html?q=' + encodeURIComponent(q);
    }

    // Input live suggestions
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        if (dropdown) dropdown.style.display = 'none';
        return;
      }

      const matches = PRODUCTS.filter(p => {
        const pool = [
          p.name,
          p.brand,
          p.category,
          p.itemType,
          ...(Array.isArray(p.subcategories) ? p.subcategories : [p.subcategories]),
          ...(Array.isArray(p.tags) ? p.tags : []),
          p.sku,
          p.regionLabel
        ].filter(Boolean).join(' ').toLowerCase();

        const stem = (w) => (w.length > 3 && /[иыаяео]$/.test(w)) ? w.slice(0, -1) : w;
        const words = q.split(/\s+/).filter(Boolean);
        return words.every(w => {
          const st = stem(w);
          return pool.includes(w) || pool.includes(st);
        });
      });

      if (!dropdown || !resultsContainer) return;

      if (countEl) countEl.textContent = `НАЙДЕНО ПОЗИЦИЙ: ${matches.length}`;

      if (matches.length === 0) {
        resultsContainer.innerHTML = `
          <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            По запросу «${q}» ничего не найдено.<br>
            <span style="color: var(--accent-cyan); font-weight: 700;">Нажмите ENTER для индивидуального поиска</span>
          </div>
        `;
      } else {
        resultsContainer.innerHTML = matches.slice(0, 6).map(p => {
          const img = (Array.isArray(p.images) && p.images[0]) || p.image || '/uploads/poster_travis_jordan.jpg';
          let badgeText = 'ПРЕДЗАКАЗ';
          let badgeColor = '#00f0ff';
          if (p.stockType === 'instock' || p.region === 'spb') {
            badgeText = '🟢 СПБ';
            badgeColor = '#00ff88';
          } else if (p.stockType === 'transit_spb') {
            badgeText = 'В ПУТИ: СПБ';
            badgeColor = '#00f0ff';
          } else if (p.stockType === 'transit_irkutsk') {
            badgeText = 'В ПУТИ: ИРКУТСК';
            badgeColor = '#fbbf24';
          }

          return `
            <a href="catalog.html?q=${encodeURIComponent(p.brand + ' ' + p.name)}" class="search-suggestion-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; text-decoration: none; border-bottom: 1px solid var(--border-subtle); transition: background 0.15s ease;">
              <img src="${img}" alt="${p.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; background: #161620;">
              <div style="flex: 1; min-width: 0;">
                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-cyan); text-transform: uppercase;">${p.brand}</div>
                <div style="color: var(--text-primary); font-size: 0.86rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
              </div>
              <div style="text-align: right;">
                <div style="color: var(--text-primary); font-weight: 700; font-size: 0.88rem;">${formatRub(p.basePriceRub || p.price)}</div>
                <div style="font-size: 0.65rem; color: ${badgeColor}; font-family: var(--font-mono);">${badgeText}</div>
              </div>
            </a>
          `;
        }).join('');
      }

      dropdown.style.display = 'block';
    });

    // Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearchRedirect();
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        doSearchRedirect();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        if (dropdown) dropdown.style.display = 'none';
      });
    }

    // Quick tag clicks
    quickTags.forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-search-tag');
        if (tag) doSearchRedirect(tag);
      });
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (dropdown && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.style.display = 'none';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Theme Switcher
  // ---------------------------------------------------------------------------
  function setupThemeSwitcher() {
    let savedTheme = localStorage.getItem('sasbov_theme') || 'dark';
    if (savedTheme !== 'chrome' && savedTheme !== 'dark') {
      savedTheme = 'dark';
      localStorage.setItem('sasbov_theme', 'dark');
    }
    document.documentElement.setAttribute('data-theme', savedTheme);

    function updatePills(t) {
      document.querySelectorAll('.theme-pill-btn[data-theme-val]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme-val') === t);
      });
    }
    updatePills(savedTheme);

    document.querySelectorAll('.theme-pill-btn[data-theme-val]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-theme-val');
        if (!t) return;
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('sasbov_theme', t);
        updatePills(t);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Awwwards WOW Interactive Effects: Specular Tilt & Scroll Reveal
  // ---------------------------------------------------------------------------
  function initCardSpecularHighlights() {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return;

    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.product-card, .fresh-drop-card, .blog-card, .footer-showroom-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5.5;
      const rotateY = ((x - centerX) / centerX) * 5.5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.018, 1.018, 1.018)`;
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.product-card, .fresh-drop-card, .blog-card, .footer-showroom-card');
      if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
        card.style.transform = '';
      }
    });
  }

  function setupMobileDrawer() {
    const toggleBtn = document.getElementById('mobile-nav-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('mobile-drawer-overlay');
    const closeBtn = document.getElementById('mobile-drawer-close');
    const links = document.querySelectorAll('.mobile-drawer-link');

    if (!toggleBtn || !drawer || !overlay) return;

    function openDrawer() {
      drawer.classList.add('is-active', 'active');
      overlay.classList.add('is-active', 'active');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('is-active', 'active');
      overlay.classList.remove('is-active', 'active');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    links.forEach(l => l.addEventListener('click', closeDrawer));
  }

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const targets = document.querySelectorAll(
      '.hero-container, .fresh-drops-section, .calculator-section, .process-section, .faq-section, .footer-showroom-card, .product-card, .fresh-drop-card'
    );
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    targets.forEach(el => {
      el.classList.add('reveal-on-scroll');
      observer.observe(el);
    });
  }

function init() {
    setupThemeSwitcher();
    setupHeroSearch();
    renderProducts();
    setupFilters();
    setupFreshSlider();
    setupAddProductModal();
    setupHiddenAdminModal();
    setupModalEvents();
    setupTrayEvents();
    loadSavedTray();
    setupCalculator();
    setupMobileDrawer();
    setupAmbientPosterBackdrop();
    initCardSpecularHighlights();
    initScrollReveal();

    // Start Clocks
    updateTelemetryClocks();
    setInterval(updateTelemetryClocks, 1000);
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

  // Kickoff on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

// Smooth scroll for home link when already on home page
document.querySelectorAll('a[href="index.html"], a[href="/"]').forEach(a => {
  a.addEventListener('click', (e) => {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
      if (a.getAttribute('href') === 'index.html' || a.getAttribute('href') === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });
});
