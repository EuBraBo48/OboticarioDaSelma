// ============================================================
// Configurações Gerais da Loja
// ============================================================
// Configuração JSONBin
const JSONBIN_ID = '6a524527f5f4af5e2980e48d';
const JSONBIN_KEY = '$2a$10$m1Tbl0nrbhgOXHiczPRE/.YUZb.yHqqkS0Cz9P0DUxt4xQBeZpmVu';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;

const STORE = {
  name: 'Boticário da Selma',
  brand: 'O Boticário',
  whatsapp: '5581983439253'
};



let PRODUCTS = [
  {
    id: 1,
    name: 'Malbec Original Desodorante Colônia',
    brand: 'O Boticário',
    category: 'perfumes',
    description: 'Um clássico da perfumaria masculina nacional, feito de notas frescas e amadeiradas à base de álcool vínico.',
    volume: '100ml',
    price: 199.90,
    promotion_price: 159.90,
    stock: 12,
    is_new: false,
    is_bestseller: true,
    image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'Lily Essence Eau de Parfum',
    brand: 'O Boticário',
    category: 'perfumes',
    description: 'Fragrância floral super sofisticada, que traz a pureza dos lírios para o dia a dia.',
    volume: '75ml',
    price: 359.90,
    promotion_price: null,
    stock: 8,
    is_new: true,
    is_bestseller: true,
    image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop',
  }
];

let CATEGORIES = [
  { id: 'perfumes', name: 'Perfumes' },
  { id: 'hidratantes', name: 'Hidratantes' },
  { id: 'kits', name: 'Kits' }
];

// Helpers de Seleção e Formatação
const formatBRL = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const effectivePrice = (p) => (p.promotion_price && p.promotion_price > 0 ? p.promotion_price : p.price);
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

let cart = []; 
let currentFilter = 'all';
let currentCategory = 'all';
let searchQuery = '';
let adminSearchQuery = '';
let uploadedImageBase64 = null;

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

// ============================================================
// PERSISTÊNCIA VIA JSONBIN (NUVEM) - NOVO!
// ============================================================
async function loadData() {
  try {
    const res = await fetch(JSONBIN_URL, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    if (!res.ok) throw new Error('Erro ao carregar dados da nuvem');
    const data = await res.json();
    PRODUCTS = data.record.products;
    CATEGORIES = data.record.categories;
    // Atualiza também o cache local
    localStorage.setItem('boticario_products', JSON.stringify(PRODUCTS));
    localStorage.setItem('boticario_categories', JSON.stringify(CATEGORIES));
  } catch (err) {
    console.warn('Offline ou erro na API, usando cache local:', err);
    const savedProducts = localStorage.getItem('boticario_products');
    const savedCategories = localStorage.getItem('boticario_categories');
    if (savedProducts) PRODUCTS = JSON.parse(savedProducts);
    if (savedCategories) CATEGORIES = JSON.parse(savedCategories);
  }
}

async function saveData() {
  const body = { products: PRODUCTS, categories: CATEGORIES };
  try {
    await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY
      },
      body: JSON.stringify(body)
    });
    // Atualiza cache local
    localStorage.setItem('boticario_products', JSON.stringify(PRODUCTS));
    localStorage.setItem('boticario_categories', JSON.stringify(CATEGORIES));
  } catch (err) {
    console.error('Erro ao salvar online:', err);
    // Mesmo offline, salva localmente para não perder
    localStorage.setItem('boticario_products', JSON.stringify(PRODUCTS));
    localStorage.setItem('boticario_categories', JSON.stringify(CATEGORIES));
    alert('Sem conexão no momento. Os dados foram salvos localmente e serão sincronizados quando houver internet.');
  }
}

