'use strict';

/* ============================================================
   DATA
   ============================================================ */
let products = [
  { name: 'Кабель HDMI 2м',              cat: 'Электроника',       sku: 'EL-001', stock: 450, unit: 'шт.', p1: 850,  p10: 720,  p100: 590,  status: 'active' },
  { name: 'Зарядное устройство USB-C 65W', cat: 'Электроника',       sku: 'EL-002', stock: 88,  unit: 'шт.', p1: 1200, p10: 1050, p100: 890,  status: 'active' },
  { name: 'Наушники проводные',            cat: 'Электроника',       sku: 'EL-003', stock: 0,   unit: 'шт.', p1: 650,  p10: 540,  p100: 420,  status: 'out'    },
  { name: 'Средство для мытья посуды 5л',  cat: 'Бытовая химия',     sku: 'BC-001', stock: 320, unit: 'уп.', p1: 480,  p10: 420,  p100: 370,  status: 'active' },
  { name: 'Стиральный порошок 10кг',       cat: 'Бытовая химия',     sku: 'BC-002', stock: 12,  unit: 'уп.', p1: 1100, p10: 950,  p100: 820,  status: 'low'    },
  { name: 'Сахар рафинированный 50кг',     cat: 'Продукты питания',  sku: 'FD-001', stock: 200, unit: 'кг',  p1: 95,   p10: 88,   p100: 80,   status: 'active' },
  { name: 'Масло подсолнечное 5л',         cat: 'Продукты питания',  sku: 'FD-002', stock: 156, unit: 'шт.', p1: 420,  p10: 390,  p100: 350,  status: 'active' },
  { name: 'Дрель-шуруповёрт 18В',          cat: 'Инструменты',       sku: 'TL-001', stock: 34,  unit: 'шт.', p1: 3800, p10: 3400, p100: 2900, status: 'active' },
];

