/**
 * SASBOV MARKET — TikTok / Reels Feed Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sasbov_market_products_v1';
  const LIKES_KEY = 'sasbov_market_likes_v1';

  // Default initial dataset with In-Stock (Balkonsky Store, St. Petersburg) vs Pre-Order division
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
    if (!p) return 'accessories';
    if (p.category === 'footwear' || p.category === 'shoes') return 'footwear';
    if (p.category === 'accessories') return 'accessories';

    const it = (p.itemType || '').toLowerCase().trim();
    if (it.includes('кроссов') || it.includes('ботинк') || it.includes('кед') || it.includes('тапоч') || it.includes('мюли')) return 'footwear';
    if (it.includes('сумк') || it.includes('рюкзак') || it.includes('шоппер') || it.includes('час') || it.includes('очк') || it.includes('ремен') || it.includes('кепк') || it.includes('шапк') || it.includes('игрушк') || it.includes('коврик') || it.includes('аксессуар')) return 'accessories';
    if (it.includes('худи') || it.includes('свитшот') || it.includes('толстовк') || it.includes('зип') || it.includes('костюм') || it.includes('флис')) return 'hoodie';
    if (it.includes('куртк') || it.includes('пуховик') || it.includes('бомбер') || it.includes('ветровк') || it.includes('пальто') || it.includes('жилет') || it.includes('анорак')) return 'jacket';
    if (it.includes('штан') || it.includes('брюк') || it.includes('джинс') || it.includes('шорт') || it.includes('карго') || it.includes('джоггер')) return 'pants';
    if (it.includes('футболк') || it.includes('лонгслив') || it.includes('поло') || it.includes('майк')) return 'tshirt';

    const text = [
      p.name,
      p.fullName,
      p.brand,
      p.description,
      p.sku,
      ...(Array.isArray(p.subcategories) ? p.subcategories : [p.subcategories]),
      ...(Array.isArray(p.tags) ? p.tags : [])
    ].filter(Boolean).join(' ').toLowerCase();

    if (text.includes('кроссовк') || text.includes('sneaker') || text.includes('ботинк') ||
        text.includes('boots') || text.includes('кед') || text.includes('bape sta')) {
      return 'footwear';
    }

    if (text.includes('сумк') || text.includes('bag') || text.includes('рюкзак') ||
        text.includes('backpack') || text.includes('ремень') || text.includes('belt') ||
        text.includes('очки') || text.includes('glasses') || text.includes('кепк') ||
        text.includes('cap') || text.includes('шапк') || text.includes('beanie') ||
        text.includes('шарф') || text.includes('scarf') || text.includes('часы') ||
        text.includes('watch') || text.includes('кошелек') || text.includes('wallet') ||
        text.includes('украшен') || text.includes('браслет') || text.includes('кольцо') ||
        text.includes('подвеск') || text.includes('цепь') || text.includes('игрушк') ||
        text.includes('коврик') || text.includes('toy') || text.includes('шоппер') || text.includes('tote')) {
      return 'accessories';
    }

    if (text.includes('худи') || text.includes('hoodie') || text.includes('толстовк') ||
        text.includes('свитшот') || text.includes('sweatshirt') || text.includes('зипк') ||
        text.includes('crewneck') || text.includes('костюм') || text.includes('tracksuit') ||
        text.includes('sweat') || text.includes('флис') || text.includes('fleece')) {
      return 'hoodie';
    }

    if (text.includes('куртк') || text.includes('jacket') || text.includes('пуховик') ||
        text.includes('down') || text.includes('бомбер') || text.includes('ветровк') ||
        text.includes('parka') || text.includes('coat') || text.includes('пальто') ||
        text.includes('анорак') || text.includes('жилет') || text.includes('vest') ||
        text.includes('lamy-tc')) {
      return 'jacket';
    }

    if ((text.includes('штан') || text.includes('брюк') || text.includes('джинс') ||
        text.includes('jeans') || text.includes('pants') || text.includes('trousers') ||
        text.includes('шорт') || text.includes('shorts') || text.includes('cargo') ||
        text.includes('карго') || text.includes('sweatpants') || text.includes('джоггер')) &&
        !text.includes('spongebob')) {
      return 'pants';
    }

    if (text.includes('футболк') || text.includes('t-shirt') || text.includes('лонгслив') ||
        text.includes('майк') || text.includes('longsleeve') || /\btee\b/.test(text) ||
        /\bpolo\b/.test(text) || text.includes('поло ')) {
      return 'tshirt';
    }

    if (p.category === 'clothing') return 'tshirt';
    return 'accessories';
  }

  function matchProductSize(p, targetSize) {
    if (!targetSize || targetSize === 'all') return true;
    const sizes = (Array.isArray(p.sizes) ? p.sizes : [p.sizes]).filter(Boolean).map(s => String(s).toUpperCase().trim());
    if (targetSize === 'onesize') {
      return sizes.some(s => s.includes('ONE') || s.includes('УНИВЕРС') || s.includes('38Х36') || s.includes('90X40'));
    }
    if (targetSize === 'shoes_38_40') {
      return sizes.some(s => s.includes('38') || s.includes('39') || s.includes('40'));
    }
    if (targetSize === 'shoes_41_42') {
      return sizes.some(s => s.includes('41') || s.includes('42'));
    }
    if (targetSize === 'shoes_43_45') {
      return sizes.some(s => s.includes('43') || s.includes('44') || s.includes('45'));
    }
    const t = targetSize.toUpperCase();
    return sizes.some(s => s === t || s.startsWith(t + ' ') || s.includes(t));
  }

  function getProducts() {
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
  let currentCategory = 'all';
  let currentSize = 'all';
  let currentStock = 'all';
  let activeSlideIndex = 0;
  let isRandomMode = true;
  let currentShuffledDeck = [];

  function updateFeedCategoryCounts(list) {
    const counts = { all: list.length, hoodie: 0, tshirt: 0, footwear: 0, jacket: 0, pants: 0, accessories: 0 };
    list.forEach(p => {
      const cat = getProductSubcategory(p);
      const isSuit = (p.itemType && p.itemType.toLowerCase().includes('костюм')) ||
                     (Array.isArray(p.tags) && p.tags.some(t => t.includes('костюм')));
      if (counts[cat] !== undefined) counts[cat]++;
      if (isSuit && cat !== 'pants') counts.pants++;
    });
    for (const [k, v] of Object.entries(counts)) {
      const el = document.getElementById('feed-count-' + k);
      if (el) el.textContent = v;
    }
  }

  // Fisher-Yates shuffle algorithm: 100% random permutation, ZERO duplicates
  function shuffleCards(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Floating feedback toast for shuffle / actions
  function showFeedToast(msg) {
    let t = document.getElementById('feed-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'feed-toast';
      t.style.cssText = 'position:fixed;bottom:75px;left:50%;transform:translateX(-50%);background:rgba(15,15,20,0.92);backdrop-filter:blur(16px);border:1px solid rgba(168,85,247,0.6);color:#ffffff;padding:9px 18px;border-radius:20px;font-family:var(--font-mono);font-size:0.75rem;font-weight:600;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,0.7);pointer-events:none;transition:opacity 0.25s ease;letter-spacing:0.02em;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2200);
  }

  const container = document.getElementById('reels-container');
  const counterEl = document.getElementById('feed-counter');
  const filterChips = document.querySelectorAll('[data-feed-filter]');
  const randomToggleBtn = document.getElementById('feed-random-toggle');
  const prevBtn = document.getElementById('feed-prev-btn');
  const nextBtn = document.getElementById('feed-next-btn');

  function renderFeed(reshuffle = false) {
    if (!container) return;

    const baseFiltered = products.filter(p => {
      const cat = getProductSubcategory(p);
      const isSuit = (p.itemType && p.itemType.toLowerCase().includes('костюм')) ||
                     (Array.isArray(p.tags) && p.tags.some(t => t.includes('костюм')));

      const matchCategory = currentCategory === 'all'
        || cat === currentCategory
        || (currentCategory === 'footwear' && (p.category === 'footwear' || p.category === 'shoes' || cat === 'footwear'))
        || (currentCategory === 'accessories' && (p.category === 'accessories' || cat === 'accessories'))
        || (currentCategory === 'pants' && (cat === 'pants' || isSuit))
        || (currentCategory === 'hoodie' && (cat === 'hoodie' || isSuit));

      const matchStock = currentStock === 'all'
        || (currentStock === 'instock' && (p.stockType === 'instock' || p.region === 'spb'))
        || (currentStock === 'preorder' && (p.stockType === 'preorder' || p.region === 'china'));

      const matchSize = matchProductSize(p, currentSize);

      return matchCategory && matchStock && matchSize;
    });

    // Apply random mix without duplicates
    let filtered = baseFiltered;
    if (isRandomMode) {
      if (reshuffle || !currentShuffledDeck.length || currentShuffledDeck.length !== baseFiltered.length) {
        currentShuffledDeck = shuffleCards(baseFiltered);
      }
      filtered = currentShuffledDeck;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="reel-slide">
          <div class="reel-stage" style="justify-content: center; text-align: center;">
            <h2 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 1rem;">НЕТ ПОЗИЦИЙ В ЭТОЙ КАТЕГОРИИ</h2>
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
              <!-- Item Dedicated Page -->
              <a href="/product?id=${product.id}" class="reel-action-btn item-page-btn" title="Страница айтема" style="text-decoration: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                <span class="action-count" style="font-size: 8px; font-weight: 700;">ИНФО</span>
              </a>
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
                ${product.stockType === 'instock' ? '<span class="reel-origin-badge badge-instock">🟢 В НАЛИЧИИ // СПБ</span>' : (product.region === 'transit_spb' || product.stockType === 'transit_spb') ? '<span class="reel-origin-badge badge-transit-spb">✈ В ПУТИ // СПБ</span>' : (product.region === 'transit_irkutsk' || product.stockType === 'transit_irkutsk') ? '<span class="reel-origin-badge badge-transit-irk">✈ В ПУТИ // ИРКУТСК</span>' : ('<span class="reel-origin-badge ' + product.badgeClass + '">' + (product.region === 'japan' ? 'JAPAN [JP]' : product.region === 'global' ? 'GLOBAL [GLB]' : 'CHINA [CN]') + '</span>')}
                <span class="reel-deadline">[TIME: ${product.closingIn}]</span>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span class="reel-brand">${product.brand}</span>
                <span class="product-condition-pill" style="font-size: 9px; padding: 1px 6px;">● ${product.condition || 'NEW // DEADSTOCK'}</span>
              </div>
              <a href="/product?id=${product.id}" style="text-decoration: none; color: inherit;"><h2 class="reel-title">${product.name}</h2></a>
              <a href="/product?id=${product.id}" class="reel-view-product-chip">СТРАНИЦА АЙТЕМА // ПОДРОБНЕЕ ↗</a>
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
    updateFeedCategoryCounts(products);
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
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const item = filtered.find(p => p.id === id);
        const url = window.location.origin + '/product.html?id=' + id;
        const shareData = {
          title: `${item?.brand || 'SASBOV'} — ${item?.name || 'Айтем'}`,
          text: `Смотри эксклюзивный релиз на SASBOV MARKET: ${item?.brand} ${item?.name}`,
          url: url
        };
        if (navigator.share) {
          try {
            await navigator.share(shareData);
            return;
          } catch (err) {}
        }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url);
          showFeedToast(`Ссылка на «${item?.name || 'вещь'}» скопирована!`);
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
${isInstock ? '— Адрес шоурума: Санкт-Петербург, Невский просп., 110В (Balkonsky Store)\n' : ''}— Стоимость: ${formatRub(item.basePriceRub)}
— Ссылка на айтем: ${window.location.origin}/product.html?id=${item.id}

${isInstock ? 'Подтвердите наличие на точке и забронируйте вещь за мной!' : 'Подтвердите наличие на зарубежной площадке и пришлите реквизиты для выкупа!'}`;

        const tgBase = 'https://t.me/Sasbov';
        const url = `${tgBase}?text=${encodeURIComponent(text)}`;
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

  // Shuffle / Random Toggle Setup
  if (randomToggleBtn) {
    randomToggleBtn.addEventListener('click', () => {
      renderFeed(true);
      observeSlides();
      activeSlideIndex = 0;
      container.scrollTo({ top: 0, behavior: 'smooth' });
      showFeedToast('🎲 Новый микс: ' + currentShuffledDeck.length + ' дропов без повторов!');
    });
  }

  // Category & Stock Chips setup
  
  // Size Chips setup
  const sizeChips = document.querySelectorAll('[data-feed-size]');
  sizeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sizeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSize = chip.dataset.feedSize || 'all';
      activeSlideIndex = 0;
      renderFeed(true);
      observeSlides();
      container.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  function resetAllFeedFilters() {
    currentCategory = 'all';
    currentStock = 'all';
    currentSize = 'all';
    catChips.forEach(c => c.classList.toggle('active', c.dataset.feedCat === 'all'));
    sizeChips.forEach(c => c.classList.toggle('active', c.dataset.feedSize === 'all'));
    if (stockChip) stockChip.classList.remove('active');
    activeSlideIndex = 0;
    renderFeed(true);
    observeSlides();
    container.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const catChips = document.querySelectorAll('[data-feed-cat]');
  const stockChip = document.getElementById('feed-stock-instock');

  catChips.forEach(chip => {
    chip.addEventListener('click', () => {
      catChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.feedCat || 'all';
      activeSlideIndex = 0;
      renderFeed(true);
      observeSlides();
      container.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  if (stockChip) {
    stockChip.addEventListener('click', () => {
      if (currentStock === 'instock') {
        currentStock = 'all';
        stockChip.classList.remove('active');
      } else {
        currentStock = 'instock';
        stockChip.classList.add('active');
      }
      activeSlideIndex = 0;
      renderFeed(true);
      observeSlides();
      container.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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

  // Async sync with database
  async function fetchFeedProducts() {
    try {
      let list = null;
      try {
        const res = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
            list = json.data;
          }
        }
      } catch (e) {}

      if (!list) {
        try {
          const res = await fetch('data/products.json?t=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const raw = await res.json();
            if (Array.isArray(raw) && raw.length > 0) list = raw;
          }
        } catch (e) {}
      }

      if (list && list.length > 0) {
        products = list;
        products.sort((a, b) => getProductTimestamp(b) - getProductTimestamp(a));
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch (e) {}
        renderFeed(true);
        observeSlides();
      }
    } catch (e) {}
  }
  fetchFeedProducts();

  // Cross-tab real-time synchronization with Admin Panel
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === 'sasbov_market_sync_ts') {
      products = getProducts();
      renderFeed(true);
      observeSlides();
    }
  });
  window.addEventListener('sasbov:products_updated', (e) => {
    if (Array.isArray(e.detail)) {
      products = e.detail;
    } else {
      products = getProducts();
    }
    renderFeed(true);
    observeSlides();
  });

})();
