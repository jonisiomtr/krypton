(function () {
  'use strict';

  const DATA = window.STORE_DATA || {};
  const products = Array.isArray(DATA.products) ? DATA.products : [];
  const categories = Array.isArray(DATA.categories) ? DATA.categories : [];
  let coupons = Array.isArray(DATA.coupons) ? DATA.coupons : [];
  const store = DATA.store || {};
  const companyId = window.location.pathname.split('/')[2] || 'default';
  const STORAGE_KEY = `krypton.cart.${companyId}.v1`;
  const ORDERS_KEY = `krypton.orders.${companyId}.v1`;
  const MIN_ORDER = Number(store.minimumOrder || 10);

  const state = {
    items: [],
    coupon: null,
    orderType: store.hasDelivery !== false ? 'delivery' : 'pickup',
    paymentMethod: 'pix',
    activeCategory: 'all',
    search: ''
  };

  const modalState = {
    productId: null,
    quantity: 1,
    observation: '',
    selections: {}
  };

  const els = {};
  let toastTimer = null;

  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function productById(id) {
    return products.find((product) => String(product.id) === String(id));
  }

  function categoryById(id) {
    return categories.find((category) => category.id === id);
  }

  function imageFallback(img) {
    if (!img) return;
    img.onerror = () => {
      img.onerror = null;
      img.src = 'assets/placeholder.svg';
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.items)) state.items = saved.items.filter((item) => item && productById(item.productId));
      if (saved.coupon) state.coupon = saved.coupon;
      if (saved.orderType === 'pickup') state.orderType = 'pickup';
      if (saved.paymentMethod) state.paymentMethod = saved.paymentMethod;
    } catch (error) {
      state.items = [];
      state.coupon = null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        items: state.items,
        coupon: state.coupon,
        orderType: state.orderType,
        paymentMethod: state.paymentMethod
      }));

      // Salvar carrinho no backend se estiver logado
      if (customerData && customerData.id && companyId) {
        saveCartToBackend();
      }
    } catch (error) {
      // localStorage pode estar indisponível em file:// ou modo privado.
    }
  }

  async function saveCartToBackend() {
    if (!customerData || !customerData.id || !companyId) return;
    
    try {
      const cartData = {
        items: state.items,
        coupon: state.coupon,
        orderType: state.orderType,
        paymentMethod: state.paymentMethod
      };
      
      await fetch(`/api/orders/customers/${companyId}/${customerData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cartData })
      });
    } catch (error) {
      console.error('Erro ao salvar carrinho no backend:', error);
    }
  }

  async function saveOrderToBackend(order) {
    console.log('📦 Tentando salvar pedido no backend:', order.id);
    console.log('📦 customerData:', customerData);
    console.log('📦 companyId:', companyId);
    
    if (!customerData || !customerData.id || !companyId) {
      console.log('❌ Não é possível salvar pedido: customerData ou companyId ausente');
      return;
    }
    
    try {
      // Inicializar array de pedidos se não existir
      if (!customerData.orders) {
        customerData.orders = [];
      }
      
      // Adicionar pedido ao início do array
      customerData.orders.unshift(order);
      
      console.log('📦 Pedidos antes de salvar:', customerData.orders);
      
      // Salvar no backend
      const response = await fetch(`/api/orders/customers/${companyId}/${customerData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: customerData.orders })
      });

      console.log('📦 Resposta do backend:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📦 Resultado do backend:', result);
        if (result.success && result.customer) {
          customerData = result.customer;
          saveCustomerToCache();
          console.log('✅ Pedido salvo no backend:', order.id);
        }
      } else {
        console.error('❌ Erro ao salvar pedido no backend - Status:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar pedido no backend:', error);
    }
  }

  async function loadCartFromBackend() {
    if (!customerData || !customerData.cart) return;
    
    try {
      // Restaurar carrinho do backend
      if (Array.isArray(customerData.cart.items)) {
        state.items = customerData.cart.items.filter((item) => item && productById(item.productId));
      }
      if (customerData.cart.coupon) state.coupon = customerData.cart.coupon;
      if (customerData.cart.orderType === 'pickup') state.orderType = 'pickup';
      if (customerData.cart.paymentMethod) state.paymentMethod = customerData.cart.paymentMethod;
      
      updateAll();
    } catch (error) {
      console.error('Erro ao carregar carrinho do backend:', error);
    }
  }

  async function loadOrdersFromBackend() {
    console.log('📦 Carregando pedidos do backend...');
    console.log('📦 customerData:', customerData);
    
    if (!customerData || !customerData.orders) {
      console.log('❌ Não há pedidos no backend para carregar');
      return;
    }
    
    try {
      // Carregar pedidos do backend
      const backendOrders = customerData.orders;
      console.log('📦 Pedidos do backend:', backendOrders);
      
      // Carregar pedidos do localStorage
      const localOrders = getOrders();
      console.log('📦 Pedidos do localStorage:', localOrders);
      
      // Mesclar pedidos, priorizando backend
      const mergedOrders = [...backendOrders];
      
      // Adicionar pedidos locais que não estão no backend
      const backendOrderIds = new Set(backendOrders.map(o => o.id));
      localOrders.forEach(localOrder => {
        if (!backendOrderIds.has(localOrder.id)) {
          mergedOrders.push(localOrder);
        }
      });
      
      console.log('📦 Pedidos mesclados:', mergedOrders);
      
      // Salvar pedidos mesclados no localStorage
      saveOrders(mergedOrders);
      
      // Atualizar contador
      updateOrdersCount();
      
      console.log('✅ Pedidos carregados do backend:', mergedOrders.length);
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos do backend:', error);
    }
  }

  function normalizeSelections(selections) {
    const normalized = {};
    Object.keys(selections || {}).forEach((groupId) => {
      const value = selections[groupId];
      const list = Array.isArray(value) ? value.filter(Boolean).map(String) : (value ? [String(value)] : []);
      const unique = Array.from(new Set(list)).sort();
      if (unique.length) normalized[groupId] = unique;
    });
    return normalized;
  }

  function extrasFromSelections(product, selections) {
    const groups = product.optionGroups || [];
    const extras = [];

    groups.forEach((group) => {
      const selected = selections[group.id] || [];
      const ids = Array.isArray(selected) ? selected : [selected];
      ids.forEach((optionId) => {
        const option = (group.options || []).find((item) => String(item.id) === String(optionId));
        if (option) {
          extras.push({
            groupId: group.id,
            groupTitle: group.title || 'Opção',
            optionId: option.id,
            name: option.name,
            price: Number(option.price || 0)
          });
        }
      });
    });

    return extras;
  }

  function makeLineKey(productId, selections, observation) {
    const normalized = normalizeSelections(selections);
    const obs = String(observation || '').trim().replace(/\s+/g, ' ').toLowerCase();
    return `${productId}::${JSON.stringify(normalized)}::${obs}`;
  }

  function lineTotal(line) {
    return Number(line.unitPrice || 0) * Number(line.quantity || 0);
  }

  function cartCount() {
    return state.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function cartSubtotal() {
    return state.items.reduce((sum, item) => sum + lineTotal(item), 0);
  }

  function cartDelivery() {
    if (state.orderType === 'pickup') return 0;
    
    // Verificar se cupom é frete grátis
    if (state.coupon && state.coupon.type === 'free_shipping') {
      return 0;
    }
    
    // Calcular taxa de entrega baseada na distância ou valor fixo
    // Por enquanto, usar valor padrão
    const deliveryFee = store.deliveryFeeMin || 6;
    return deliveryFee;
  }

  function cartDiscount() {
    if (!state.coupon) return 0;
    
    const subtotal = cartSubtotal();
    
    // Frete grátis não conta como desconto monetário
    if (state.coupon.type === 'free_shipping') {
      return 0;
    }
    // Desconto percentual
    else if (state.coupon.type === 'percentage') {
      return subtotal * (state.coupon.value / 100);
    }
    // Desconto fixo
    else if (state.coupon.type === 'fixed') {
      return Math.min(state.coupon.value, subtotal);
    }
    
    return 0;
  }

  function cartTotal() {
    const total = cartSubtotal() + cartDelivery() - cartDiscount();
    return Math.max(0, total); // Garantir que o total não seja negativo
  }

  function currentCoupon() {
    if (!state.coupon || !state.coupon.code) return null;
    return coupons.find((coupon) => String(coupon.code).toUpperCase() === String(state.coupon.code).toUpperCase()) || null;
  }

  function discountAmount(subtotal) {
    const coupon = currentCoupon();
    if (!coupon || subtotal < Number(coupon.minSubtotal || 0)) return 0;
    if (coupon.type === 'percent') return subtotal * (Number(coupon.value || 0) / 100);
    return Math.min(Number(coupon.value || 0), subtotal);
  }

  function deliveryFee(subtotal, orderType) {
    if (orderType === 'pickup' || subtotal <= 0 || subtotal < MIN_ORDER) return 0;
    if (subtotal >= 80) return 0;
    if (subtotal >= 50) return 6;
    if (subtotal >= 30) return 9;
    return 12;
  }

  function totals(orderType) {
    const type = orderType || state.orderType || 'delivery';
    const subtotal = cartSubtotal();
    const discount = cartDiscount(); // Usa cartDiscount que verifica state.coupon
    const fee = cartDelivery(); // Usa cartDelivery que verifica frete grátis
    return {
      subtotal,
      discount,
      delivery: fee,
      total: Math.max(0, subtotal - discount + fee)
    };
  }

  function calculateTotal(orderType) {
    return totals(orderType).total;
  }

  function addToCart(productId, quantity = 1, options = {}) {
    const product = productById(productId);
    if (!product) return null;

    const selections = options.selections || {};
    const observation = String(options.observation || '').trim().slice(0, 300);
    const normalized = normalizeSelections(selections);
    const extras = extrasFromSelections(product, normalized);
    const unitPrice = Number(product.price || 0) + extras.reduce((sum, extra) => sum + Number(extra.price || 0), 0);
    const key = makeLineKey(product.id, normalized, observation);
    const existing = state.items.find((item) => item.key === key);
    const qty = Math.max(1, Math.min(99, Number(quantity || 1)));

    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + qty);
    } else {
      state.items.push({
        key,
        productId: product.id,
        name: product.name,
        image: product.image,
        unitPrice,
        quantity: qty,
        extras,
        observation
      });
    }

    persist();
    updateAll();
    return existing || state.items[state.items.length - 1];
  }

  function findLine(id) {
    return state.items.find((item) => item.key === id) ||
      state.items.find((item) => String(item.productId) === String(id));
  }

  function removeFromCart(id) {
    const byKey = state.items.some((item) => item.key === id);
    if (byKey) {
      state.items = state.items.filter((item) => item.key !== id);
    } else {
      state.items = state.items.filter((item) => String(item.productId) !== String(id));
    }
    persist();
    updateAll();
  }

  function updateQuantity(id, newQty) {
    const line = findLine(id);
    if (!line) return;
    const qty = Math.max(0, Math.min(99, Number(newQty || 0)));
    if (qty <= 0) {
      removeFromCart(line.key);
      return;
    }
    line.quantity = qty;
    persist();
    updateAll();
  }

  async function applyCoupon(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return { ok: false, message: 'Digite um cupom.' };

    try {
      // Validar cupom no backend
      const response = await fetch(`/api/orders/coupons/${companyId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized })
      });

      const result = await response.json();

      if (!result.success) {
        return { ok: false, message: result.error || 'Cupom inválido. Verifique o código.' };
      }

      const coupon = result.coupon;
      const subtotal = cartSubtotal();

      // Verificar pedido mínimo
      if (subtotal < Number(coupon.minOrder || 0)) {
        const needed = (coupon.minOrder - subtotal).toFixed(2);
        return { ok: false, message: `Faltam R$ ${needed} para atingir o pedido mínimo de R$ ${coupon.minOrder.toFixed(2)}.` };
      }

      // Aplicar cupom
      state.coupon = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        description: coupon.type === 'percentage' ? `${coupon.value}% de desconto` : 
                   coupon.type === 'fixed' ? `R$ ${coupon.value.toFixed(2)} de desconto` :
                   coupon.type === 'free_shipping' ? 'Frete grátis' : ''
      };

      // Salvar cupom no cliente se estiver logado
      if (customerData) {
        if (!customerData.coupons) customerData.coupons = [];
        if (!customerData.coupons.includes(coupon.code)) {
          customerData.coupons.push(coupon.code);
          await saveCustomerData({
            ...customerData,
            coupons: customerData.coupons
          });
        }
      }

      persist();
      updateAll();
      return { ok: true, couponCode: coupon.code, message: `Cupom ${coupon.code} resgatado com sucesso!` };
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      return { ok: false, message: 'Erro ao validar cupom. Tente novamente.' };
    }
  }

  function removeCoupon() {
    state.coupon = null;
    persist();
    updateAll();
  }

  function showToast(title, text, type = 'info', duration = 3600) {
    if (!els.toast) return;
    els.toast.classList.remove('success');
    if (type === 'success') els.toast.classList.add('success');
    els.toastTitle.textContent = title;
    els.toastText.textContent = text;

    clearTimeout(toastTimer);
    els.toast.classList.add('active');
    els.toastProgress.style.transition = 'none';
    els.toastProgress.style.width = '100%';
    requestAnimationFrame(() => {
      els.toastProgress.style.transition = `width ${duration}ms linear`;
      els.toastProgress.style.width = '0%';
    });

    toastTimer = setTimeout(() => {
      els.toast.classList.remove('active');
    }, duration + 120);
  }

  function renderCategories() {
    if (!els.categoryNav) return;
    
    // Extrair categorias únicas dos produtos
    const productCategories = new Map();
    products.forEach(product => {
      if (product.category) {
        if (!productCategories.has(product.category)) {
          productCategories.set(product.category, 0);
        }
        productCategories.set(product.category, productCategories.get(product.category) + 1);
      }
    });

    // Converter para array e ordenar
    const categoryList = Array.from(productCategories.entries()).map(([name, count]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count: count
    }));

    // Adicionar opção "Todos"
    const allCategories = [
      { id: 'all', name: 'Todos', count: products.length },
      ...categoryList
    ];

    els.categoryNav.innerHTML = allCategories.map((category) => `
      <li><a href="#group-${esc(category.id)}" data-category="${esc(category.id)}" class="${state.activeCategory === category.id ? 'active' : ''}">
        ${esc(category.name)} <span class="quantity-group">${Number(category.count || 0)}</span>
      </a></li>
    `).join('');

    els.categoryNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        state.activeCategory = link.dataset.category;
        renderCategories();
        renderProducts();
        if (state.activeCategory !== 'all') {
          const target = document.getElementById(`group-${state.activeCategory}`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function priceHtml(product) {
    const current = money(product.price);
    const old = product.oldPrice && product.oldPrice > product.price ? `<span class="old-price-more-request">${money(product.oldPrice)}</span>` : '';
    const off = product.discountPercent ? `<span class="price-off">-${Number(product.discountPercent)}%</span>` : '';
    return `${current}${old}${off}`;
  }

  function productCard(product) {
    const badgeQty = state.items.filter((item) => String(item.productId) === String(product.id)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const promo = product.discountPercent ? `<span class="product-promotion">-${Number(product.discountPercent)}%</span>` : '';
    const description = esc(product.description || '');
    const name = esc(product.name);

    return `
      <article class="products" data-product-id="${esc(product.id)}" role="button" tabindex="0" aria-label="Abrir ${name}">
        ${promo}
        <img class="product-image" src="${esc(product.image || 'assets/placeholder.svg')}" alt="${esc(product.name)}" loading="lazy" decoding="async" />
        <div class="product-info">
          <p class="product-name"><span class="product-name__text">${name}</span></p>
          <p class="product-description">${description}</p>
          <p class="product-price">${priceHtml(product)}</p>
          <button class="add-button" type="button" data-add-product="${esc(product.id)}">+ Adicionar</button>
        </div>
        <span class="cart-badge${badgeQty ? ' visible' : ''}" data-product-badge="${esc(product.id)}">${badgeQty || ''}</span>
      </article>
    `;
  }

  function filteredProducts() {
    const term = state.search.trim().toLowerCase();
    const byCategory = products.filter((product) => {
      // Se não houver categoria no produto, mostrar em todas as categorias
      if (!product.category) return true;
      // Se a categoria ativa for 'all', mostrar todos
      if (state.activeCategory === 'all') return true;
      // Filtrar pela categoria selecionada
      return product.category.toLowerCase() === state.activeCategory.toLowerCase();
    });

    if (!term) return byCategory;
    return byCategory.filter((product) => {
      const haystack = `${product.name} ${product.description || ''} ${product.category || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  function renderProducts() {
    if (!els.catalog) return;
    const visible = filteredProducts();
    const byCategory = new Map();

    visible.forEach((product) => {
      const category = product.category || 'Outros';
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(product);
    });

    if (!visible.length) {
      els.catalog.innerHTML = `<div class="no-results"><i class="fas fa-search" style="font-size:28px;color:#d8d8d8"></i><p>Nenhum produto encontrado para "${esc(state.search)}".</p></div>`;
      return;
    }

    els.catalog.innerHTML = Array.from(byCategory.entries()).map(([categoryName, list]) => {
      return `
        <section class="product-group" id="group-${esc(categoryName.toLowerCase().replace(/\s+/g, '-'))}">
          <span class="group-name">${esc(categoryName.charAt(0).toUpperCase() + categoryName.slice(1))}</span>
          <div class="products-container">
            ${list.map(productCard).join('')}
          </div>
          <div class="product-div"></div>
        </section>
      `;
    }).join('');

    els.catalog.querySelectorAll('.products').forEach((card) => {
      card.addEventListener('click', () => openProductModal(card.dataset.productId));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProductModal(card.dataset.productId);
        }
      });
    });

    els.catalog.querySelectorAll('[data-add-product]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        openProductModal(button.dataset.addProduct);
      });
    });

    updateProductBadges();
  }

  function updateProductBadges() {
    document.querySelectorAll('[data-product-badge]').forEach((badge) => {
      const productId = badge.dataset.productBadge;
      const qty = state.items.filter((item) => String(item.productId) === String(productId)).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      badge.textContent = qty > 99 ? '99+' : qty;
      badge.classList.toggle('visible', qty > 0);
    });
  }

  function extraChips(line) {
    const chips = (line.extras || []).map((extra) => {
      const price = Number(extra.price || 0) > 0 ? ` +${money(extra.price)}` : '';
      return `<span class="extra-chip">${esc(extra.name)}${esc(price)}</span>`;
    });
    if (line.observation) chips.push(`<span class="extra-chip extra-chip--sauce">Obs: ${esc(line.observation)}</span>`);
    return chips.join('');
  }

  function renderCart() {
    if (!els.cartItems) return;

    if (!state.items.length) {
      els.cartItems.innerHTML = `
        <div class="cart-empty">
          <i class="fas fa-shopping-basket"></i>
          <p>Sua sacola está vazia.</p>
        </div>
      `;
    } else {
      els.cartItems.innerHTML = state.items.map((line) => `
        <div class="cart-item" data-key="${esc(line.key)}">
          <img class="item-image" src="${esc(line.image || 'assets/placeholder.svg')}" alt="${esc(line.name)}" loading="lazy" />
          <div class="item-info">
            <div class="item-main">
              <span class="item-name">${esc(line.name)}</span>
              <span class="item-price">${money(lineTotal(line))}</span>
            </div>
            <div class="item-extras">${extraChips(line) || '<span class="extra-chip">Produto</span>'}</div>
            <div class="item-actions">
              <div class="qty-control">
                <button type="button" data-action="dec" data-key="${esc(line.key)}" aria-label="Diminuir"><i class="fas fa-minus"></i></button>
                <span>${Number(line.quantity)}</span>
                <button type="button" data-action="inc" data-key="${esc(line.key)}" aria-label="Aumentar"><i class="fas fa-plus"></i></button>
              </div>
              <button class="btn-remove" type="button" data-action="remove" data-key="${esc(line.key)}"><i class="fas fa-trash"></i> Remover</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    const current = totals(state.orderType);
    els.summarySubtotal.textContent = money(current.subtotal);
    els.summaryDelivery.textContent = current.delivery ? money(current.delivery) : 'Grátis';
    els.summaryDiscount.textContent = `- ${money(current.discount)}`;
    els.summaryTotal.textContent = money(current.total);
    els.goCheckout.disabled = state.items.length === 0 || current.subtotal < MIN_ORDER;

    const min = MIN_ORDER;
    const subtotal = current.subtotal;
    const percent = Math.min(100, (subtotal / min) * 100);
    els.cartProgressFill.style.width = `${percent}%`;
    els.cartProgressFill.classList.toggle('complete', subtotal >= min);
    els.cartProgressText.textContent = subtotal >= min
      ? 'Pedido mínimo atingido'
      : `Faltam ${money(Math.max(0, min - subtotal))} para o pedido mínimo`;
    els.cartProgressValue.textContent = money(subtotal);

    renderCouponApplied();
  }

  function renderCouponApplied() {
    if (!els.couponApplied) return;
    const coupon = currentCoupon();
    if (!coupon) {
      els.couponApplied.innerHTML = '';
      return;
    }
    els.couponApplied.innerHTML = `
      <div class="coupon-applied">
        <span><i class="fas fa-ticket-alt"></i> ${esc(coupon.code)} aplicado</span>
        <button type="button" class="btn-remove" data-action="remove-coupon">Remover</button>
      </div>
    `;
  }

  function updateCartButtons() {
    const count = cartCount();
    const subtotal = cartSubtotal();
    const discount = discountAmount(subtotal);
    const payableWithoutDelivery = Math.max(0, subtotal - discount);

    [els.cartCountMobile, els.cartCountDesktop].forEach((el) => {
      if (el) {
        el.textContent = count > 99 ? '99+' : count;
        el.style.display = count ? 'inline-flex' : 'none';
      }
    });
    if (els.cartTotalMobile) els.cartTotalMobile.textContent = money(payableWithoutDelivery);
    if (els.cartTotalDesktop) els.cartTotalDesktop.textContent = money(payableWithoutDelivery);
  }

  function updateAll() {
    persist();
    renderCart();
    updateCartButtons();
    updateProductBadges();
    if (els.checkoutModal && els.checkoutModal.classList.contains('active')) renderCheckout();
  }

  function openCart() {
    els.cartDrawer.classList.add('active');
    els.cartOverlay.classList.add('active');
    document.body.classList.add('cart-open');
    els.cartDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeCart() {
    els.cartDrawer.classList.remove('active');
    els.cartOverlay.classList.remove('active');
    document.body.classList.remove('cart-open');
    els.cartDrawer.setAttribute('aria-hidden', 'true');
  }

  function openOrders() {
    els.ordersModal.classList.add('active');
    els.ordersModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    renderOrders();
  }

  function closeOrders() {
    els.ordersModal.classList.remove('active');
    els.ordersModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function getOrders() {
    try {
      const stored = localStorage.getItem(ORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Erro ao carregar pedidos:', e);
      return [];
    }
  }

  function saveOrders(orders) {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Erro ao salvar pedidos:', e);
    }
  }

  function addOrder(order) {
    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
    updateOrdersCount();
  }

  function updateOrderStatus(orderId, status) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      saveOrders(orders);
    }
  }

  function updateOrdersCount() {
    const orders = getOrders();
    const count = orders.length;
    const mobileCount = els.ordersCountMobile;
    const desktopCount = els.ordersCountDesktop;
    
    if (!mobileCount || !desktopCount) return;
    
    if (count > 0) {
      mobileCount.textContent = count;
      mobileCount.style.display = 'inline';
      desktopCount.textContent = count;
      desktopCount.style.display = 'inline';
    } else {
      mobileCount.style.display = 'none';
      desktopCount.style.display = 'none';
    }
  }

  function renderOrders() {
    const orders = getOrders();
    
    if (orders.length === 0) {
      els.ordersEmpty.classList.remove('hidden');
      els.ordersList.classList.add('hidden');
      return;
    }
    
    els.ordersEmpty.classList.add('hidden');
    els.ordersList.classList.remove('hidden');
    
    els.ordersList.innerHTML = orders.map(order => {
      const statusLabels = {
        pending: 'Pendente',
        accepted: 'Aceito',
        in_transit: 'A caminho',
        finished: 'Finalizado',
        completed: 'Finalizado'
      };
      
      const itemsList = order.items.map(item => 
        `<span class="order-card-item">${item.quantity}x ${item.name}</span>`
      ).join('');
      
      const date = new Date(order.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="order-card" data-order-id="${order.id}" style="cursor: pointer;">
          <div class="order-card-header">
            <span class="order-card-number">${order.customerName || 'Cliente'}</span>
            <span class="order-card-status ${order.status}">${statusLabels[order.status] || order.status}</span>
          </div>
          <div class="order-card-date">${date}</div>
          <div class="order-card-total">Total: R$ ${order.total.toFixed(2)}</div>
          <div class="order-card-items">
            <div class="order-card-items-list">${itemsList}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Adicionar event listeners aos cards
    els.ordersList.querySelectorAll('.order-card').forEach(card => {
      card.addEventListener('click', () => {
        const orderId = card.dataset.orderId;
        openOrderDetails(orderId);
      });
    });
  }

  function openOrderDetails(orderId) {
    const orders = getOrders();
    const order = orders.find(o => String(o.id) === String(orderId));
    
    if (!order) {
      return;
    }
    
    // Salvar orderId no modal para sincronização
    els.orderDetailsModal.dataset.orderId = orderId;
    
    // Preencher dados
    els.orderDetailsNumber.textContent = `#${order.id}`;
    els.orderDetailsDate.textContent = new Date(order.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    els.orderDetailsType.textContent = order.orderType === 'delivery' ? 'Delivery' : 'Retirada';
    els.orderDetailsPayment.textContent = order.paymentMethod === 'pix' ? 'Pix' : 
                                       order.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro';
    
    els.orderDetailsCustomerName.textContent = order.customerName || '--';
    els.orderDetailsCustomerPhone.textContent = order.customerPhone || '--';
    
    if (order.customerCpf) {
      els.orderDetailsCpfRow.style.display = 'flex';
      els.orderDetailsCustomerCpf.textContent = order.customerCpf;
    } else {
      els.orderDetailsCpfRow.style.display = 'none';
    }
    
    if (order.address && order.orderType === 'delivery') {
      els.orderDetailsAddressRow.style.display = 'flex';
      els.orderDetailsAddress.textContent = order.address;
    } else {
      els.orderDetailsAddressRow.style.display = 'none';
    }
    
    // Renderizar itens
    els.orderDetailsItems.innerHTML = order.items.map(item => `
      <div class="order-detail-item">
        <div class="order-detail-item-info">
          <div class="order-detail-item-name">${item.name}</div>
          <div class="order-detail-item-qty">${item.quantity}x</div>
        </div>
        <div class="order-detail-item-price">R$ ${(item.unitPrice * item.quantity).toFixed(2)}</div>
      </div>
    `).join('');
    
    // Totais
    els.orderDetailsSubtotal.textContent = `R$ ${order.subtotal.toFixed(2)}`;
    els.orderDetailsDelivery.textContent = `R$ ${order.deliveryFee.toFixed(2)}`;
    els.orderDetailsDiscount.textContent = `- R$ ${order.discount.toFixed(2)}`;
    els.orderDetailsTotal.textContent = `R$ ${order.total.toFixed(2)}`;
    
    if (order.deliveryFee > 0) {
      els.orderDetailsDeliveryRow.style.display = 'flex';
    } else {
      els.orderDetailsDeliveryRow.style.display = 'none';
    }
    
    if (order.discount > 0) {
      els.orderDetailsDiscountRow.style.display = 'flex';
    } else {
      els.orderDetailsDiscountRow.style.display = 'none';
    }
    
    // Troco
    if (order.needsChange) {
      els.orderDetailsChangeSection.style.display = 'block';
      els.orderDetailsNeedsChange.textContent = 'Sim';
      els.orderDetailsChangeAmount.textContent = `R$ ${order.changeAmount.toFixed(2)}`;
    } else {
      els.orderDetailsChangeSection.style.display = 'none';
    }
    
    // Observação
    if (order.observation) {
      els.orderDetailsObservationSection.style.display = 'block';
      els.orderDetailsObservation.textContent = order.observation;
    } else {
      els.orderDetailsObservationSection.style.display = 'none';
    }

    // Avaliação
    const isFinished = order.status === 'completed' || order.status === 'finished';
    const hasRating = order.rating && order.rating.stars;

    if (isFinished && !hasRating) {
      // Mostrar formulário de avaliação
      els.orderDetailsRatingSection.style.display = 'block';
      els.orderDetailsRatingDisplay.style.display = 'none';
      // Resetar estrelas - remover TODAS as classes active
      if (els.orderDetailsRatingStars) {
        els.orderDetailsRatingStars.querySelectorAll('.star').forEach(star => {
          star.classList.remove('active');
        });
      }
      if (els.orderDetailsRatingComment) {
        els.orderDetailsRatingComment.value = '';
      }
    } else if (hasRating) {
      // Mostrar avaliação já feita
      els.orderDetailsRatingSection.style.display = 'none';
      els.orderDetailsRatingDisplay.style.display = 'block';
      els.orderDetailsRatingDisplayStars.innerHTML = '⭐'.repeat(order.rating.stars);
      els.orderDetailsRatingDisplayComment.textContent = order.rating.comment || '';
    } else {
      // Não mostrar nada
      els.orderDetailsRatingSection.style.display = 'none';
      els.orderDetailsRatingDisplay.style.display = 'none';
    }

    // Atualizar status steps
    updateStatusSteps(order.status, order.orderType);

    // Abrir modal
    els.orderDetailsModal.classList.remove('hidden');
    els.orderDetailsModal.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function updateStatusSteps(status, orderType) {
    const steps = els.orderStatusSteps.querySelectorAll('.status-step');
    const statusOrder = ['pending', 'accepted', 'in_transit', 'finished'];
    const currentIndex = statusOrder.indexOf(status);
    
    // Se for pickup, esconde a etapa "A caminho"
    if (orderType === 'pickup') {
      steps.forEach((step, index) => {
        if (step.dataset.step === 'in_transit') {
          step.style.display = 'none';
        } else {
          step.style.display = 'flex';
        }
      });
    } else {
      steps.forEach(step => {
        step.style.display = 'flex';
      });
    }
    
    steps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      
      if (index < currentIndex) {
        step.classList.add('completed');
      } else if (index === currentIndex) {
        step.classList.add('active');
      }
    });
  }

  function closeOrderDetails() {
    els.orderDetailsModal.classList.remove('active');
    els.orderDetailsModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  // Expor função globalmente para o onclick no HTML
  window.openOrderDetails = openOrderDetails;

  function defaultSelections(product) {
    const selections = {};
    (product.optionGroups || []).forEach((group) => {
      selections[group.id] = group.type === 'radio' && group.options && group.options.length
        ? [group.options[0].id]
        : [];
    });
    return selections;
  }

  function selectedOptionObjects(product) {
    const normalized = normalizeSelections(modalState.selections);
    return extrasFromSelections(product, normalized);
  }

  function modalUnitPrice() {
    const product = productById(modalState.productId);
    if (!product) return 0;
    const extras = selectedOptionObjects(product);
    return Number(product.price || 0) + extras.reduce((sum, extra) => sum + Number(extra.price || 0), 0);
  }

  function updateProductModalPrice() {
    const product = productById(modalState.productId);
    if (!product) return;
    const unit = modalUnitPrice();
    const total = unit * modalState.quantity;
    const old = product.oldPrice && product.oldPrice > unit ? `<span class="details-old-price">${money(product.oldPrice)}</span>` : '';
    els.productModalPrice.innerHTML = `${money(unit)}${old}`;
    els.productModalTotal.textContent = money(total);
    els.modalQtyValue.textContent = modalState.quantity;
  }

  function renderProductModalOptions() {
    const product = productById(modalState.productId);
    if (!els.productModalOptions || !product) return;

    const groups = product.optionGroups || [];
    if (!groups.length) {
      els.productModalOptions.innerHTML = '';
      return;
    }

    els.productModalOptions.innerHTML = groups.map((group) => {
      const selected = normalizeSelections(modalState.selections)[group.id] || [];
      const required = group.required ? '<small>obrigatório</small>' : '';
      return `
        <div class="option-group" data-group-id="${esc(group.id)}" data-type="${esc(group.type || 'checkbox')}">
          <div class="option-group__title"><span>${esc(group.title || 'Opções')}</span>${required}</div>
          <div class="option-list">
            ${(group.options || []).map((option) => {
              const checked = selected.includes(String(option.id)) || selected.includes(option.id);
              const inputType = group.type === 'radio' ? 'radio' : 'checkbox';
              const inputName = inputType === 'radio' ? `opt-${group.id}` : `opt-${group.id}-${option.id}`;
              const price = Number(option.price || 0) > 0 ? `+ ${money(option.price)}` : 'Grátis';
              return `
                <label class="option-row${checked ? ' selected' : ''}" data-group-id="${esc(group.id)}" data-option-id="${esc(option.id)}">
                  <input class="option-input" type="${inputType}" name="${esc(inputName)}" value="${esc(option.id)}" ${checked ? 'checked' : ''} />
                  <span class="option-row__mark"></span>
                  <span class="option-row__label">
                    <span class="option-row__name">${esc(option.name)}</span>
                    <span class="option-row__price">${esc(price)}</span>
                  </span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderProductModal() {
    const product = productById(modalState.productId);
    if (!product) return;

    els.productModalImage.src = product.image || 'assets/placeholder.svg';
    imageFallback(els.productModalImage);
    els.productModalTitle.textContent = product.name;
    els.productModalDescription.textContent = product.description || '';

    if (product.discountPercent) {
      els.productModalPromo.textContent = `-${Number(product.discountPercent)}%`;
      els.productModalPromo.classList.remove('hidden');
    } else {
      els.productModalPromo.classList.add('hidden');
    }

    renderProductModalOptions();
    updateProductModalPrice();
    els.productObservation.value = modalState.observation || '';
  }

  function openProductModal(productId) {
    const product = productById(productId);
    if (!product) return;
    modalState.productId = product.id;
    modalState.quantity = 1;
    modalState.observation = '';
    modalState.selections = defaultSelections(product);
    renderProductModal();
    els.productModal.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closeProductModal() {
    els.productModal.classList.remove('active');
    document.body.classList.remove('modal-open');
    modalState.productId = null;
  }

  function renderCheckout() {
    if (!els.checkoutItems) return;

    if (!state.items.length) {
      els.checkoutItems.innerHTML = '<div class="no-results">Sua sacola está vazia.</div>';
    } else {
      els.checkoutItems.innerHTML = state.items.map((line) => {
        const meta = [];
        if (line.extras && line.extras.length) meta.push(line.extras.map((extra) => extra.name).join(', '));
        if (line.observation) meta.push(`Obs: ${line.observation}`);
        return `
          <div class="order-item">
            <img src="${esc(line.image || 'assets/placeholder.svg')}" alt="${esc(line.name)}" loading="lazy" />
            <div class="order-item__info">
              <div class="order-item__name">${esc(line.name)}</div>
              <div class="order-item__meta">Qtd: ${Number(line.quantity)} · ${esc(meta.join(' · ') || 'Sem adicionais')}</div>
            </div>
            <div class="order-item__total">${money(lineTotal(line))}</div>
          </div>
        `;
      }).join('');
    }

    const current = totals(state.orderType);
    els.checkoutSubtotal.textContent = money(current.subtotal);
    els.checkoutDelivery.textContent = current.delivery ? money(current.delivery) : 'Grátis';
    els.checkoutDiscount.textContent = `- ${money(current.discount)}`;
    els.checkoutTotal.textContent = money(current.total);

    document.querySelectorAll('#orderTypeGroup input').forEach((input) => {
      input.checked = input.value === state.orderType;
      input.closest('.option-card').classList.toggle('selected', input.checked);
    });
    document.querySelectorAll('#paymentMethods input').forEach((input) => {
      input.checked = input.value === state.paymentMethod;
      input.closest('.option-card').classList.toggle('selected', input.checked);
    });

    const hasDelivery = window.STORE_DATA?.store?.hasDelivery !== false;
    els.addressBlock.classList.toggle('hidden', !hasDelivery || state.orderType === 'pickup');
    els.checkoutError.classList.remove('visible');
    els.checkoutError.textContent = '';
  }

  function openCheckout() {
    if (!state.items.length) {
      showToast('Sacola vazia', 'Adicione produtos antes de finalizar.', 'info');
      return;
    }
    if (cartSubtotal() < MIN_ORDER) {
      showToast('Pedido mínimo', `Adicione mais ${money(MIN_ORDER - cartSubtotal())} para finalizar.`, 'info');
      return;
    }

    closeCart();
    els.checkoutSuccessView.classList.add('hidden');
    els.checkoutFormView.classList.remove('hidden');
    renderCheckout();
    
    // Preencher dados do cliente se estiver logado
    fillCheckoutWithCustomerData();
    
    els.checkoutModal.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function fillCheckoutWithCustomerData() {
    if (!customerData || !customerData.name) return;

    // Preencher nome
    if (els.checkoutName && !els.checkoutName.value) {
      els.checkoutName.value = customerData.name;
    }

    // Preencher telefone
    if (els.checkoutPhone && !els.checkoutPhone.value && customerData.phone) {
      els.checkoutPhone.value = customerData.phone;
    }

    // Preencher CPF
    if (els.checkoutCpf && !els.checkoutCpf.value && customerData.cpf) {
      els.checkoutCpf.value = customerData.cpf;
    }

    // Preencher endereço (usar o endereço padrão se existir)
    if (els.checkoutAddress && !els.checkoutAddress.value && customerData.addresses && customerData.addresses.length > 0) {
      const defaultAddress = customerData.addresses.find(addr => addr.isDefault) || customerData.addresses[0];
      if (defaultAddress) {
        const fullAddress = `${defaultAddress.street}, ${defaultAddress.number}${defaultAddress.complement ? ', ' + defaultAddress.complement : ''} - ${defaultAddress.neighborhood}, CEP ${defaultAddress.cep}`;
        els.checkoutAddress.value = fullAddress;
      }
    }

    // Carregar endereços no dropdown
    loadAddressDropdown();
  }

  function loadAddressDropdown() {
    const dropdown = document.getElementById('addressDropdown');
    const selectBtn = document.getElementById('selectAddressBtn');
    const addressInput = document.getElementById('checkoutAddress');
    
    if (!dropdown || !customerData || !customerData.addresses || customerData.addresses.length === 0) {
      if (dropdown) dropdown.style.display = 'none';
      if (selectBtn) selectBtn.style.display = 'none';
      if (addressInput) {
        addressInput.removeAttribute('readonly');
        addressInput.style.cursor = 'text';
        addressInput.style.background = '#fff';
      }
      return;
    }

    // Mostrar botão e dropdown se houver endereços
    if (selectBtn) selectBtn.style.display = 'flex';
    if (addressInput) {
      addressInput.setAttribute('readonly', 'true');
      addressInput.style.cursor = 'pointer';
      addressInput.style.background = '#f8fafc';
    }
    
    dropdown.innerHTML = '';
    
    customerData.addresses.forEach((address, index) => {
      const item = document.createElement('div');
      item.className = 'address-dropdown-item';
      if (address.isDefault) item.classList.add('selected');
      
      const fullAddress = `${address.street}, ${address.number}${address.complement ? ', ' + address.complement : ''} - ${address.neighborhood}, CEP ${address.cep}`;
      
      item.innerHTML = `
        <div class="nickname">${address.nickname} ${address.isDefault ? '<span class="default-badge">Padrão</span>' : ''}</div>
        <div class="address">${fullAddress}</div>
      `;
      
      item.addEventListener('click', () => {
        // Preencher o campo com o endereço selecionado
        if (els.checkoutAddress) {
          els.checkoutAddress.value = fullAddress;
        }
        
        // Atualizar seleção visual
        document.querySelectorAll('.address-dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        
        // Fechar dropdown
        dropdown.classList.remove('active');
      });
      
      dropdown.appendChild(item);
    });
  }

  // Toggle do dropdown de endereços
  document.addEventListener('click', (e) => {
    const selectBtn = document.getElementById('selectAddressBtn');
    const dropdown = document.getElementById('addressDropdown');
    
    if (e.target === selectBtn || e.target.closest('#selectAddressBtn')) {
      if (dropdown) {
        dropdown.classList.toggle('active');
      }
    } else if (dropdown && !e.target.closest('.address-dropdown')) {
      dropdown.classList.remove('active');
    }
  });

  function closeCheckout(backToCart = true) {
    els.checkoutModal.classList.remove('active');
    if (!els.cartDrawer.classList.contains('active') && !els.productModal.classList.contains('active')) {
      document.body.classList.remove('modal-open');
    }
    if (backToCart && state.items.length) openCart();
  }

  function setCheckoutError(message) {
    els.checkoutError.textContent = message;
    els.checkoutError.classList.add('visible');
  }

  async function confirmOrder() {
    const name = els.checkoutName.value.trim();
    const phone = els.checkoutPhone.value.trim();
    const cpf = els.checkoutCpf.value.replace(/\D/g, '');
    const address = els.checkoutAddress.value.trim();
    const needsChange = els.needsChange?.checked || false;
    const changeAmount = els.changeAmount?.value || 0;

    if (!name) return setCheckoutError('Informe seu nome completo.');
    
    // Verificar se delivery está disponível
    const hasDelivery = window.STORE_DATA?.store?.hasDelivery !== false;
    
    if (hasDelivery && state.orderType === 'delivery' && !address) {
      return setCheckoutError('Informe o endereço de entrega.');
    }
    
    if (cpf && cpf.length !== 11) return setCheckoutError('CPF inválido. Use 11 dígitos ou deixe em branco.');
    if (!phone && state.orderType === 'delivery') return setCheckoutError('Informe um telefone/WhatsApp para contato.');

    // Preparar dados do pedido
    const orderData = {
      customerName: name,
      customerPhone: phone,
      customerCpf: cpf,
      address: hasDelivery && state.orderType === 'delivery' ? address : '',
      orderType: state.orderType,
      paymentMethod: state.paymentMethod,
      needsChange: needsChange,
      changeAmount: Number(changeAmount),
      items: state.items,
      subtotal: cartSubtotal(),
      deliveryFee: cartDelivery(),
      discount: cartDiscount(),
      total: cartTotal(),
      observation: state.items.map(item => item.observation).filter(Boolean).join(' | '),
      couponCode: state.coupon ? state.coupon.code : null,
      couponType: state.coupon ? state.coupon.type : null,
      couponValue: state.coupon ? state.coupon.value : null
    };

    try {
      console.log('Enviando pedido:', orderData);
      const response = await fetch(`/api/orders/${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();
      console.log('Resposta do servidor:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar pedido');
      }

      const orderNumber = `#${String(result.id).slice(-6)}`;
      state.items = [];
      state.coupon = null;
      persist();
      updateAll();

      // Salvar pedido no localStorage
      const order = {
        id: result.id,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerCpf: orderData.customerCpf,
        address: orderData.address,
        orderType: orderData.orderType,
        paymentMethod: orderData.paymentMethod,
        needsChange: orderData.needsChange,
        changeAmount: orderData.changeAmount,
        items: orderData.items,
        subtotal: orderData.subtotal,
        deliveryFee: orderData.deliveryFee,
        discount: orderData.discount,
        total: orderData.total,
        observation: orderData.observation,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      addOrder(order);

      // Salvar pedido no backend se o cliente estiver logado
      if (customerData) {
        await saveOrderToBackend(order);
      }

      // Fechar modal de checkout
      els.checkoutModal.classList.remove('active');
      document.body.classList.remove('modal-open');

      // Mostrar mensagem de sucesso
      showToast('Pedido gerado com sucesso!', `Seu pedido ${orderNumber} foi registrado.`, 'success', 3000);

      // Abrir modal de pedidos após um pequeno delay
      setTimeout(() => {
        openOrders();
      }, 500);
      
      // Salvar ID do pedido para avaliação posterior
      localStorage.setItem(`lastOrderId_${companyId}`, result.id);
      
      // Verificar status do pedido periodicamente para mostrar avaliação quando finalizado
      checkOrderStatus(result.id);
    } catch (error) {
      console.error('Erro ao confirmar pedido:', error);
      setCheckoutError('Erro ao enviar pedido. Tente novamente.');
    }
  }

  async function checkOrderStatus(orderId) {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${companyId}/${orderId}`);
        const order = await response.json();
        
        // Atualizar status no localStorage
        const localOrder = getOrders().find(o => o.id === orderId);
        if (localOrder && localOrder.status !== order.status) {
          updateOrderStatus(orderId, order.status);
          
          // Re-renderizar lista de pedidos
          renderOrders();
          
          // Re-renderizar se o modal de detalhes estiver aberto
          if (els.orderDetailsModal && els.orderDetailsModal.classList.contains('active')) {
            const currentOrderId = els.orderDetailsModal.dataset.orderId;
            if (currentOrderId === orderId) {
              updateStatusSteps(order.status);
            }
          }
          
          // Mostrar notificação de mudança de status
          const statusLabels = {
            accepted: 'Pedido aceito!',
            in_transit: 'Pedido a caminho!',
            finished: 'Pedido finalizado!'
          };
          if (statusLabels[order.status]) {
            showToast('Status atualizado', statusLabels[order.status], 'success', 3000);
          }
        }
        
        if ((order.status === 'completed' || order.status === 'finished') && !order.rating) {
          clearInterval(checkInterval);
          openRatingModal(orderId);
        }
      } catch (error) {
        console.error('Erro ao verificar status do pedido:', error);
      }
    }, 5000); // Verificar a cada 5 segundos
    
    // Parar após 30 minutos
    setTimeout(() => clearInterval(checkInterval), 1800000);
  }

  function openRatingModal(orderId) {
    if (!els.ratingModal) return;
    els.ratingModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Salvar ID do pedido atual
    els.ratingModal.dataset.orderId = orderId;
  }

  function closeRatingModal() {
    if (!els.ratingModal) return;
    els.ratingModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  async function submitRating() {
    const orderId = els.ratingModal.dataset.orderId;
    const selectedRating = document.querySelector('.rating-stars .star.active');
    const rating = selectedRating ? parseInt(selectedRating.dataset.rating) : 0;
    const comment = els.ratingComment.value.trim();

    if (rating < 1 || rating > 5) {
      showToast('Selecione de 1 a 5 estrelas', '', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId,
          rating,
          comment
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar avaliação');
      }

      showToast('Avaliação enviada!', 'Obrigado por sua avaliação.', 'success');
      closeRatingModal();
      
      // Atualizar média da loja
      loadStoreRating();
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      showToast('Erro ao enviar avaliação', 'Tente novamente.', 'error');
    }
  }

  async function submitOrderRating() {
    const orderId = els.orderDetailsModal.dataset.orderId;
    const activeStars = els.orderDetailsRatingStars.querySelectorAll('.star.active');
    const selectedRating = activeStars.length > 0 ? activeStars[activeStars.length - 1] : null;
    const rating = selectedRating ? parseInt(selectedRating.dataset.rating) : 0;
    const comment = els.orderDetailsRatingComment.value.trim();

    if (rating < 1 || rating > 5) {
      showToast('Selecione de 1 a 5 estrelas', '', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId,
          rating,
          comment
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar avaliação');
      }

      showToast('Avaliação enviada!', 'Obrigado por sua avaliação.', 'success');

      // Atualizar média da loja
      loadStoreRating();

      // Atualizar pedido no localStorage
      const orders = getOrders();
      const orderIndex = orders.findIndex(o => String(o.id) === String(orderId));
      if (orderIndex !== -1) {
        orders[orderIndex] = {
          ...orders[orderIndex],
          rating: {
            stars: rating,
            comment: comment || '',
            ratedAt: new Date().toISOString()
          }
        };
        saveOrders(orders);
      }

      // Re-renderizar modal para mostrar a avaliação
      openOrderDetails(orderId);
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      showToast('Erro ao enviar avaliação', 'Tente novamente.', 'error');
    }
  }

  function bindEvents() {
    els.openCartMobile.addEventListener('click', openCart);
    els.openCartDesktop.addEventListener('click', openCart);
    els.openOrdersMobile.addEventListener('click', openOrders);
    els.openOrdersDesktop.addEventListener('click', openOrders);
    els.bottomCart.addEventListener('click', (event) => {
      event.preventDefault();
      openCart();
    });
    els.closeCart.addEventListener('click', closeCart);
    els.closeOrders.addEventListener('click', closeOrders);
    els.closeOrderDetails?.addEventListener('click', closeOrderDetails);
    els.cartOverlay.addEventListener('click', closeCart);
    els.viewMenu.addEventListener('click', closeCart);
    els.goCheckout.addEventListener('click', openCheckout);

    els.searchInput.addEventListener('input', () => {
      state.search = els.searchInput.value;
      renderProducts();
    });

    els.couponForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const result = await applyCoupon(els.couponInput.value);
      if (result.ok) {
        showToast('Parabéns!', `Cupom ${result.couponCode} resgatado com sucesso!`, 'success');
        els.couponInput.value = '';
        if (!els.cartDrawer.classList.contains('active')) openCart();
      } else {
        showToast('Cupom inválido', result.message, 'info');
      }
    });

    document.querySelectorAll('.aqp-cupom-code').forEach((button) => {
      button.addEventListener('click', async () => {
        const code = button.dataset.coupon;
        els.couponInput.value = code;
        const result = await applyCoupon(code);
        if (result.ok) {
          showToast('Cupom resgatado', result.message, 'success');
          openCart();
        } else {
          showToast('Cupom indisponível', result.message, 'info');
          openCart();
        }
      });
    });

    els.cartItems.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const key = button.dataset.key;
      const action = button.dataset.action;
      if (action === 'remove') removeFromCart(key);
      if (action === 'dec') {
        const line = state.items.find((item) => item.key === key);
        if (line) updateQuantity(key, line.quantity - 1);
      }
      if (action === 'inc') {
        const line = state.items.find((item) => item.key === key);
        if (line) updateQuantity(key, line.quantity + 1);
      }
    });

    els.couponApplied.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="remove-coupon"]');
      if (button) removeCoupon();
    });

    els.productModalOptions.addEventListener('change', (event) => {
      const input = event.target;
      if (!input.classList.contains('option-input')) return;
      const row = input.closest('.option-row');
      if (!row) return;
      const groupId = row.dataset.groupId;
      const optionId = row.dataset.optionId;
      const product = productById(modalState.productId);
      const group = product && (product.optionGroups || []).find((item) => item.id === groupId);
      if (!group) return;

      if (group.type === 'radio') {
        modalState.selections[groupId] = [optionId];
      } else {
        const current = Array.isArray(modalState.selections[groupId]) ? modalState.selections[groupId].slice() : [];
        if (input.checked) {
          if (!current.some((id) => String(id) === String(optionId))) current.push(optionId);
        } else {
          modalState.selections[groupId] = current.filter((id) => String(id) !== String(optionId));
          renderProductModalOptions();
          updateProductModalPrice();
          return;
        }
        modalState.selections[groupId] = current;
      }

      renderProductModalOptions();
      updateProductModalPrice();
    });

    els.modalQtyMinus.addEventListener('click', () => {
      modalState.quantity = Math.max(1, modalState.quantity - 1);
      updateProductModalPrice();
    });
    els.modalQtyPlus.addEventListener('click', () => {
      modalState.quantity = Math.min(99, modalState.quantity + 1);
      updateProductModalPrice();
    });
    els.productObservation.addEventListener('input', () => {
      modalState.observation = els.productObservation.value;
    });
    els.addToCartButton.addEventListener('click', () => {
      const product = productById(modalState.productId);
      if (!product) return;
      addToCart(product.id, modalState.quantity, {
        selections: modalState.selections,
        observation: modalState.observation
      });
      showToast('Adicionado à sacola', `${product.name} foi adicionado.`, 'success');
      closeProductModal();
      openCart();
    });
    els.closeProductModal.addEventListener('click', closeProductModal);
    els.productModal.addEventListener('click', (event) => {
      if (event.target === els.productModal) closeProductModal();
    });

    document.querySelectorAll('#orderTypeGroup input').forEach((input) => {
      input.addEventListener('change', () => {
        state.orderType = input.value;
        persist();
        renderCheckout();
      });
    });
    document.querySelectorAll('#paymentMethods input').forEach((input) => {
      input.addEventListener('change', () => {
        state.paymentMethod = input.value;
        persist();
        renderCheckout();
        
        // Mostrar/ocultar campo de troco
        if (els.changeSection) {
          els.changeSection.style.display = input.value === 'cash' ? 'block' : 'none';
        }
      });
    });

    if (els.needsChange) {
      els.needsChange.addEventListener('change', () => {
        if (els.changeAmount) {
          els.changeAmount.disabled = !els.needsChange.checked;
        }
      });
    }

    // Rating modal
    if (els.closeRating) {
      els.closeRating.addEventListener('click', closeRatingModal);
    }

    if (els.ratingStars) {
      els.ratingStars.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
          const rating = parseInt(star.dataset.rating);
          els.ratingStars.querySelectorAll('.star').forEach((s, index) => {
            s.classList.toggle('active', index < rating);
          });
        });
      });
    }

    if (els.submitRating) {
      els.submitRating.addEventListener('click', submitRating);
    }

    // Order details rating
    if (els.orderDetailsRatingStars) {
      els.orderDetailsRatingStars.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
          const rating = parseInt(star.dataset.rating);
          els.orderDetailsRatingStars.querySelectorAll('.star').forEach((s, index) => {
            s.classList.toggle('active', index < rating);
          });
        });
      });
    }

    if (els.submitOrderRating) {
      els.submitOrderRating.addEventListener('click', submitOrderRating);
    }

    els.confirmOrder.addEventListener('click', confirmOrder);
    els.closeCheckout.addEventListener('click', () => closeCheckout(true));
    els.finishOrder.addEventListener('click', () => closeCheckout(false));
    els.checkoutModal.addEventListener('click', (event) => {
      if (event.target === els.checkoutModal) closeCheckout(true);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (els.productModal.classList.contains('active')) closeProductModal();
      else if (els.checkoutModal.classList.contains('active')) closeCheckout(true);
      else if (els.cartDrawer.classList.contains('active')) closeCart();
    });
  }

  function cacheElements() {
    [
      'categoryNav', 'catalogo', 'searchInput', 'cartItems', 'summarySubtotal', 'summaryDelivery',
      'summaryDiscount', 'summaryTotal', 'goCheckout', 'cartProgressFill', 'cartProgressText',
      'cartProgressValue', 'couponForm', 'couponInput', 'couponApplied', 'cartCountMobile',
      'cartCountDesktop', 'cartTotalMobile', 'cartTotalDesktop', 'openCartMobile', 'openCartDesktop',
      'bottomCart', 'closeCart', 'cartOverlay', 'cartDrawer', 'viewMenu', 'productModal',
      'productModalImage', 'productModalTitle', 'productModalDescription', 'productModalPrice',
      'productModalPromo', 'productModalOptions', 'modalQtyMinus', 'modalQtyPlus', 'modalQtyValue',
      'productObservation', 'productModalTotal', 'addToCartButton', 'closeProductModal',
      'checkoutModal', 'checkoutFormView', 'checkoutSuccessView', 'checkoutItems', 'checkoutSubtotal',
      'checkoutDelivery', 'checkoutDiscount', 'checkoutTotal', 'orderTypeGroup', 'paymentMethods',
      'addressBlock', 'checkoutError', 'checkoutName', 'checkoutPhone', 'checkoutCpf', 'checkoutAddress',
      'needsChange', 'changeAmount', 'changeSection',
      'confirmOrder', 'closeCheckout', 'finishOrder', 'orderNumber', 'toast', 'toastTitle', 'toastText',
      'toastProgress', 'ratingModal', 'closeRating', 'ratingStars', 'ratingComment', 'submitRating',
      'openOrdersMobile', 'openOrdersDesktop', 'ordersModal', 'closeOrders', 'ordersContent', 'ordersEmpty', 'ordersList',
      'orderDetailsModal', 'closeOrderDetails', 'orderDetailsTitle', 'orderStatusSteps',
      'orderDetailsNumber', 'orderDetailsDate', 'orderDetailsType', 'orderDetailsPayment',
      'orderDetailsCustomerName', 'orderDetailsCustomerPhone', 'orderDetailsCustomerCpf', 'orderDetailsCpfRow',
      'orderDetailsAddress', 'orderDetailsAddressRow', 'orderDetailsItems',
      'orderDetailsSubtotal', 'orderDetailsDelivery', 'orderDetailsDeliveryRow',
      'orderDetailsDiscount', 'orderDetailsDiscountRow', 'orderDetailsTotal',
      'orderDetailsChangeSection', 'orderDetailsNeedsChange', 'orderDetailsChangeAmount', 'orderDetailsChangeAmountRow',
      'orderDetailsObservationSection', 'orderDetailsObservation',
      'orderDetailsRatingSection', 'orderDetailsRatingStars', 'orderDetailsRatingComment', 'submitOrderRating',
      'orderDetailsRatingDisplay', 'orderDetailsRatingDisplayStars', 'orderDetailsRatingDisplayComment',
      'profileAvatar', 'profileName', 'profilePhone', 'profileCashback',
      'editName', 'editPhone', 'editEmail', 'editCpf', 'editBirthdate'
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
    els.catalog = els.catalogo;
  }

  function applyStoreConfig() {
    // Aplicar nome da loja
    const storeName = document.getElementById('store-name');
    const brandName = document.getElementById('brand-name');
    const bannerTitle = document.getElementById('banner-title');
    const footerName = document.getElementById('footer-name');
    const footerCopyright = document.getElementById('footer-copyright');
    if (store.storeName) {
      if (storeName) storeName.textContent = store.storeName;
      if (brandName) brandName.textContent = store.storeName;
      if (bannerTitle) bannerTitle.textContent = store.storeName;
      if (footerName) footerName.textContent = store.storeName;
      if (footerCopyright) footerCopyright.textContent = store.storeName;
    }

    // Aplicar tagline
    const brandTag = document.getElementById('brand-tag');
    if (store.tagline && brandTag) {
      brandTag.textContent = store.tagline;
    }

    // Aplicar descrição
    const bannerSubtitle = document.getElementById('banner-subtitle');
    const storeDescription = document.getElementById('store-description');
    if (store.description) {
      if (bannerSubtitle) bannerSubtitle.textContent = store.description;
      if (storeDescription) storeDescription.textContent = store.description;
    }

    // Aplicar endereço
    if (store.address && storeDescription) {
      storeDescription.textContent = store.address;
    }

    // Aplicar logo
    const headerLogo = document.getElementById('header-logo');
    const storeLogo = document.getElementById('store-logo');
    const footerLogo = document.getElementById('footer-logo');
    if (store.logo) {
      if (headerLogo) headerLogo.src = store.logo;
      if (storeLogo) storeLogo.src = store.logo;
      if (footerLogo) footerLogo.src = store.logo;
    }

    // Aplicar imagem de capa (banner)
    const headerBanner = document.querySelector('.header-banner');
    if (store.bannerImage && headerBanner) {
      headerBanner.style.backgroundImage = `url(${store.bannerImage})`;
      headerBanner.style.backgroundSize = 'cover';
      headerBanner.style.backgroundPosition = 'center';
    }

    // Aplicar cor principal
    if (store.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', store.primaryColor);
    }

    // Aplicar tempo de delivery
    const deliveryTime = document.getElementById('delivery-time');
    const footerDeliveryTime = document.getElementById('footer-delivery-time');
    const metaDeliveryTime = document.getElementById('meta-delivery-time');
    const checkoutDeliveryDesc = document.getElementById('checkout-delivery-desc');
    const deliveryOption = document.querySelector('input[name="orderType"][value="delivery"]');
    
    // Verificar se faz entrega
    const hasDelivery = store.hasDelivery !== false;
    
    if (hasDelivery && store.deliveryTime) {
      if (deliveryTime) deliveryTime.textContent = `Delivery ${store.deliveryTime}`;
      if (footerDeliveryTime) footerDeliveryTime.textContent = `Delivery: ${store.deliveryTime}`;
      if (metaDeliveryTime) metaDeliveryTime.textContent = store.deliveryTime;
      if (checkoutDeliveryDesc) checkoutDeliveryDesc.textContent = `${store.deliveryTime} · taxa calculada no total`;
      if (deliveryOption) {
        deliveryOption.parentElement.style.display = 'flex';
        deliveryOption.disabled = false;
      }
    } else {
      // Esconder elementos de delivery
      if (deliveryTime) deliveryTime.parentElement.style.display = 'none';
      if (footerDeliveryTime) footerDeliveryTime.parentElement.style.display = 'none';
      if (metaDeliveryTime) metaDeliveryTime.parentElement.style.display = 'none';
      
      // Esconder taxa de delivery
      const metaDeliveryFee = document.getElementById('meta-delivery-fee');
      if (metaDeliveryFee) metaDeliveryFee.parentElement.style.display = 'none';
      
      if (deliveryOption) {
        deliveryOption.parentElement.style.display = 'none';
        deliveryOption.disabled = true;
        deliveryOption.checked = false;
      }
      // Selecionar pickup automaticamente
      const pickupOption = document.querySelector('input[name="orderType"][value="pickup"]');
      if (pickupOption) {
        pickupOption.checked = true;
      }
    }

    // Aplicar tempo de retirada
    const pickupTime = document.getElementById('pickup-time');
    const footerPickupTime = document.getElementById('footer-pickup-time');
    if (store.pickupTime) {
      if (pickupTime) pickupTime.textContent = `Retirada ${store.pickupTime}`;
      if (footerPickupTime) footerPickupTime.textContent = `Retirada: ${store.pickupTime}`;
    }

    // Aplicar pedido mínimo
    const minOrder = document.getElementById('min-order');
    const footerMinOrder = document.getElementById('footer-min-order');
    if (store.minimumOrder) {
      if (minOrder) minOrder.textContent = `Pedido mínimo ${money(store.minimumOrder)}`;
      if (footerMinOrder) footerMinOrder.textContent = `Pedido mínimo: ${money(store.minimumOrder)}`;
    }

    // Aplicar status (aberto/fechado) com base nos horários
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    if (statusBadge && statusText && store.hours) {
      const now = new Date();
      const dayIndex = now.getDay(); // 0 = domingo, 1 = segunda, etc.
      const dayName = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][dayIndex];
      const dayConfig = store.hours[dayName];

      if (dayConfig && dayConfig.open && dayConfig.close) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const [openHour, openMin] = dayConfig.open.split(':').map(Number);
        const [closeHour, closeMin] = dayConfig.close.split(':').map(Number);
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;

        const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
        statusBadge.className = `store-badge store-badge--${isOpen ? 'open' : 'closed'}`;
        statusText.textContent = isOpen ? 'Aberto agora' : 'Fechado agora';
      } else {
        // Se não houver horário configurado para o dia, mostra fechado
        statusBadge.className = 'store-badge store-badge--closed';
        statusText.textContent = 'Fechado agora';
      }
    }

    // Aplicar WhatsApp, email e telefone no footer
    const footerWhatsapp = document.getElementById('footer-whatsapp');
    const metaWhatsapp = document.getElementById('meta-whatsapp');
    const footerEmail = document.getElementById('footer-email');
    const footerPhone = document.getElementById('footer-phone');

    if (store.whatsapp) {
      const whatsappNumber = store.whatsapp.replace(/\D/g, ''); // Remove não-dígitos
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=Olá! Vim pelo site da ${store.storeName || 'loja'}`;
      
      if (footerWhatsapp) {
        const parent = footerWhatsapp.parentElement;
        const link = document.createElement('a');
        link.href = whatsappLink;
        link.target = '_blank';
        link.textContent = footerWhatsapp.textContent;
        parent.replaceChild(link, footerWhatsapp);
      }

      if (metaWhatsapp) {
        const parent = metaWhatsapp.parentElement;
        const link = document.createElement('a');
        link.href = whatsappLink;
        link.target = '_blank';
        link.textContent = metaWhatsapp.textContent;
        parent.replaceChild(link, metaWhatsapp);
      }
    }

    if (store.email && footerEmail) {
      footerEmail.textContent = store.email;
      const parent = footerEmail.parentElement;
      const link = document.createElement('a');
      link.href = `mailto:${store.email}`;
      link.textContent = store.email;
      parent.replaceChild(link, footerEmail);
    }

    if (store.phone && footerPhone) {
      footerPhone.textContent = store.phone;
      const parent = footerPhone.parentElement;
      const link = document.createElement('a');
      link.href = `tel:${store.phone}`;
      link.textContent = store.phone;
      parent.replaceChild(link, footerPhone);
    }

    // Atualizar status imediatamente
    updateStoreStatus();
  }

  // Atualizar status em tempo real (a cada minuto)
  function updateStoreStatus() {
    const statusBadge = document.getElementById('status-badge');
    const statusText = document.getElementById('status-text');
    if (!statusBadge || !statusText || !window.STORE_DATA || !window.STORE_DATA.store) return;

    const store = window.STORE_DATA.store;
    if (!store.hours) return;

    const now = new Date();
    const dayIndex = now.getDay(); // 0 = domingo, 1 = segunda, etc.
    const dayName = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][dayIndex];
    const dayConfig = store.hours[dayName];

    if (dayConfig && dayConfig.open && dayConfig.close) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const [openHour, openMin] = dayConfig.open.split(':').map(Number);
      const [closeHour, closeMin] = dayConfig.close.split(':').map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;

      const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
      statusBadge.className = `store-badge store-badge--${isOpen ? 'open' : 'closed'}`;
      statusText.textContent = isOpen ? 'Aberto agora' : 'Fechado agora';
    } else {
      statusBadge.className = 'store-badge store-badge--closed';
      statusText.textContent = 'Fechado agora';
    }
  }

  // Iniciar atualização do status a cada minuto
  setInterval(updateStoreStatus, 60000);

  // =========================================
  // CUSTOMER LOGIN
  // =========================================
  
  let customerData = null;
  const CUSTOMER_CACHE_KEY = `krypton.customer.cache.${companyId}`;
  
  // Carregar cliente do cache ao iniciar
  window.loadCustomerFromCache = function() {
    const cached = localStorage.getItem(CUSTOMER_CACHE_KEY);
    if (cached) {
      try {
        customerData = JSON.parse(cached);
        console.log('✅ Cliente carregado do cache:', customerData);
        updateLoginButton();
        
        // SEMPRE recarregar dados do backend para garantir status atualizados
        if (customerData.phone) {
          loadCustomerData(customerData.phone);
        }
      } catch (e) {
        console.error('❌ Erro ao carregar cache:', e);
      }
    }
  }
  
  // Salvar cliente no cache
  function saveCustomerToCache() {
    if (customerData) {
      localStorage.setItem(CUSTOMER_CACHE_KEY, JSON.stringify(customerData));
    } else {
      localStorage.removeItem(CUSTOMER_CACHE_KEY);
    }
  }

  function openCustomerLogin() {
    console.log('🔓 openCustomerLogin chamado');
    const modal = document.getElementById('customerLoginModal');
    console.log('🔓 Modal encontrado:', !!modal);
    
    if (customerData) {
      // Se já estiver logado, abre o perfil
      console.log('🔓 Cliente já logado, abrindo perfil');
      showProfile();
    } else {
      // Se não estiver logado, abre o modal de login
      console.log('🔓 Cliente não logado, abrindo modal de login');
      if (modal) {
        modal.classList.remove('hidden');
        console.log('🔓 Modal aberto');
      }
      showLoginStep(1);
    }
  }

  function closeCustomerLogin() {
    const modal = document.getElementById('customerLoginModal');
    if (modal) modal.classList.add('hidden');
  }

  function showLoginStep(step) {
    const step1 = document.getElementById('loginStep1');
    const step2 = document.getElementById('loginStep2');
    const step3 = document.getElementById('loginStep3');
    
    if (step1) step1.classList.add('hidden');
    if (step2) step2.classList.add('hidden');
    if (step3) step3.classList.add('hidden');

    if (step === 1) {
      if (step1) step1.classList.remove('hidden');
    } else if (step === 2) {
      if (step2) step2.classList.remove('hidden');
    } else if (step === 3) {
      if (step3) step3.classList.remove('hidden');
    }
  }

  function formatPhoneNumber(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }

  async function saveCustomerData(data) {
    try {
      const response = await fetch(`/api/orders/customers/${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.success) {
        customerData = result.customer;
        saveCustomerToCache();
        updateLoginButton();
        console.log('✅ Cliente salvo no backend:', customerData);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar cliente:', error);
      alert('Erro ao salvar dados. Tente novamente.');
    }
  }

  function updateLoginButton() {
    const loginButton = document.querySelector('.login-button');
    if (customerData && customerData.name) {
      loginButton.textContent = `Olá, ${customerData.name.split(' ')[0]}`;
    } else {
      loginButton.textContent = 'Fazer Login';
    }
  }

  function showProfile() {
    const modal = document.getElementById('customerLoginModal');
    if (modal) modal.classList.remove('hidden');
    showLoginStep(3);
    
    // Preencher dados do perfil
    if (customerData) {
      els.profileAvatar.textContent = customerData.name.charAt(0).toUpperCase();
      els.profileName.textContent = customerData.name;
      els.profilePhone.textContent = formatPhoneNumber(customerData.phone);
      els.editName.value = customerData.name || '';
      els.editPhone.value = formatPhoneNumber(customerData.phone);
      els.editEmail.value = customerData.email || '';
      els.editCpf.value = customerData.cpf || '';
      els.editBirthdate.value = customerData.birthdate || '';
      
      // Renderizar endereços
      renderAddresses();
      
      // Renderizar pedidos
      renderProfileOrders();
      
      // Renderizar benefícios
      renderProfileBenefits();
    }
  }
  
  // Renderizar benefícios (cupons) no perfil
  function renderProfileBenefits() {
    const benefitsContainer = document.getElementById('benefitsList');
    const benefitsEmpty = document.getElementById('benefitsEmpty');
    
    if (!benefitsContainer || !benefitsEmpty) return;
    
    if (!customerData.coupons || customerData.coupons.length === 0) {
      benefitsContainer.innerHTML = '';
      benefitsEmpty.style.display = 'block';
      return;
    }
    
    benefitsEmpty.style.display = 'none';
    benefitsContainer.innerHTML = '';
    
    customerData.coupons.forEach(couponCode => {
      const coupon = coupons.find(c => c.code === couponCode);
      if (!coupon) return;
      
      const card = document.createElement('div');
      card.className = 'benefit-card';
      
      const typeLabel = coupon.type === 'percentage' ? `${coupon.value}% de desconto` :
                        coupon.type === 'fixed' ? `R$ ${coupon.value.toFixed(2)} de desconto` :
                        coupon.type === 'free_shipping' ? 'Frete grátis' : '';
      
      card.innerHTML = `
        <div class="benefit-card-icon">
          <i class="fas fa-ticket-alt"></i>
        </div>
        <div class="benefit-card-content">
          <div class="benefit-card-code">${coupon.code}</div>
          <div class="benefit-card-value">${typeLabel}</div>
          ${coupon.minOrder ? `<div class="benefit-card-min">Pedido mínimo: R$ ${coupon.minOrder.toFixed(2)}</div>` : ''}
        </div>
      `;
      
      benefitsContainer.appendChild(card);
    });
  }

  async function loadCustomerData(phone) {
    try {
      const response = await fetch(`/api/orders/customers/${companyId}/${phone}`);
      const result = await response.json();
      
      if (result.success && result.customer) {
        customerData = result.customer;
        saveCustomerToCache();
        updateLoginButton();
        
        // Carregar carrinho do backend
        await loadCartFromBackend();
        
        // Carregar pedidos do backend
        await loadOrdersFromBackend();
        
        console.log('✅ Cliente carregado do backend:', customerData);
        
        // Iniciar polling se o cliente tiver pedidos
        if (customerData.orders && customerData.orders.length > 0 && !window.pollingStarted) {
          startOrdersPolling();
          window.pollingStarted = true;
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao carregar cliente:', error);
      return false;
    }
  }

  function logout() {
    // Salvar carrinho antes de fazer logout
    saveCartToBackend();
    
    // Limpar carrinho do localStorage
    localStorage.removeItem(STORAGE_KEY);
    
    // Limpar carrinho do estado
    state.items = [];
    state.coupon = null;
    state.orderType = 'delivery';
    state.paymentMethod = 'pix';
    
    customerData = null;
    saveCustomerToCache();
    updateLoginButton();
    closeCustomerLogin();
    
    // Atualizar UI
    updateAll();
  }

  // Event Listeners do Login
  const loginButton = document.querySelector('.login-button');
  if (loginButton) {
    loginButton.addEventListener('click', openCustomerLogin);
    console.log('✅ Event listener de login adicionado');
  } else {
    console.error('❌ Botão de login não encontrado');
  }
  
  // Usar getElementById direto para garantir que os elementos existem
  const closeLoginBtn = document.getElementById('closeLogin');
  const closeProfileBtn = document.getElementById('closeProfile');
  const loginStep1NextBtn = document.getElementById('loginStep1Next');
  const loginStep2BackBtn = document.getElementById('loginStep2Back');
  const loginStep2NextBtn = document.getElementById('loginStep2Next');
  const saveProfileDataBtn = document.getElementById('saveProfileData');
  const logoutBtn = document.getElementById('logoutButton');
  
  if (closeLoginBtn) closeLoginBtn.addEventListener('click', closeCustomerLogin);
  if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeCustomerLogin);

  // Formatação do input de telefone
  const customerPhoneInput = document.getElementById('customerPhone');
  if (customerPhoneInput) {
    customerPhoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhoneNumber(e.target.value);
    });
  }

  // Etapa 1: Avançar para etapa 2
  if (loginStep1NextBtn) {
    loginStep1NextBtn.addEventListener('click', async () => {
      const phone = customerPhoneInput.value.replace(/\D/g, '');
      if (phone.length < 10) {
        alert('Digite um número de WhatsApp válido');
        return;
      }
      
      // Salvar telefone temporariamente
      window.tempPhone = phone;
      
      // Buscar cliente existente no backend
      const exists = await loadCustomerData(phone);
      
      if (exists) {
        // Cliente já existe, ir direto para perfil
        showProfile();
      } else {
        // Cliente novo, pedir nome
        const customerPhoneDisplay = document.getElementById('customerPhoneDisplay');
        if (customerPhoneDisplay) {
          customerPhoneDisplay.value = customerPhoneInput.value;
        }
        showLoginStep(2);
      }
    });
  }

  // Etapa 2: Voltar para etapa 1
  if (loginStep2BackBtn) {
    loginStep2BackBtn.addEventListener('click', () => {
      showLoginStep(1);
    });
  }

  // Etapa 2: Finalizar cadastro
  if (loginStep2NextBtn) {
    loginStep2NextBtn.addEventListener('click', async () => {
      const customerNameInput = document.getElementById('customerName');
      const name = customerNameInput.value.trim();
      const phone = window.tempPhone || customerPhoneInput.value.replace(/\D/g, '');
      
      if (!name || name.length < 2) {
        alert('Digite seu nome completo');
        return;
      }
      
      // Salvar dados do cliente no backend
      await saveCustomerData({
        name,
        phone,
        email: '',
        cpf: '',
        birthdate: '',
        cashback: 0
      });
      
      showProfile();
    });
  }

  // Navegação do perfil
  document.querySelectorAll('.profile-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.profile-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const tab = item.dataset.tab;
      document.querySelectorAll('.profile-tab').forEach(t => {
        t.classList.remove('active');
        t.classList.add('hidden');
      });
      const tabElement = document.getElementById(`tab-${tab}`);
      if (tabElement) {
        tabElement.classList.add('active');
        tabElement.classList.remove('hidden');
      }

      // Renderizar endereços quando a aba for aberta
      if (tab === 'addresses') {
        renderAddresses();
      }

      // Renderizar pedidos quando a aba for aberta
      if (tab === 'orders') {
        renderProfileOrders();
      }

      // Renderizar benefícios quando a aba for aberta
      if (tab === 'benefits') {
        renderProfileBenefits();
      }
    });
  });

  // Salvar dados do perfil
  if (saveProfileDataBtn) {
    saveProfileDataBtn.addEventListener('click', () => {
      if (customerData) {
        const editNameInput = document.getElementById('editName');
        const editEmailInput = document.getElementById('editEmail');
        const editCpfInput = document.getElementById('editCpf');
        const editBirthdateInput = document.getElementById('editBirthdate');
        
        customerData.name = editNameInput.value;
        customerData.email = editEmailInput.value;
        customerData.cpf = editCpfInput.value;
        customerData.birthdate = editBirthdateInput.value;
        saveCustomerData(customerData);
        alert('Dados salvos com sucesso!');
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // =========================================
  // GERENCIAMENTO DE ENDEREÇOS
  // =========================================

  const addressModal = document.getElementById('addressModal');
  const closeAddressModalBtn = document.getElementById('closeAddressModal');
  const cancelAddressBtn = document.getElementById('cancelAddressBtn');
  const addAddressBtn = document.getElementById('addAddressBtn');
  const addressForm = document.getElementById('addressForm');
  const addressesList = document.getElementById('addressesList');

  // Abrir modal de endereço
  function openAddressModal(address = null) {
    if (addressModal) {
      addressModal.classList.remove('hidden');
      
      // Limpar ou preencher formulário
      if (address) {
        document.getElementById('addressNickname').value = address.nickname || '';
        document.getElementById('addressCep').value = address.cep || '';
        document.getElementById('addressNumber').value = address.number || '';
        document.getElementById('addressStreet').value = address.street || '';
        document.getElementById('addressNeighborhood').value = address.neighborhood || '';
        document.getElementById('addressComplement').value = address.complement || '';
        addressForm.dataset.editId = address.id;
      } else {
        addressForm.reset();
        delete addressForm.dataset.editId;
      }
    }
  }

  // Fechar modal de endereço
  function closeAddressModal() {
    if (addressModal) {
      addressModal.classList.add('hidden');
      addressForm.reset();
      delete addressForm.dataset.editId;
    }
  }

  // Formatar CEP
  function formatCep(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length > 5) {
      return numbers.slice(0, 5) + '-' + numbers.slice(5, 8);
    }
    return numbers;
  }

  // Salvar endereço
  async function saveAddress(e) {
    e.preventDefault();
    
    const nickname = document.getElementById('addressNickname').value.trim();
    const cep = document.getElementById('addressCep').value.replace(/\D/g, '');
    const number = document.getElementById('addressNumber').value.trim();
    const street = document.getElementById('addressStreet').value.trim();
    const neighborhood = document.getElementById('addressNeighborhood').value.trim();
    const complement = document.getElementById('addressComplement').value.trim();
    const editId = addressForm.dataset.editId;

    if (!nickname || !cep || !number || !street || !neighborhood) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    if (cep.length !== 8) {
      alert('CEP inválido');
      return;
    }

    // Atualizar customerData
    if (!customerData.addresses) {
      customerData.addresses = [];
    }

    const addressData = {
      id: editId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nickname,
      cep: formatCep(cep),
      number,
      street,
      neighborhood,
      complement,
      isDefault: customerData.addresses.length === 0 // Primeiro endereço é padrão
    };

    if (editId) {
      // Editar existente
      const index = customerData.addresses.findIndex(a => a.id === editId);
      if (index !== -1) {
        addressData.isDefault = customerData.addresses[index].isDefault;
        customerData.addresses[index] = addressData;
      }
    } else {
      // Adicionar novo
      customerData.addresses.push(addressData);
    }

    // Salvar no backend
    await saveCustomerData(customerData);
    
    closeAddressModal();
    renderAddresses();
    alert('Endereço salvo com sucesso!');
  }

  // Renderizar lista de endereços
  function renderAddresses() {
    if (!addressesList) return;

    // Inicializar array de endereços se não existir
    if (!customerData.addresses) {
      customerData.addresses = [];
    }

    addressesList.innerHTML = '';

    if (customerData.addresses.length === 0) {
      addressesList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-map-marker-alt"></i>
          <p>Nenhum endereço salvo ainda.</p>
        </div>
      `;
      return;
    }

    customerData.addresses.forEach(address => {
      const card = document.createElement('div');
      card.className = 'address-card';
      card.innerHTML = `
        <div class="address-card-icon">
          <i class="fas fa-home"></i>
        </div>
        <div class="address-card-content">
          <div class="address-card-header">
            <span class="address-card-nickname">${address.nickname}</span>
            ${address.isDefault ? '<span class="address-card-default">Padrão</span>' : ''}
          </div>
          <p class="address-card-address">
            ${address.street}, ${address.number}${address.complement ? ', ' + address.complement : ''}<br>
            ${address.neighborhood}<br>
            CEP ${address.cep}
          </p>
          <div class="address-card-actions">
            <span class="address-card-action edit" onclick="editAddress('${address.id}')">Editar</span>
            <span class="address-card-action delete" onclick="deleteAddress('${address.id}')">Excluir</span>
          </div>
        </div>
      `;
      addressesList.appendChild(card);
    });
  }

  // Renderizar pedidos no perfil
  function renderProfileOrders() {
    const ordersList = document.getElementById('profileOrdersList');
    const ordersEmpty = document.getElementById('profileOrdersEmpty');
    
    if (!ordersList || !ordersEmpty) return;

    // Inicializar array de pedidos se não existir
    if (!customerData.orders) {
      customerData.orders = [];
    }

    ordersList.innerHTML = '';

    if (customerData.orders.length === 0) {
      ordersEmpty.style.display = 'block';
      return;
    }

    ordersEmpty.style.display = 'none';

    // Ordenar pedidos por data (mais recentes primeiro)
    const sortedOrders = [...customerData.orders].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    sortedOrders.forEach(order => {
      const card = document.createElement('div');
      card.className = 'order-card';
      card.dataset.orderId = order.id;
      card.style.cursor = 'pointer';
      
      // Formatar data
      const date = new Date(order.createdAt);
      const formattedDate = date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Mapear status para português
      const statusMap = {
        'pending': 'Pendente',
        'accepted': 'Aceito',
        'preparing': 'Preparando',
        'ready': 'Pronto',
        'on_the_way': 'Saiu para entrega',
        'completed': 'Finalizado',
        'cancelled': 'Cancelado'
      };

      const statusClass = order.status || 'pending';
      const statusText = statusMap[statusClass] || statusClass;

      // Calcular total
      const total = order.items.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 1;
        return sum + (price * quantity);
      }, 0);

      // Formatar itens
      const itemsHtml = order.items.map(item => 
        `<span class="order-card-item">${item.quantity}x ${item.name}</span>`
      ).join('');

      card.innerHTML = `
        <div class="order-card-header">
          <span class="order-card-number">${customerData.name}</span>
          <span class="order-card-status ${statusClass}">${statusText}</span>
        </div>
        <div class="order-card-date">${formattedDate}</div>
        <div class="order-card-total">Total: R$ ${total.toFixed(2)}</div>
        <div class="order-card-items">
          <div class="order-card-items-list">${itemsHtml}</div>
        </div>
      `;

      // Clique para ver detalhes
      card.addEventListener('click', () => {
        // Abrir modal de detalhes do pedido (se existir)
        if (typeof openOrderDetails === 'function') {
          openOrderDetails(order.id);
        }
      });

      ordersList.appendChild(card);
    });
  }

  // Editar endereço
  window.editAddress = function(addressId) {
    const address = customerData.addresses.find(a => a.id === addressId);
    if (address) {
      openAddressModal(address);
    }
  };

  // Excluir endereço
  window.deleteAddress = function(addressId) {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) return;

    customerData.addresses = customerData.addresses.filter(a => a.id !== addressId);
    
    // Se excluiu o padrão, definir o primeiro como padrão
    if (customerData.addresses.length > 0 && !customerData.addresses.some(a => a.isDefault)) {
      customerData.addresses[0].isDefault = true;
    }

    saveCustomerData(customerData);
    renderAddresses();
  };

  // Event listeners
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', () => openAddressModal());
  }

  if (closeAddressModalBtn) {
    closeAddressModalBtn.addEventListener('click', closeAddressModal);
  }

  if (cancelAddressBtn) {
    cancelAddressBtn.addEventListener('click', closeAddressModal);
  }

  if (addressForm) {
    addressForm.addEventListener('submit', saveAddress);
  }

  // Formatação do CEP
  const cepInput = document.getElementById('addressCep');
  if (cepInput) {
    cepInput.addEventListener('input', (e) => {
      e.target.value = formatCep(e.target.value);
    });
  }

  // Inicializar botão de login
  updateLoginButton();

  function init() {
    cacheElements();
    loadState();
    bindEvents();
    applyStoreConfig();
    loadCouponsFromBackend();
    renderCategories();
    renderProducts();
    updateAll();
    updateOrdersCount();

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }
  
  // Carregar cupons do backend
  async function loadCouponsFromBackend() {
    try {
      const response = await fetch(`/site/${companyId}/coupons`);
      const result = await response.json();
      
      if (result.success && result.coupons) {
        coupons = result.coupons;
        console.log('✅ Cupons carregados:', coupons);
      }
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    }
  }

  function loadStoreRating() {
    fetch(`/api/orders/ratings/average/${companyId}`)
      .then(res => {
        if (!res.ok) return;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const storeRating = document.getElementById('store-rating');
        if (storeRating && data.average) {
          storeRating.textContent = data.average.replace('.', ',');
        }
      })
      .catch(err => {
        console.error('Erro ao carregar média:', err);
      });
  }

  // Verificar status dos pedidos do cliente em tempo real
  async function checkOrdersStatus() {
    if (!customerData || !customerData.orders || customerData.orders.length === 0) return;
    
    try {
      // Buscar todos os pedidos do backend para comparar
      const response = await fetch(`/api/orders/${companyId}`);
      if (!response.ok) return;
      
      const allOrders = await response.json();
      if (!Array.isArray(allOrders)) return;
      
      // Filtrar apenas os pedidos do cliente atual
      const customerOrders = allOrders.filter(o => o.customerPhone === customerData.phone);
      
      if (customerOrders.length === 0) return;
      
      // Verificar se houve mudanças de status
      let hasChanges = false;
      const currentOrders = getOrders();
      
      customerOrders.forEach(backendOrder => {
        const localOrder = currentOrders.find(o => String(o.id) === String(backendOrder.id));
        
        if (localOrder && localOrder.status !== backendOrder.status) {
          console.log('📦 Status do pedido mudou:', backendOrder.id, localOrder.status, '→', backendOrder.status);
          
          // Atualizar status no localStorage
          localOrder.status = backendOrder.status;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        // Salvar atualizações
        saveOrders(currentOrders);
        
        // Re-renderizar se o modal de pedidos estiver aberto
        if (els.ordersModal && els.ordersModal.classList.contains('active')) {
          renderOrders();
        }
        
        // Re-renderizar se o modal de detalheses estiver aberto
        if (els.orderDetailsModal && els.orderDetailsModal.classList.contains('active')) {
          const orderId = els.orderDetailsModal.dataset.orderId;
          if (orderId) openOrderDetails(orderId);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status dos pedidos:', error);
    }
  }

  // Iniciar polling para verificar status dos pedidos
  function startOrdersPolling() {
    // Verificar a cada 5 segundos
    setInterval(checkOrdersStatus, 5000);
  }

  // Sincronizar entre abas usando storage events
  function setupStorageSync() {
    window.addEventListener('storage', (e) => {
      if (e.key === ORDERS_KEY) {
        console.log('📦 Pedidos atualizados em outra aba');
        try {
          const newOrders = JSON.parse(e.newValue || '[]');
          
          // Atualizar customerData com os novos pedidos
          if (customerData) {
            customerData.orders = newOrders;
          }
          
          // Re-renderizar se o modal estiver aberto
          if (els.ordersModal && els.ordersModal.classList.contains('active')) {
            renderOrders();
          }
          
          updateOrdersCount();
        } catch (error) {
          console.error('Erro ao parsear pedidos do storage:', error);
        }
      }
    });
  }

  init();

  // Carregar média de avaliações após 1 segundo
  setTimeout(loadStoreRating, 1000);
  
  // Iniciar sincronização entre abas
  setupStorageSync();
  
  // Variável global para controlar se o polling já foi iniciado
  window.pollingStarted = false;
  
  // Iniciar polling se o cliente já estiver logado com pedidos
  setTimeout(() => {
    if (customerData && customerData.orders && customerData.orders.length > 0 && !window.pollingStarted) {
      startOrdersPolling();
      window.pollingStarted = true;
    }
  }, 2000);
})();