// ============================================================
// Renderização Pública (Catálogo)
// ============================================================
function renderProducts() {
  const grid = $('#products');
  if (!grid) return;
  const empty = $('#empty');
  const q = searchQuery.trim().toLowerCase();

  const filteredList = PRODUCTS.filter((p) => {
    if (currentFilter === 'promo' && !(p.promotion_price && p.promotion_price > 0)) return false;
    if (currentFilter === 'new' && !p.is_new) return false;
    if (currentFilter === 'bestseller' && !p.is_bestseller) return false;
    if (currentCategory !== 'all' && p.category !== currentCategory) return false;
    if (q && !`${p.name} ${p.brand}`.toLowerCase().includes(q)) return false;
    return true;
  });

  empty.hidden = filteredList.length !== 0;
  grid.innerHTML = filteredList.map(cardHTML).join('');

  grid.querySelectorAll('[data-add]').forEach((btn) => {
    btn.onclick = () => addToCart(Number(btn.dataset.add));
  });
}

function cardHTML(p) {
  const soldOut = p.stock <= 0;
  const onPromo = !!(p.promotion_price && p.promotion_price > 0);
  const price = effectivePrice(p);
  const discount = onPromo ? Math.round((1 - p.promotion_price / p.price) * 100) : 0;

  const badges = [
    onPromo ? `<span class="badge promo">-${discount}%</span>` : '',
    p.is_new ? `<span class="badge new">Novo</span>` : '',
    p.is_bestseller ? `<span class="badge top">↑ Top</span>` : '',
  ].join('');

  const media = p.image_url
    ? `<img src="${p.image_url}" alt="${escapeHTML(p.name)}" loading="lazy" />`
    : `<div style="display:grid; place-items:center; height:100%; background:var(--accent); color:var(--primary-2); font-size:24px;">✦</div>`;

  return `
    <article class="card">
      <div class="card-media">
        ${media}
        <div class="badges">${badges}</div>
        ${soldOut ? `<div class="sold-out"><span>Esgotado</span></div>` : ''}
      </div>
      <div class="card-body">
        <div>
          <div class="card-brand">${escapeHTML(p.brand)}</div>
          <h3 class="card-title">${escapeHTML(p.name)}</h3>
          <p class="card-desc">${escapeHTML(p.description || '')}</p>
          ${p.volume ? `<div class="card-volume">${escapeHTML(p.volume)}</div>` : ''}
        </div>
        <div class="card-price">
          ${onPromo ? `<span class="old">${formatBRL(p.price)}</span>` : ''}
          <span class="now">${formatBRL(price)}</span>
        </div>
        <button class="btn btn-primary" data-add="${p.id}" ${soldOut ? 'disabled style="opacity:.5;"' : ''}>
          🛍 ${soldOut ? 'Indisponível' : 'Adicionar'}
        </button>
      </div>
    </article>
  `;
}

