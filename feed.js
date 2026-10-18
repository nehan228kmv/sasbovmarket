/**
 * SASBOV MARKET — TikTok / Reels Feed Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sasbov_market_products_v1';
  const LIKES_KEY = 'sasbov_market_likes_v1';

  // Default initial dataset with In-Stock (Balkonsky Store, St. Petersburg) vs Pre-Order division
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
      regionLabel: 'CHINA [CN] // POIZON & SHENZHEN',
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
      regionLabel: 'JAPAN [JP] // MERCARI JP',
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

  function getProducts() {
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
      console.warn('LocalStorage error:', e);
    }
    return DEFAULT_PRODUCTS;
  }

  function getLikes() {
    try {
      const stored = localStorage.getItem(LIKES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
  }

  function saveLikes(likes) {
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
    } catch (e) {}
  }

  function formatRub(num) {
    return Math.round(num).toLocaleString('ru-RU') + ' ₽';
  }

  let products = getProducts();
  let likesState = getLikes();
  let currentFilter = 'all';
  let activeSlideIndex = 0;

  const container = document.getElementById('reels-container');
  const counterEl = document.getElementById('feed-counter');
  const filterChips = document.querySelectorAll('[data-feed-filter]');
  const prevBtn = document.getElementById('feed-prev-btn');
  const nextBtn = document.getElementById('feed-next-btn');

  function renderFeed() {
    if (!container) return;

    const filtered = products.filter(p => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'instock') return p.stockType === 'instock';
      if (currentFilter === 'preorder') return p.stockType === 'preorder';
      if (currentFilter === 'japan') return p.region === 'japan';
      if (currentFilter === 'china') return p.region === 'china';
      return p.region === currentFilter;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="reel-slide">
          <div class="reel-stage" style="justify-content: center; text-align: center;">
            <h2 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 1rem;">НЕТ ПОЗИЦИЙ В ЭТОМ РЕГИОНЕ</h2>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Переключите фильтр или вернитесь в полный каталог.</p>
            <a href="feed.html" class="btn btn-outline" style="align-self: center;">СБРОСИТЬ ФИЛЬТР</a>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((product, idx) => {
      const isLiked = !!likesState[product.id];
      const baseLikes = 28 + (idx * 17) % 80;
      const likeCount = isLiked ? baseLikes + 1 : baseLikes;

      const images = (Array.isArray(product.images) && product.images.length > 0)
        ? product.images.filter(Boolean)
        : (product.image ? [product.image] : []);

      let mediaContent = '';
      if (images.length === 0) {
        mediaContent = `
          <div class="reel-placeholder-slot">
            <svg class="reel-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span class="reel-placeholder-brand">${product.brand}</span>
            <span class="reel-placeholder-tag">МЕСТО ДЛЯ ФОТО // READY FOR MEDIA</span>
          </div>
        `;
      } else if (images.length === 1) {
        mediaContent = `
          <img src="${images[0]}" alt="${product.brand} - ${product.name}" class="reel-media-img">
        `;
      } else {
        mediaContent = `
          <div class="reel-carousel-container" data-reel-id="${product.id}">
            ${images.map((src, i) => `
              <img src="${src}" alt="${product.brand} - ${product.name} (Фото ${i + 1})" class="reel-carousel-img ${i === 0 ? 'active' : ''}" data-idx="${i}">
            `).join('')}

            <button type="button" class="reel-side-arrow arrow-prev" data-dir="prev" aria-label="Предыдущее фото">‹</button>
            <button type="button" class="reel-side-arrow arrow-next" data-dir="next" aria-label="Следующее фото">›</button>

            <div class="reel-photo-pill">
              <span class="reel-cur-idx">1</span>/${images.length}
            </div>

            <div class="reel-dots-strip">
              ${images.map((_, i) => `<span class="reel-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
            </div>
          </div>
        `;
      }

      const sizesHtml = product.sizes.map((s, sIdx) => `
        <button type="button" class="reel-size-chip ${sIdx === 0 ? 'active' : ''}" data-size="${s}">${s}</button>
      `).join('');

      return `
        <section class="reel-slide" data-index="${idx}" data-id="${product.id}">
          <div class="reel-stage">
            
            <!-- Media Box -->
            <div class="reel-media-box">
              ${mediaContent}
            </div>

            <!-- Floating Right Sidebar Actions -->
            <div class="reel-actions-sidebar">
              <!-- Like -->
              <button type="button" class="reel-action-btn like-btn ${isLiked ? 'liked' : ''}" data-id="${product.id}" title="Сохранить">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span class="action-count">${likeCount}</span>
              </button>

              <!-- Telegram direct message -->
              <button type="button" class="reel-action-btn chat-tg-btn" data-id="${product.id}" title="Задать вопрос в Telegram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.92 9.07c-.14.65-.53.81-1.07.51l-2.97-2.19-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.04 5.53-5c.24-.22-.05-.34-.38-.13l-6.84 4.3-2.95-.92c-.64-.2-.65-.64.13-.95l11.53-4.44c.53-.2 1 .12.89.82z"/></svg>
              </button>

              <!-- Share -->
              <button type="button" class="reel-action-btn share-btn" data-id="${product.id}" title="Поделиться ссылкой">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>

            <!-- Bottom Information -->
            <div class="reel-info-overlay">
              <div class="reel-origin-row">
                <span class="reel-origin-badge ${product.badgeClass}">${product.regionLabel}</span>
                <span class="reel-deadline">[TIME: ${product.closingIn}]</span>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span class="reel-brand">${product.brand}</span>
                <span class="product-condition-pill" style="font-size: 9px; padding: 1px 6px;">● ${product.condition || 'NEW // DEADSTOCK'}</span>
              </div>
              <h2 class="reel-title">${product.name}</h2>
              ${product.description ? `<p style="font-size: 0.78rem; color: #a1a1aa; line-height: 1.3; margin: 0.25rem 0 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.description}</p>` : ''}

              <div class="reel-sizes-row">
                ${sizesHtml}
              </div>

              <div class="reel-cta-bar">
                <span class="reel-price">${formatRub(product.basePriceRub)}</span>
                <button type="button" class="reel-preorder-btn reel-tg-order-btn" data-id="${product.id}">
                  ${product.stockType === 'instock' ? 'ЗАБРОНИРОВАТЬ В TG →' : 'ЗАКАЗАТЬ В TG →'}
                </button>
              </div>
            </div>

          </div>
        </section>
      `;
    }).join('');

    updateCounter(filtered.length);
    attachSlideEvents(filtered);
  }

  function updateCounter(total) {
    if (!counterEl) return;
    counterEl.textContent = `[DROP ${activeSlideIndex + 1} / ${total || 1}]`;
  }

  function attachSlideEvents(filtered) {
    // Size chip selection
    container.querySelectorAll('.reel-slide').forEach(slide => {
      const chips = slide.querySelectorAll('.reel-size-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
        });
      });
    });

    // Like Button
    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        likesState[id] = !likesState[id];
        saveLikes(likesState);

        btn.classList.toggle('liked', likesState[id]);
        const countSpan = btn.querySelector('.action-count');
        const currentCount = parseInt(countSpan.textContent, 10);
        countSpan.textContent = likesState[id] ? currentCount + 1 : currentCount - 1;
      });
    });

    // Share Button
    container.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = filtered.find(p => p.id === id);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#' + id);
          alert(`Ссылка на «${item?.name || 'вещь'}» скопирована!`);
        }
      });
    });

    // TG Quick Pre-order Button
    container.querySelectorAll('.reel-tg-order-btn, .chat-tg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = filtered.find(p => p.id === id);
        if (!item) return;

        const slide = btn.closest('.reel-slide');
        const activeSize = slide?.querySelector('.reel-size-chip.active')?.textContent || item.sizes[0] || 'Стандарт';
        const isInstock = item.stockType === 'instock';

        const greeting = isInstock 
          ? 'Здравствуйте! Хочу забронировать вещь В НАЛИЧИИ (СПб, Balkonsky Store):'
          : 'Здравствуйте! Хочу оформить предзаказ из TikTok-ленты SASBOV MARKET:';

        const text = 
`${greeting}
— Товар: ${item.brand} ${item.name}
— Состояние: ${item.condition || 'NEW // DEADSTOCK'}
— Артикул: ${item.sku}
— Размер: ${activeSize}
— Площадка / Локация: ${item.regionLabel}
— Стоимость: ${formatRub(item.basePriceRub)}

${isInstock ? 'Подскажите, когда можно подъехать на примерку в Balkonsky Store / отправить СДЭКом?' : 'Подтвердите наличие на зарубежной площадке и пришлите реквизиты для выкупа!'}`;

        const url = `https://t.me/sasbovstore?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    });

    // Multi-photo side arrows in reel slides
    container.querySelectorAll('.reel-side-arrow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const reelBox = btn.closest('.reel-carousel-container');
        if (!reelBox) return;

        const slides = reelBox.querySelectorAll('.reel-carousel-img');
        const dots = reelBox.querySelectorAll('.reel-dot');
        const counter = reelBox.querySelector('.reel-cur-idx');
        if (!slides.length) return;

        let cur = 0;
        slides.forEach((s, idx) => {
          if (s.classList.contains('active')) cur = idx;
        });

        const dir = btn.dataset.dir;
        const next = dir === 'next' ? (cur + 1) % slides.length : (cur - 1 + slides.length) % slides.length;

        slides[cur].classList.remove('active');
        slides[next].classList.add('active');

        if (dots[cur]) dots[cur].classList.remove('active');
        if (dots[next]) dots[next].classList.add('active');

        if (counter) counter.textContent = String(next + 1);
      });
    });
  }

  // Filter Chips setup
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.feedFilter;
      activeSlideIndex = 0;
      renderFeed();
      container.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Navigation: Keyboard Up/Down
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      scrollSlide(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      scrollSlide(-1);
    }
  });

  if (prevBtn) prevBtn.addEventListener('click', () => scrollSlide(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => scrollSlide(1));

  function scrollSlide(delta) {
    const slides = container.querySelectorAll('.reel-slide');
    if (!slides.length) return;

    activeSlideIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex + delta));
    slides[activeSlideIndex].scrollIntoView({ behavior: 'smooth' });
    updateCounter(slides.length);
  }

  // IntersectionObserver to track active slide on touch/wheel scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeSlideIndex = parseInt(entry.target.dataset.index, 10);
        const total = container.querySelectorAll('.reel-slide').length;
        updateCounter(total);
      }
    });
  }, { threshold: 0.6 });

  function observeSlides() {
    container.querySelectorAll('.reel-slide').forEach(slide => observer.observe(slide));
  }

  // Initialize
  renderFeed();
  observeSlides();

})();
