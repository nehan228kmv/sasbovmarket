/**
 * SASBOV MARKET — Full Catalogue Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sasbov_market_products_v1';

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
          const list = parsed.filter(p => !p.deletedAt).map(p => {
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
          list.sort((a, b) => getProductTimestamp(b) - getProductTimestamp(a));
          return list;
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
    activeSubcat: 'all',
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
      const matchSubcat = state.activeSubcat === 'all' || getProductSubcategory(p) === state.activeSubcat;
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
          p.partner,
          p.category
        ].filter(Boolean).join(' ').toLowerCase();

        const stem = (w) => (w.length > 3 && /[иыаяео]$/.test(w)) ? w.slice(0, -1) : w;
        const words = q.split(/\s+/).filter(Boolean);
        matchSearch = words.every(w => {
          const st = stem(w);
          return pool.includes(w) || pool.includes(st);
        });
      }
      
      return matchStock && matchRegion && matchCategory && matchSubcat && matchSearch;
    });

    if (el.resultsCount) {
      el.resultsCount.textContent = `Показано ${filtered.length} из ${PRODUCTS.length} позиций`;
    }

    if (filtered.length === 0) {
      el.grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px;">
          <p style="font-family: var(--font-mono); font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">// НИЧЕГО НЕ НАЙДЕНО</p>
          <p style="font-size: 0.9rem;">Попробуйте выбрать другой фильтр (например, «Все позиции») или сбросьте параметры поиска.</p>
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
        ? `<span class="origin-badge badge-instock">В НАЛИЧИИ // СПБ</span>`
        : `<span class="origin-badge ${product.badgeClass}">${product.regionLabel}</span>`;

      const partnerTag = isInstock
        ? `<a href="https://yandex.ru/maps/org/balkonskiy_stor/109683827425/?indoorLevel=1&ll=30.358538%2C59.932829&z=17" target="_blank" rel="noopener noreferrer" class="partner-store-pill" title="Открыть Balkonsky Store на Яндекс Картах">СПБ // BALKONSKY STORE (Невский просп., 110В ↗)</a>`
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

      const condition = product.condition || 'NEW // DEADSTOCK';
      const cLower = condition.toLowerCase();
      let conditionClass = '';
      if (cLower.includes('deadstock') || cLower.includes('новое')) {
        conditionClass = 'deadstock';
      } else if (cLower.includes('vintage') || cLower.includes('винтаж')) {
        conditionClass = 'vintage';
      } else if (cLower.includes('5/10') || cLower.includes('6/10') || cLower.includes('distressed') || cLower.includes('fair')) {
        conditionClass = 'distressed';
      }
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

    // Subcategory chips
    const subcatChips = document.querySelectorAll('[data-catalog-subcat]');
    subcatChips.forEach(chip => {
      chip.addEventListener('click', () => {
        subcatChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeSubcat = chip.getAttribute('data-catalog-subcat') || 'all';
        renderProducts();
      });
    });

    // Handle URL search and subcat parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search') || urlParams.get('q');
      if (searchParam) {
        state.searchQuery = searchParam.trim();
        if (el.searchInput) el.searchInput.value = state.searchQuery;
      }
      const subcatParam = urlParams.get('subcat');
      if (subcatParam) {
        state.activeSubcat = subcatParam;
        subcatChips.forEach(c => c.classList.toggle('active', c.getAttribute('data-catalog-subcat') === subcatParam));
      }
    } catch (e) {}

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

          const tgUrl = `https://t.me/Sasbov?text=${encodeURIComponent(messageText)}`;
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
    document.querySelectorAll('#preorder-tray-btn, .footer-tray-btn, #footer-preorder-tray-btn').forEach(btn => {
      btn.addEventListener('click', openTray);
    });
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

        const tgUrl = `https://t.me/Sasbov?text=${encodeURIComponent(messageText)}`;
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

    const tyo = `TYO: ${formatTime('Asia/Tokyo')} JST`;
    const sha = `SHA: ${formatTime('Asia/Shanghai')} CST`;
    const msk = `MSK: ${formatTime('Europe/Moscow')} MSK`;
    document.querySelectorAll('#clock-tokyo, #footer-clock-tokyo, .clock-tokyo').forEach(e => e.textContent = tyo);
    document.querySelectorAll('#clock-shanghai, #footer-clock-shanghai, .clock-shanghai').forEach(e => e.textContent = sha);
    document.querySelectorAll('#clock-moscow, #footer-clock-moscow, .clock-moscow').forEach(e => e.textContent = msk);
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
  // Theme Switcher (Dark, Light, Chrome, Gold)
  // =========================================================================
  function setupThemeSwitcher() {
    let savedTheme = localStorage.getItem('sasbov_theme') || 'dark';
    if (savedTheme !== 'chrome' && savedTheme !== 'dark') {
      savedTheme = 'dark';
      localStorage.setItem('sasbov_theme', 'dark');
    }
    document.documentElement.setAttribute('data-theme', savedTheme);

    function updatePills(theme) {
      document.querySelectorAll('.theme-pill-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.getAttribute('data-theme-val') || btn.getAttribute('data-theme-set')) === theme);
      });
    }
    updatePills(savedTheme);

    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = (btn.getAttribute('data-theme-val') || btn.getAttribute('data-theme-set'));
        if (!t) return;
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('sasbov_theme', t);
        updatePills(t);
        window.dispatchEvent(new CustomEvent('sasbov:theme_changed', { detail: t }));
      });
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'sasbov_theme' && e.newValue) {
        document.documentElement.setAttribute('data-theme', e.newValue);
        updatePills(e.newValue);
      }
    });
  }

  // =========================================================================
  // Lo-Fi 90s-00s Western Rap Radio (10% Default Volume)
  // =========================================================================
  function setupSasbovRadio() {
    const playBtn = document.getElementById('radio-play-btn');
    const barsContainer = document.getElementById('radio-bars');
    const volumeSlider = document.getElementById('radio-volume-slider');
    const trackTitleEl = document.getElementById('radio-track-title');
    const stationSelect = document.getElementById('radio-station-select');
    const radioDock = document.getElementById('sasbov-radio-dock');
    const toggleDockBtn = document.getElementById('radio-dock-toggle');

    if (!playBtn) return;

    const TRACKS = [
      '2Pac - Ambitionz Az A Ridah (Lofi Boom-Bap Cut)',
      'The Notorious B.I.G. - Juicy (90s Brooklyn Lounge)',
      'Wu-Tang Clan - C.R.E.A.M. (Shaolin 90s Archive Tape)',
      'Snoop Dogg & Dr. Dre - Nuthin But A G Thang (West Coast Sunset)',
      'Nas - The World Is Yours (Queensbridge 1994 Vinyl)',
      'Mobb Deep - Shook Ones Pt. II (Warm Vintage Mix)',
      'Chief Keef - Love Sosa (Glo Gang Lofi Instrumental)'
    ];

    let currentTrackIdx = 0;
    let isPlaying = false;
    let audioCtx = null;
    let masterGain = null;
    let radioInterval = null;

    const DEFAULT_VOL = 0.10;
    let currentVolume = DEFAULT_VOL;
    if (volumeSlider) {
      volumeSlider.value = 10;
    }

    function initAudioContext() {
      if (audioCtx) return;
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      audioCtx = new AudioCtxClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.015;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(800, audioCtx.currentTime);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(masterGain);
      whiteNoise.start(0);
    }

    function playLoFiBeat() {
      if (!audioCtx || !isPlaying) return;
      const now = audioCtx.currentTime;

      const kickOsc = audioCtx.createOscillator();
      const kickGain = audioCtx.createGain();
      kickOsc.frequency.setValueAtTime(120, now);
      kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
      kickGain.gain.setValueAtTime(0.7, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      kickOsc.connect(kickGain);
      kickGain.connect(masterGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.25);

      setTimeout(() => {
        if (!isPlaying || !audioCtx) return;
        const sTime = audioCtx.currentTime;
        const snareOsc = audioCtx.createOscillator();
        const snareGain = audioCtx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(180, sTime);
        snareGain.gain.setValueAtTime(0.3, sTime);
        snareGain.gain.exponentialRampToValueAtTime(0.01, sTime + 0.15);
        snareOsc.connect(snareGain);
        snareGain.connect(masterGain);
        snareOsc.start(sTime);
        snareOsc.stop(sTime + 0.15);
      }, 660);

      const chordOsc = audioCtx.createOscillator();
      const chordGain = audioCtx.createGain();
      const chordFilter = audioCtx.createBiquadFilter();
      chordFilter.type = 'lowpass';
      chordFilter.frequency.setValueAtTime(1000, now);

      const notes = [146.83, 174.61, 220.00, 261.63];
      chordOsc.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], now);
      chordGain.gain.setValueAtTime(0.12, now);
      chordGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      chordOsc.connect(chordFilter);
      chordFilter.connect(chordGain);
      chordGain.connect(masterGain);
      chordOsc.start(now);
      chordOsc.stop(now + 1.2);
    }

    function togglePlay() {
      initAudioContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      isPlaying = !isPlaying;
      if (isPlaying) {
        playBtn.innerHTML = `<span>⏸ ПАУЗА</span>`;
        if (radioDock) radioDock.classList.add('is-playing');
        if (barsContainer) barsContainer.classList.add('is-playing');
        playLoFiBeat();
        radioInterval = setInterval(playLoFiBeat, 1333);
      } else {
        playBtn.innerHTML = `<span>▶ СЛУШАТЬ</span>`;
        if (radioDock) radioDock.classList.remove('is-playing');
        if (barsContainer) barsContainer.classList.remove('is-playing');
        clearInterval(radioInterval);
      }
    }

    playBtn.addEventListener('click', togglePlay);

    function nextTrack() {
      currentTrackIdx = (currentTrackIdx + 1) % TRACKS.length;
      if (trackTitleEl) trackTitleEl.textContent = TRACKS[currentTrackIdx];
    }
    setInterval(nextTrack, 45000);

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value) / 100;
        currentVolume = val;
        if (masterGain && audioCtx) {
          masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
        }
      });
    }

    if (toggleDockBtn && radioDock) {
      toggleDockBtn.addEventListener('click', () => {
        radioDock.classList.toggle('dock-minimized');
      });
    }

    if (stationSelect) {
      stationSelect.addEventListener('change', () => {
        nextTrack();
      });
    }
  }

    // =========================================================================
  // 6. Niche Streetwear Video Background Engine (11 Modes)
  // =========================================================================
  function setupNicheVideoBackground() {
    const primaryVideo = document.getElementById('bg-video-primary');
    const secondaryVideo = document.getElementById('bg-video-secondary');
    const titleEl = document.getElementById('video-current-title');
    const toggleBtn = document.getElementById('niche-video-toggle-btn');
    const nextBtn = document.getElementById('niche-video-next-btn');
    const drawer = document.getElementById('niche-video-drawer');
    const closeBtn = document.getElementById('niche-drawer-close-btn');
    const backdrop = document.getElementById('niche-video-backdrop');
    const gridContainer = document.getElementById('niche-video-grid-scroll');

    const NICHE_VIDEOS = [
      
      {
        id: 'glogang',
        name: 'GLO GANG // CYBER GOLD SUN',
        desc: 'Худи Glo Gang, золотое солнце, цепи, оранжевый неон',
        video: '/uploads/bg_glogang.mp4',
        poster: '/uploads/poster_glogang.jpg'
      },
      {
        id: 'chrome_hearts',
        name: 'CHROME HEARTS // GOTHIC VAULT',
        desc: 'Кинжалы, кресты, джинсы с кожаными патчами',
        video: '/uploads/bg_chrome_hearts.mp4',
        poster: '/uploads/poster_chrome_hearts.jpg'
      },
      {
        id: 'bape_harajuku',
        name: 'BAPE SHARK // TOKYO NEON 90S',
        desc: 'Камуфляжное худи Shark, сникеры Bapesta, ночь Harajuku',
        video: '/uploads/bg_bape_harajuku.mp4',
        poster: '/uploads/poster_bape_harajuku.jpg'
      },
      {
        id: 'gorpcore_arcteryx',
        name: 'ARC’TERYX & SALOMON // ALPINE LAB',
        desc: 'Куртка Alpha SV с каплями воды, трейловые XT-6',
        video: '/uploads/bg_gorpcore_arcteryx.mp4',
        poster: '/uploads/poster_gorpcore_arcteryx.jpg'
      },
      {
        id: 'mihara_yasuhiro',
        name: 'MAISON MIHARA // TOKYO ARCHIVE',
        desc: 'Волнистая подошва Peterson, джинсы Undercover 68',
        video: '/uploads/bg_mihara_yasuhiro.mp4',
        poster: '/uploads/poster_mihara_yasuhiro.jpg'
      },
      {
        id: 'travis_jordan',
        name: 'TRAVIS SCOTT AJ1 // REVERSE GRAIL',
        desc: 'Mocha reverse swoosh, худи Cactus Jack, теплый дым',
        video: '/uploads/bg_travis_jordan.mp4',
        poster: '/uploads/poster_travis_jordan.jpg'
      },
      {
        id: 'balenciaga',
        name: 'BALENCIAGA 3XL // PARIS DYSTOPIA',
        desc: 'Грязные 3XL сникеры, оверсайз худи, футуристичные очки',
        video: '/uploads/bg_balenciaga.mp4',
        poster: '/uploads/poster_balenciaga.jpg'
      },
      {
        id: 'gucci_luxury',
        name: 'GUCCI GG // ITALIAN MARBLE VAULT',
        desc: 'GG дафл, лоферы Horsebit, олимпийка с красно-зеленой лентой',
        video: '/uploads/bg_gucci_luxury.mp4',
        poster: '/uploads/poster_gucci_luxury.jpg'
      },
      {
        id: 'amiri_luxury',
        name: 'AMIRI MX1 // BEVERLY HILLS ROCK',
        desc: 'Джинсы с бандана-патчами, кеды Skel-Top со скелетонами',
        video: '/uploads/bg_amiri_luxury.mp4',
        poster: '/uploads/poster_amiri_luxury.jpg'
      },
      {
        id: 'stone_cp_grail',
        name: 'STONE ISLAND & C.P. // GOGGLE LAB',
        desc: 'Goggle куртка Mille Miglia, термо-куртка Ice, патчи',
        video: '/uploads/bg_stone_cp_grail.mp4',
        poster: '/uploads/poster_stone_cp_grail.jpg'
      }
    ];

    let currentIdx = parseInt(localStorage.getItem('sasbov_niche_video_idx') || '0', 10);
    if (isNaN(currentIdx) || currentIdx < 0 || currentIdx >= NICHE_VIDEOS.length) currentIdx = 0;

    let activeLayer = 'primary';

    function switchVideo(newIdx) {
      currentIdx = (newIdx + NICHE_VIDEOS.length) % NICHE_VIDEOS.length;
      localStorage.setItem('sasbov_niche_video_idx', currentIdx.toString());

      const item = NICHE_VIDEOS[currentIdx];
      if (titleEl) titleEl.textContent = item.name;

      if (primaryVideo && secondaryVideo) {
        const incoming = activeLayer === 'primary' ? secondaryVideo : primaryVideo;
        const outgoing = activeLayer === 'primary' ? primaryVideo : secondaryVideo;

        incoming.src = item.video;
        incoming.poster = item.poster;
        incoming.load();
        const playPromise = incoming.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            incoming.classList.add('active');
            outgoing.classList.remove('active');
            activeLayer = activeLayer === 'primary' ? 'secondary' : 'primary';
          }).catch(() => {
            incoming.classList.add('active');
            outgoing.classList.remove('active');
            activeLayer = activeLayer === 'primary' ? 'secondary' : 'primary';
          });
        }
      }

      renderDrawerCards();
    }

    function renderDrawerCards() {
      if (!gridContainer) return;
      gridContainer.innerHTML = NICHE_VIDEOS.map((v, i) => {
        const isActive = i === currentIdx;
        return `
          <div class="niche-video-card ${isActive ? 'active' : ''}" data-idx="${i}">
            <div class="niche-video-thumb-wrap">
              <img src="${v.poster}" alt="${v.name}" class="niche-video-thumb">
              ${isActive ? '<span class="niche-card-active-pill">АКТИВЕН</span>' : ''}
              <span class="niche-card-number">0${i + 1}</span>
            </div>
            <div class="niche-video-card-meta">
              <div class="niche-card-title">${v.name}</div>
              <div class="niche-card-desc">${v.desc}</div>
            </div>
          </div>
        `;
      }).join('');

      gridContainer.querySelectorAll('.niche-video-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.getAttribute('data-idx'), 10);
          switchVideo(idx);
          closeDrawer();
        });
      });
    }

    function openDrawer() {
      if (drawer) drawer.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      renderDrawerCards();
    }

    function closeDrawer() {
      if (drawer) drawer.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    }

    if (toggleBtn) toggleBtn.addEventListener('click', () => {
      if (drawer && drawer.classList.contains('open')) closeDrawer();
      else openDrawer();
    });

    if (nextBtn) nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchVideo(currentIdx + 1);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    const initialItem = NICHE_VIDEOS[currentIdx];
    if (titleEl) titleEl.textContent = initialItem.name;
    if (primaryVideo) {
      primaryVideo.src = initialItem.video;
      primaryVideo.poster = initialItem.poster;
      primaryVideo.play().catch(() => {});
    }
  }

  // =========================================================================
  // Live Procurement Status Tracker (Google Sheets Sync)
  // =========================================================================
  function setupProcurementTracker() {
    const modal = document.getElementById('procurement-modal');
    const backdrop = document.getElementById('procurement-modal-backdrop') || document.getElementById('procurement-backdrop');
    const closeBtn = document.getElementById('procurement-modal-close-btn') || document.getElementById('procurement-close-btn');
    const openBtns = document.querySelectorAll('#open-live-orders-top-btn, .ticker-open-modal-btn, .open-procurement-modal-btn');
    const tableBody = document.getElementById('procurement-table-body');
    const searchInput = document.getElementById('procurement-search-input');
    const refreshBtn = document.getElementById('procurement-refresh-btn');

    const totalEl = document.getElementById('procurement-total-items');
    const transitEl = document.getElementById('procurement-in-transit');
    const spbEl = document.getElementById('procurement-in-spb');

    let procurementData = [
      { id: 'POIZON-8921', item: 'Rick Owens Ramones Low Vintage Canvas', size: '42 EU', origin: 'Poizon (Шанхай)', status: 'Проходит Legit Check 100%', badge: 'badge-check', time: '10 мин назад' },
      { id: 'MERC-4412', item: 'Bape Color Camo Shark Full Zip Hoodie', size: 'L', origin: 'Mercari JP (Токио)', status: 'Выкуплено // В пути на склад в Токио', badge: 'badge-transit', time: '24 мин назад' },
      { id: 'SNKRD-1094', item: 'Maison Mihara Yasuhiro Peterson Low', size: '41 EU', origin: 'Snkrdunk (Япония)', status: 'Авиа-отправка в РФ', badge: 'badge-transit', time: '1 ч назад' },
      { id: 'SPB-0082', item: 'Chrome Hearts Horseshoe Floral Hoodie', size: 'XL', origin: 'Шоурум СПБ', status: 'В НАЛИЧИИ В СПБ (Балконский)', badge: 'badge-instock', time: 'Сегодня' },
      { id: 'GRAIL-3390', item: 'Balenciaga 3XL Sneaker Grey/White', size: '43 EU', origin: 'Европейский архив', status: 'Таможенное оформление', badge: 'badge-transit', time: '2 ч назад' },
      { id: 'POIZON-8955', item: 'Sp5der 555555 Worldwide Tracksuit Pink', size: 'M', origin: 'Poizon (Китай)', status: 'Выкуплено и упаковано', badge: 'badge-transit', time: '3 ч назад' },
      { id: 'SPB-0091', item: 'Hellstar Capsule 10 Yoga Tee Black', size: 'L', origin: 'Шоурум СПБ', status: 'В НАЛИЧИИ В СПБ (Балконский)', badge: 'badge-instock', time: 'Вчера' },
      { id: 'MERC-4489', item: 'Undercover 68 Denim Blue Indigo Archive', size: '32 US', origin: 'Mercari JP (Осака)', status: 'Legit Check подтверждён', badge: 'badge-check', time: '4 ч назад' }
    ];

    function renderTable(filterQuery = '') {
      if (!tableBody) return;
      const q = (filterQuery || '').toLowerCase();
      const filtered = procurementData.filter(p => {
        return p.item.toLowerCase().includes(q) || p.size.toLowerCase().includes(q) || p.origin.toLowerCase().includes(q) || p.status.toLowerCase().includes(q);
      });

      if (totalEl) totalEl.textContent = procurementData.length;
      if (transitEl) transitEl.textContent = procurementData.filter(p => p.status.includes('пути') || p.status.includes('Выкуплено') || p.status.includes('Тамож')).length;
      if (spbEl) spbEl.textContent = procurementData.filter(p => p.badge === 'badge-instock').length;

      if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Ничего не найдено по фильтру</td></tr>`;
        return;
      }

      tableBody.innerHTML = filtered.map(p => `
        <tr>
          <td><span style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-orange);">${p.id}</span></td>
          <td><strong>${p.item}</strong></td>
          <td><span class="v-size-pill">${p.size}</span></td>
          <td>${p.origin}</td>
          <td><span class="procurement-status-tag ${p.badge}">${p.status}</span></td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${p.time}</td>
        </tr>
      `).join('');
    }

    function openProcurementModal() {
      if (!modal) return;
      renderTable();
      modal.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
    }

    function closeProcurementModal() {
      if (!modal) return;
      modal.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
    }

    openBtns.forEach(btn => btn.addEventListener('click', openProcurementModal));
    if (closeBtn) closeBtn.addEventListener('click', closeProcurementModal);
    if (backdrop) backdrop.addEventListener('click', closeProcurementModal);

    if (searchInput) {
      searchInput.addEventListener('input', (e) => renderTable(e.target.value));
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('loading');
        setTimeout(() => {
          renderTable(searchInput ? searchInput.value : '');
          refreshBtn.classList.remove('loading');
        }, 300);
      });
    }
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

  // ---------------------------------------------------------------------------
  // Awwwards WOW Interactive Effects: Specular Tilt & Scroll Reveal
  // ---------------------------------------------------------------------------
  function initCardSpecularHighlights() {
    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.product-card, .fresh-drop-card, .footer-showroom-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    }, { passive: true });
  }

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const targets = document.querySelectorAll(
      '.catalog-header-block, .stock-type-bar, .filter-controls, .product-card, .footer-showroom-card'
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
    setupAmbientPosterBackdrop();
    initCardSpecularHighlights();
    initScrollReveal();
    setupProcurementTracker();
    renderProducts();
    setupFilters();
    setupMobileDrawer();
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