// ============================================================
// FUNÇÃO DE RENDERIZAÇÃO DAS CATEGORIAS (Atualizada)
// ============================================================
function renderCategoryBars() {
  const catBar = $('.category-bar');
  if (catBar) {
    catBar.innerHTML = `<button data-cat="all" class="cat-link ${currentCategory === 'all' ? 'active' : ''}">✦ Todos</button>` + 
      CATEGORIES.map(c => `<button data-cat="${c.id}" class="cat-link ${currentCategory === c.id ? 'active' : ''}">✦ ${c.name}</button>`).join('');
  
    $$('.category-bar .cat-link').forEach(btn => {
      btn.onclick = () => {
        $$('.category-bar .cat-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        renderProducts();
      };
    });
  }

  const selectCat = $('#prod-categoria');
  if (selectCat) {
    selectCat.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}

// ============================================================
// Painel Administrativo Interno
// ============================================================
function updateAdminDashboard() {
  $('#stat-produtos').textContent = PRODUCTS.length;
  $('#stat-estoque').textContent = PRODUCTS.reduce((sum, p) => sum + Number(p.stock), 0);
  $('#stat-promo').textContent = PRODUCTS.filter(p => p.promotion_price && p.promotion_price > 0).length;
  
  const totalValue = PRODUCTS.reduce((sum, p) => sum + (effectivePrice(p) * p.stock), 0);
  $('#stat-valor').textContent = formatBRL(totalValue);

  const containerList = $('#admin-products-list-mobile');
  if (!containerList) return;
  
  const q = adminSearchQuery.trim().toLowerCase();
  const filtered = PRODUCTS.filter(p => !q || p.name.toLowerCase().includes(q));

  containerList.innerHTML = filtered.map(p => `
    <div class="admin-item-mobile">
      <img src="${p.image_url || 'https://via.placeholder.com/50'}" />
      <div class="admin-item-details">
        <h4>${escapeHTML(p.name)}</h4>
        <p>Preço: <strong>${formatBRL(effectivePrice(p))}</strong> | Qtd: ${p.stock}</p>
      </div>
      <div class="admin-item-actions">
        <button class="btn-action-sm btn-edit" onclick="openEditForm(${p.id})">Editar</button>
        <button class="btn-action-sm btn-clone" onclick="cloneProduct(${p.id})">Clonar</button>
        <button class="btn-action-sm btn-del" onclick="deleteProduct(${p.id})">Excluir</button>
      </div>
    </div>
  `).join('');
}

function switchAdminTab(tabName) {
  if (tabName === 'dashboard') {
    $('#admin-tab-dashboard').style.display = 'block';
    $('#admin-tab-adicionar').style.display = 'none';
    $('#tab-dash-btn').classList.add('active');
    $('#tab-add-btn').classList.remove('active');
    
    $('#header-catalogo').style.display = 'block';
    $('#form-admin-title').textContent = "Adicionar novo produto";
  } else {
    $('#admin-tab-dashboard').style.display = 'none';
    $('#admin-tab-adicionar').style.display = 'block';
    $('#tab-add-btn').classList.add('active');
    $('#tab-dash-btn').classList.remove('active');
  }
}

function openEditForm(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;

  $('#header-catalogo').style.display = 'none';

  switchAdminTab('adicionar');
  $('#form-admin-title').textContent = "✏️ Editando Produto";
  
  $('#prod-id').value = p.id;
  $('#prod-nome').value = p.name;
  $('#prod-descricao').value = p.description || '';
  $('#prod-categoria').value = p.category || 'perfumes';
  $('#prod-vol').value = p.volume || '';
  $('#prod-preco').value = p.price;
  $('#prod-promo').value = p.promotion_price || '';
  $('#prod-estoque').value = p.stock;
  $('#prod-new').checked = !!p.is_new;
  $('#prod-top').checked = !!p.is_bestseller;
  
  uploadedImageBase64 = p.image_url;
}

// Modificada para salvar automaticamente
async function cloneProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  
  const newId = PRODUCTS.length > 0 ? Math.max(...PRODUCTS.map(x => x.id)) + 1 : 1;
  const cloned = {
    ...p,
    id: newId,
    name: `${p.name} (Cópia)`
  };
  
  PRODUCTS.push(cloned);
  await saveData();  // <-- SALVA NA NUVEM
  toast("Produto clonado!");
  updateAdminDashboard();
  renderProducts();
}

// Modificada para salvar automaticamente
async function deleteProduct(id) {
  if (confirm("Deseja remover este produto?")) {
    PRODUCTS = PRODUCTS.filter(p => p.id !== id);
    cart = cart.filter(item => item.id !== id);
    saveCart();
    await saveData();  // <-- SALVA NA NUVEM
    renderProducts();
    updateAdminDashboard();
    toast("Removido com sucesso!");
  }
}

// Modificado para salvar automaticamente
$('#form-produto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const idValue = $('#prod-id').value;
  
  const data = {
    name: $('#prod-nome').value,
    description: $('#prod-descricao').value,
    brand: STORE.brand,
    category: $('#prod-categoria').value,
    image_url: uploadedImageBase64,
    volume: $('#prod-vol').value || null,
    price: parseFloat($('#prod-preco').value),
    promotion_price: $('#prod-promo').value ? parseFloat($('#prod-promo').value) : null,
    stock: parseInt($('#prod-estoque').value, 10),
    is_new: $('#prod-new').checked,
    is_bestseller: $('#prod-top').checked
  };

  if (idValue) {
    const idx = PRODUCTS.findIndex(p => p.id === Number(idValue));
    if (idx !== -1) {
      PRODUCTS[idx] = { ...PRODUCTS[idx], ...data };
      toast("Atualizado!");
    }
  } else {
    const newId = PRODUCTS.length > 0 ? Math.max(...PRODUCTS.map(p => p.id)) + 1 : 1;
    PRODUCTS.push({ id: newId, ...data });
    toast("Cadastrado!");
  }

  await saveData();  // <-- SALVA NA NUVEM

  $('#form-produto').reset();
  uploadedImageBase64 = null;
  switchAdminTab('dashboard');
  renderProducts();
  updateAdminDashboard();
});