let activeCat   = 'all';
let searchQuery = '';

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  const sort = document.getElementById('sortSelect').value;

  let filtered = products.filter(p => {
    const catOk = activeCat === 'all' || p.cat === activeCat;
    const q     = searchQuery.toLowerCase();
    const qOk   = q === '' || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return catOk && qOk;
  });

  filtered.sort((a, b) => {
    if (sort === 'name')  return a.name.localeCompare(b.name, 'ru');
    if (sort === 'stock') return b.stock - a.stock;
    if (sort === 'price') return a.p1 - b.p1;
    return 0;
  });

  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map((p, i) => `
      <tr data-idx="${products.indexOf(p)}">
        <td><span class="product-name" title="${p.name}">${p.name}</span></td>
        <td><span class="badge badge-gray">${p.cat}</span></td>
        <td><span class="sku-code">${p.sku}</span></td>
        <td><span class="stock-val">${p.stock.toLocaleString('ru')}</span> <span style="font-size:11px;color:var(--col-text-muted)">${p.unit}</span></td>
        <td>
          <div class="price-tiers">
            <div class="price-tier">
              <span class="price-qty">от 1 шт.</span>
              <span class="price-val">${p.p1.toLocaleString('ru')} ₽</span>
            </div>
            <div class="price-tier">
              <span class="price-qty">от 10 шт.</span>
              <span class="price-val">${p.p10.toLocaleString('ru')} ₽</span>
            </div>
            <div class="price-tier">
              <span class="price-qty">от 100 шт.</span>
              <span class="price-val">${p.p100.toLocaleString('ru')} ₽</span>
            </div>
          </div>
        </td>
        <td>${statusBadge(p.status)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost" title="Редактировать" onclick="editProduct(${products.indexOf(p)})">
              <i class="ti ti-pencil"></i>
            </button>
            <button class="btn btn-danger" title="Удалить" onclick="deleteProduct(${products.indexOf(p)})">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Stats
  document.getElementById('statTotal').textContent   = products.length;
  document.getElementById('statInStock').textContent = products.filter(p => p.status === 'active').length;
  document.getElementById('statLow').textContent     = products.filter(p => p.status === 'low').length;
  document.getElementById('statOut').textContent     = products.filter(p => p.status === 'out').length;
  document.getElementById('itemCount').textContent   = `${filtered.length} позиц${pluralForm(filtered.length)}`;
}

function statusBadge(s) {
  if (s === 'active') return '<span class="badge badge-green">В наличии</span>';
  if (s === 'low')    return '<span class="badge badge-amber">Мало</span>';
  return '<span class="badge badge-red">Нет</span>';
}

function pluralForm(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ия';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'ии';
  return 'ий';
}

/* ============================================================
   FILTERS
   ============================================================ */
function setFilter(el, cat) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeCat = cat;
  render();
}

function filterProducts() {
  searchQuery = document.getElementById('searchInput').value;
  render();
}

/* ============================================================
   MODAL
   ============================================================ */
let editingIdx = null;

function openModal(idx = null) {
  editingIdx = idx;
  const modal   = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');

  if (idx !== null) {
    const p = products[idx];
    document.getElementById('fName').value  = p.name;
    document.getElementById('fCat').value   = p.cat;
    document.getElementById('fSku').value   = p.sku;
    document.getElementById('fStock').value = p.stock;
    document.getElementById('fUnit').value  = p.unit;
    document.getElementById('fP1').value    = p.p1;
    document.getElementById('fP10').value   = p.p10;
    document.getElementById('fP100').value  = p.p100;
    document.querySelector('.modal-title').textContent = 'Редактировать товар';
  } else {
    document.querySelector('.modal-title').textContent = 'Новый товар';
    ['fName','fSku','fStock','fP1','fP10','fP100'].forEach(id => document.getElementById(id).value = '');
  }

  overlay.style.display = 'block';
  modal.classList.add('open');
  modal.style.display = 'block';
  document.getElementById('fName').focus();
}

function closeModal() {
  const modal   = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; overlay.style.display = 'none'; }, 180);
  editingIdx = null;
}

function addProduct() {
  const name = document.getElementById('fName').value.trim();
  if (!name) {
    document.getElementById('fName').focus();
    return;
  }

  const stock = parseInt(document.getElementById('fStock').value) || 0;
  const p = {
    name,
    cat:    document.getElementById('fCat').value,
    sku:    document.getElementById('fSku').value.trim() || '—',
    stock,
    unit:   document.getElementById('fUnit').value,
    p1:     parseInt(document.getElementById('fP1').value)   || 0,
    p10:    parseInt(document.getElementById('fP10').value)  || 0,
    p100:   parseInt(document.getElementById('fP100').value) || 0,
    status: stock === 0 ? 'out' : stock < 20 ? 'low' : 'active',
  };

  if (editingIdx !== null) {
    products[editingIdx] = p;
    showToast('Товар обновлён');
  } else {
    products.unshift(p);
    showToast('Товар добавлен');
  }

  closeModal();
  render();
}

/* ============================================================
   EDIT / DELETE
   ============================================================ */
function editProduct(idx) {
  openModal(idx);
}

function deleteProduct(idx) {
  if (!confirm(`Удалить «${products[idx].name}»?`)) return;
  products.splice(idx, 1);
  showToast('Товар удалён');
  render();
}

/* ============================================================
   EXPORT CSV
   ============================================================ */
function exportCSV() {
  const header = ['Наименование','Категория','SKU','Остаток','Единица','Цена 1шт','Цена 10шт','Цена 100шт','Статус'];
  const rows   = products.map(p => [
    `"${p.name}"`, p.cat, p.sku, p.stock, p.unit, p.p1, p.p10, p.p100, p.status
  ]);
  const csv = [header, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'opttorg-catalog.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Файл скачан');
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;

function showToast(msg) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    toast.innerHTML = '<i class="ti ti-check"></i><span id="toastMsg"></span>';
    document.body.appendChild(toast);
  }
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ============================================================
   KEYBOARD
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

/* ============================================================
   INIT
   ============================================================ */
render();