$('#btn-cancelar-form').onclick = () => {
  $('#form-produto').reset();
  uploadedImageBase64 = null;
  switchAdminTab('dashboard');
};

// Navegação Geral de Telas
function switchView(viewName) {
  $('#view-catalogo').style.display = viewName === 'catalogo' ? 'block' : 'none';
  $('#view-login').style.display = viewName === 'login' ? 'block' : 'none';
  $('#view-admin').style.display = viewName === 'admin' ? 'block' : 'none';
  
  $('#header-catalogo').style.display = viewName === 'catalogo' ? 'block' : 'none';
  
  if (viewName === 'admin') {
    switchAdminTab('dashboard');
    updateAdminDashboard();
  }
}

$('#btn-entrar').addEventListener('click', () => {
  const email = $('#login-email').value.trim();
  const senha = $('#login-senha').value;
  if (email === "yank23145@gmail.com" && senha === "jjoyce.1981") {
    switchView('admin');
  } else {
    alert("Credenciais inválidas.");
  }
});

$('#btn-go-login').onclick = () => switchView('login');
$('#btn-back-catalogo').onclick = () => switchView('catalogo');
$('#btn-ver-loja').onclick = () => switchView('catalogo');
$('#btn-sair').onclick = () => {
  // Limpa campos de login
  $('#login-email').value = '';
  $('#login-senha').value = '';
  switchView('catalogo');
};

// ============================================================
// Carrinho e Checkout
// ============================================================
function addToCart(id) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product || product.stock <= 0) return;
  const existing = cart.find((i) => i.id === id);
  if (existing) {
    if (existing.quantity >= product.stock) return;
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }
  saveCart();
  renderCart();
  toast("Adicionado ao carrinho!");
}

function updateQty(id, qty) {
  const p = PRODUCTS.find(x => x.id === id);
  if (qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  } else if (p && qty <= p.stock) {
    const item = cart.find(i => i.id === id);
    if (item) item.quantity = qty;
  }
  saveCart();
  renderCart();
}

function renderCart() {
  const container = $('#cart-items');
  const countEl = $('#cart-count');
  const footer = $('#cart-footer');
  const empty = $('#cart-empty');
  
  let total = 0;
  let count = 0;

  const html = cart.map(item => {
    const p = PRODUCTS.find(x => x.id === item.id);
    if (!p) return '';
    const price = effectivePrice(p);
    total += price * item.quantity;
    count += item.quantity;

    return `
      <div class="cart-item">
        <img src="${p.image_url || ''}" />
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHTML(p.name)}</div>
          <div class="cart-item-row">
            <div class="qty">
              <button onclick="updateQty(${p.id}, ${item.quantity - 1})">−</button>
              <span>${item.quantity}</span>
              <button onclick="updateQty(${p.id}, ${item.quantity + 1})">+</button>
            </div>
            <strong>${formatBRL(price * item.quantity)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');

  countEl.textContent = count;
  countEl.hidden = count === 0;
  empty.style.display = cart.length === 0 ? 'block' : 'none';
  footer.hidden = cart.length === 0;
  container.innerHTML = html;
  $('#cart-total').textContent = formatBRL(total);
}

function checkout() {
  const name = $('#customer-name').value.trim();
  const notes = $('#customer-notes').value.trim();
  if (!name) { alert('Informe o seu nome'); return; }

  const lines = [`*Pedido — ${STORE.name}*`, `Cliente: ${name}`];
  cart.forEach(item => {
    const p = PRODUCTS.find(x => x.id === item.id);
    if (p) lines.push(`- ${item.quantity}x ${p.name}`);
  });
  if (notes) lines.push(`Obs: ${notes}`);

  window.open(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

function openCart() { $('#cart').classList.add('open'); $('#cart-overlay').hidden = false; }
function closeCart() { $('#cart').classList.remove('open'); $('#cart-overlay').hidden = true; }

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2000);
}

// ============================================================
// Escuta de Eventos ao Iniciar (UNIFICADO)
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Carrega dados da nuvem (ou cache local) antes de tudo
  await loadData();

  // Inicializações fundamentais
  renderCategoryBars();
  renderProducts();
  renderCart();

  const waUrl = `https://wa.me/${STORE.whatsapp}`;
  $('#btn-direto-wa').href = waUrl;
  $('#footer-wa').href = waUrl;

  $('#search').oninput = (e) => { searchQuery = e.target.value; renderProducts(); };
  $('#admin-search').oninput = (e) => { adminSearchQuery = e.target.value; updateAdminDashboard(); };

  $('#open-cart').onclick = openCart;
  $('#close-cart').onclick = closeCart;
  $('#cart-overlay').onclick = closeCart;
  $('#checkout').onclick = checkout;

  $('#prod-img-file').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onload = (ev) => { uploadedImageBase64 = ev.target.result; };
      r.readAsDataURL(file);
    }
  };

  // Botão ADICIONAR Categoria (agora com saveData)
  $('#btn-add-categoria').onclick = async () => {
    const name = prompt("Digite o nome da nova categoria:");
    if (!name || name.trim() === "") return;
    
    const cleanName = name.trim();
    const id = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-");
    
    if (CATEGORIES.some(c => c.id === id)) {
      toast("Esta categoria já existe!");
      return;
    }
    
    CATEGORIES.push({ id, name: cleanName });
    await saveData();  // <-- SALVA NA NUVEM
    renderCategoryBars();
    toast(`Categoria "${cleanName}" criada!`);
  };

  // Botão REMOVER Categoria (agora com saveData)
  $('#btn-remove-categoria').onclick = async () => {
    if (CATEGORIES.length === 0) {
      alert("Não há nenhuma categoria cadastrada para remover!");
      return;
    }

    let listaTexto = CATEGORIES.map((c, index) => `${index + 1}. ${c.name}`).join("\n");
    let escolha = prompt(`Digite o número da categoria que deseja REMOVER:\n\n${listaTexto}`);
    
    if (!escolha) return;

    let indiceSelecionado = parseInt(escolha) - 1;

    if (isNaN(indiceSelecionado) || indiceSelecionado < 0 || indiceSelecionado >= CATEGORIES.length) {
      alert("Número inválido! Tente novamente.");
      return;
    }

    let categoriaParaRemover = CATEGORIES[indiceSelecionado];

    if (confirm(`Tem certeza que deseja apagar a categoria "${categoriaParaRemover.name}"?\nOs produtos dessa categoria voltarão para a categoria geral.`)) {
      PRODUCTS.forEach(p => {
        if (p.category === categoriaParaRemover.id) {
          p.category = 'perfumes';
        }
      });

      CATEGORIES.splice(indiceSelecionado, 1);

      await saveData();  // <-- SALVA NA NUVEM
      renderCategoryBars();
      renderProducts();
      if ($('#stat-produtos')) updateAdminDashboard();

      alert("Categoria removida com sucesso!");
    }
  };

  // Filtros
  $$('#filters .chip').forEach(btn => {
    btn.onclick = () => {
      $$('#filters .chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderProducts();
    };
  });
});