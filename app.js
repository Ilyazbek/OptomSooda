'use strict';

const API = 'api';

/* 
Супаев.И 241-337 Вариант 17
 */

/* ============================================================
   УТИЛИТЫ
   ============================================================ */
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API}/${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Ошибка API');
    return json.data;
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
    throw e;
  }
}

function fmt(n) { return Number(n).toLocaleString('ru'); }

function statusBadge(s) {
  if (s === 'active') return '<span class="badge badge-green">В наличии</span>';
  if (s === 'low')    return '<span class="badge badge-amber">Мало</span>';
  return '<span class="badge badge-red">Нет</span>';
}

function orderStatusBadge(s) {
  const map = {
    new:        ['badge-blue',  'Новый'],
    processing: ['badge-amber', 'В работе'],
    shipped:    ['badge-blue',  'Отправлен'],
    done:       ['badge-green', 'Выполнен'],
    cancelled:  ['badge-red',   'Отменён'],
  };
  const [cls, label] = map[s] || ['badge-gray', s];
  return `<span class="badge ${cls}">${label}</span>`;
}

function pluralForm(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ия';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'ии';
  return 'ий';
}

function openModalEl(overlayId, modalId) {
  document.getElementById(overlayId).style.display = 'block';
  const m = document.getElementById(modalId);
  m.style.display = 'block';
  m.classList.add('open');
}

function closeModalEl(overlayId, modalId) {
  const m = document.getElementById(modalId);
  m.classList.remove('open');
  setTimeout(() => {
    m.style.display = 'none';
    document.getElementById(overlayId).style.display = 'none';
  }, 180);
}

function downloadCSV(filename, rows) {
  const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('Файл скачан');
}


/* ============================================================
   рут
   ============================================================ */
const pages = ['catalog','pricelists','categories','orders','clients','reports','export'];

function navigate(page) {
  if (!pages.includes(page)) page = 'catalog';
  pages.forEach(p => {
    const el = document.getElementById('page-' + p);
    el.classList.remove('active');
    el.style.display = 'none';
  });
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const activePage = document.getElementById('page-' + page);
  activePage.classList.add('active');
  activePage.style.display = 'block';
  history.replaceState(null, '', '#' + page);
  if (page === 'catalog')    catalog.load();
  if (page === 'pricelists') pricelists.load();
  if (page === 'categories') categories.load();
  if (page === 'orders')     orders.load();
  if (page === 'clients')    clientsPage.load();
  if (page === 'reports')    reports.render();
}
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
});


/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('globalToast');
  const icon  = toast.querySelector('i');
  document.getElementById('toastMsg').textContent = msg;
  icon.className   = type === 'error' ? 'ti ti-alert-circle' : 'ti ti-check';
  icon.style.color = type === 'error' ? '#e05c5c' : '#5fd4a8';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}


/* ============================================================
   CATALOG
   ============================================================ */
const catalog = {
  items: [],
  activeCat: 'all',

  async load() {
    this.items = await apiFetch('products.php');
    this.render();
  },

  render() {
    const sort = document.getElementById('catalogSort').value;
    const q    = (document.getElementById('searchInput').value || '').toLowerCase();

    let list = this.items.filter(p => {
      const catOk = this.activeCat === 'all' || p.category_name === this.activeCat;
      const qOk   = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return catOk && qOk;
    });

    list.sort((a, b) => {
      if (sort === 'stock') return b.stock - a.stock;
      if (sort === 'price') return a.price_1 - b.price_1;
      return a.name.localeCompare(b.name, 'ru');
    });

    const tbody = document.getElementById('catalogBody');
    const empty = document.getElementById('catalogEmpty');

    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      tbody.innerHTML = list.map(p => `
        <tr>
          <td><span class="product-name" title="${p.name}">${p.name}</span></td>
          <td><span class="badge badge-gray">${p.category_name || '—'}</span></td>
          <td><span class="sku-code">${p.sku}</span></td>
          <td><span style="font-weight:500">${fmt(p.stock)}</span> <span style="font-size:11px;color:var(--col-text-muted)">${p.unit}</span></td>
          <td>
            <div class="price-tiers">
              <div class="price-tier"><span class="price-qty">от 1 шт.</span><span class="price-val">${fmt(p.price_1)} ₽</span></div>
              <div class="price-tier"><span class="price-qty">от 10 шт.</span><span class="price-val">${fmt(p.price_10)} ₽</span></div>
              <div class="price-tier"><span class="price-qty">от 100 шт.</span><span class="price-val">${fmt(p.price_100)} ₽</span></div>
            </div>
          </td>
          <td>${statusBadge(p.status)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost" onclick="catalog.openModal(${p.id})"><i class="ti ti-pencil"></i></button>
              <button class="btn btn-danger" onclick="catalog.delete(${p.id},'${p.name.replace(/'/g,"\\'")}')"><i class="ti ti-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    document.getElementById('statTotal').textContent    = this.items.length;
    document.getElementById('statInStock').textContent  = this.items.filter(p => p.status === 'active').length;
    document.getElementById('statLow').textContent      = this.items.filter(p => p.status === 'low').length;
    document.getElementById('statOut').textContent      = this.items.filter(p => p.status === 'out').length;
    document.getElementById('catalogCount').textContent = `${list.length} позиц${pluralForm(list.length)}`;
  },

  filter() { this.render(); },

  setFilter(el, cat) {
    document.querySelectorAll('#catalogChips .chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this.activeCat = cat;
    this.render();
  },

  editingId: null,

  async openModal(id = null) {
    this.editingId = id;
    document.getElementById('catalogModalTitle').textContent = id ? 'Редактировать товар' : 'Новый товар';

    const cats = await apiFetch('categories.php');
    const sel  = document.getElementById('fCat');
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (id) {
      const p = this.items.find(x => x.id == id);
      document.getElementById('fName').value  = p.name;
      sel.value                               = p.category_id;
      document.getElementById('fSku').value   = p.sku;
      document.getElementById('fStock').value = p.stock;
      document.getElementById('fUnit').value  = p.unit;
      document.getElementById('fP1').value    = p.price_1;
      document.getElementById('fP10').value   = p.price_10;
      document.getElementById('fP100').value  = p.price_100;
    } else {
      ['fName','fSku','fStock','fP1','fP10','fP100'].forEach(i => document.getElementById(i).value = '');
    }

    openModalEl('catalogModalOverlay', 'catalogModal');
    document.getElementById('fName').focus();
  },

  closeModal() { closeModalEl('catalogModalOverlay', 'catalogModal'); },

  async save() {
    const name = document.getElementById('fName').value.trim();
    if (!name) { document.getElementById('fName').focus(); return; }

    const body = {
      name,
      category_id: document.getElementById('fCat').value,
      sku:         document.getElementById('fSku').value.trim(),
      stock:       document.getElementById('fStock').value,
      unit:        document.getElementById('fUnit').value,
      price_1:     document.getElementById('fP1').value,
      price_10:    document.getElementById('fP10').value,
      price_100:   document.getElementById('fP100').value,
    };

    if (this.editingId) {
      await apiFetch(`products.php?id=${this.editingId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Товар обновлён');
    } else {
      await apiFetch('products.php', { method: 'POST', body: JSON.stringify(body) });
      showToast('Товар добавлен');
    }
    this.closeModal();
    this.load();
  },

  async delete(id, name) {
    if (!confirm(`Удалить «${name}»?`)) return;
    await apiFetch(`products.php?id=${id}`, { method: 'DELETE' });
    showToast('Товар удалён');
    this.load();
  },

  exportCSV() {
    const rows = [['Наименование','Категория','SKU','Остаток','Единица','Цена 1шт','Цена 10шт','Цена 100шт','Статус']];
    this.items.forEach(p => rows.push([p.name, p.category_name, p.sku, p.stock, p.unit, p.price_1, p.price_10, p.price_100, p.status]));
    downloadCSV('catalog.csv', rows);
  },
};


/* ============================================================
   PRICELISTS
   ============================================================ */
const pricelists = {
  async load() {
    document.getElementById('plDate').textContent = new Date().toLocaleDateString('ru');
    const [products, cats] = await Promise.all([apiFetch('products.php'), apiFetch('categories.php')]);

    document.getElementById('plTables').innerHTML = cats.map(cat => {
      const items = products.filter(p => p.category_id == cat.id);
      if (!items.length) return '';
      return `
        <div class="pl-category">
          <div class="table-card">
            <div class="card-header"><span class="card-title">${cat.name}</span><span style="font-size:12px;color:var(--col-text-muted)">${items.length} позиций</span></div>
            <table class="data-table">
              <thead><tr><th>Наименование</th><th>SKU</th><th>Ед.</th><th>от 1 шт.</th><th>от 10 шт.</th><th>от 100 шт.</th><th>Статус</th></tr></thead>
              <tbody>${items.map(p => `
                <tr>
                  <td style="font-weight:500">${p.name}</td>
                  <td><span class="sku-code">${p.sku}</span></td>
                  <td>${p.unit}</td>
                  <td><span class="price-val">${fmt(p.price_1)} ₽</span></td>
                  <td><span class="price-val">${fmt(p.price_10)} ₽</span></td>
                  <td><span class="price-val">${fmt(p.price_100)} ₽</span></td>
                  <td>${statusBadge(p.status)}</td>
                </tr>
              `).join('')}</tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');
  },

  exportCSV() { catalog.exportCSV(); },
};


/* ============================================================
   Эт че за хуйня? исправь
   ============================================================ */
const categories = {
  items: [],

  async load() {
    this.items = await apiFetch('categories.php');
    this.render();
  },

  render() {
    const colors  = ['#eef4fd','#e4f5ee','#fef3e2','#fdf0f0','#f3f0ff','#fff8e1'];
    const tcolors = ['#1c4a8a','#1d6f52','#92540a','#8f2b2b','#5b21b6','#b45309'];
    document.getElementById('catGrid').innerHTML = this.items.map((c, i) => {
      const ci = i % colors.length;
      return `
        <div class="cat-card">
          <div class="cat-card-icon" style="background:${colors[ci]};color:${tcolors[ci]}"><i class="ti ${c.icon || 'ti-box'}"></i></div>
          <div class="cat-card-body">
            <div class="cat-card-name">${c.name}</div>
            <div class="cat-card-desc">${c.description || ''}</div>
            <div class="cat-card-count">${c.product_count} товаров</div>
          </div>
          <div class="cat-actions">
            <button class="btn btn-danger" onclick="categories.delete(${c.id},'${c.name.replace(/'/g,"\\'")}')"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  },

  openModal() {
    ['catName','catDesc'].forEach(i => document.getElementById(i).value = '');
    openModalEl('catModalOverlay', 'catModal');
    document.getElementById('catName').focus();
  },

  closeModal() { closeModalEl('catModalOverlay', 'catModal'); },

  async save() {
    const name = document.getElementById('catName').value.trim();
    if (!name) { document.getElementById('catName').focus(); return; }
    await apiFetch('categories.php', {
      method: 'POST',
      body: JSON.stringify({ name, description: document.getElementById('catDesc').value, icon: document.getElementById('catIcon').value }),
    });
    showToast('Категория добавлена');
    this.closeModal();
    this.load();
  },

  async delete(id, name) {
    if (!confirm(`Удалить категорию «${name}»?`)) return;
    await apiFetch(`categories.php?id=${id}`, { method: 'DELETE' });
    showToast('Категория удалена');
    this.load();
  },
};


/* ============================================================
   ORDERS
   ============================================================ */
const orders = {
  items: [],
  activeStatus: 'all',

  async load() {
    this.items = await apiFetch('orders.php');
    this.render();
  },

  render() {
    const q = (document.getElementById('ordersSearch').value || '').toLowerCase();
    let list = this.items.filter(o => {
      const stOk = this.activeStatus === 'all' || o.status === this.activeStatus;
      const qOk  = !q || o.order_number.toLowerCase().includes(q) || (o.client_name || '').toLowerCase().includes(q);
      return stOk && qOk;
    });

    const tbody = document.getElementById('ordersBody');
    const empty = document.getElementById('ordersEmpty');

    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      tbody.innerHTML = list.map(o => `
        <tr>
          <td><span class="order-id">${o.order_number}</span></td>
          <td>${o.client_name || '—'}</td>
          <td><span class="order-items-preview">${(o.items_preview || '').substring(0,60)}${(o.items_preview||'').length>60?'…':''}</span></td>
          <td><span class="order-sum">${fmt(o.total)} ₽</span></td>
          <td><span class="order-date">${new Date(o.created_at).toLocaleDateString('ru')}</span></td>
          <td>${orderStatusBadge(o.status)}</td>
          <td>
            <div class="row-actions">
              <select class="sort-select" style="height:28px" onchange="orders.updateStatus(${o.id}, this.value)">
                <option value="new"        ${o.status==='new'?'selected':''}>Новый</option>
                <option value="processing" ${o.status==='processing'?'selected':''}>В работе</option>
                <option value="shipped"    ${o.status==='shipped'?'selected':''}>Отправлен</option>
                <option value="done"       ${o.status==='done'?'selected':''}>Выполнен</option>
                <option value="cancelled"  ${o.status==='cancelled'?'selected':''}>Отменён</option>
              </select>
            </div>
          </td>
        </tr>
      `).join('');
    }

    const revenue = this.items.filter(o => o.status === 'done').reduce((s, o) => s + Number(o.total), 0);
    document.getElementById('ordStatTotal').textContent   = this.items.length;
    document.getElementById('ordStatActive').textContent  = this.items.filter(o => o.status === 'processing').length;
    document.getElementById('ordStatShipped').textContent = this.items.filter(o => o.status === 'shipped').length;
    document.getElementById('ordStatRevenue').textContent = fmt(revenue);
    document.getElementById('ordersCount').textContent    = `${list.length} заказ${pluralForm(list.length)}`;
  },

  filter() { this.render(); },

  setFilter(el, status) {
    document.querySelectorAll('#page-orders .chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this.activeStatus = status;
    this.render();
  },

  async updateStatus(id, status) {
    await apiFetch(`orders.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    showToast('Статус обновлён');
    this.load();
  },

  orderItems: [],

  async openModal() {
    this.orderItems = [{ product_id: '', qty: 1, price: 0 }];
    const clients = await apiFetch('clients.php');
    document.getElementById('oClient').innerHTML = clients.map(c => `<option value="${c.id}">${c.company_name}</option>`).join('');
    const today = new Date(); today.setDate(today.getDate() + 3);
    document.getElementById('oDate').value = today.toISOString().split('T')[0];
    await this.renderOrderItems();
    openModalEl('orderModalOverlay', 'orderModal');
  },

  closeModal() { closeModalEl('orderModalOverlay', 'orderModal'); },

  async renderOrderItems() {
    const products = await apiFetch('products.php');
    const opts = products.map(p => `<option value="${p.id}" data-price="${p.price_1}">${p.name} (${p.unit})</option>`).join('');
    document.getElementById('orderItems').innerHTML = this.orderItems.map((item, i) => `
      <div class="order-item-row">
        <select class="form-input" onchange="orders.setProduct(${i}, this)">
          <option value="">— выберите товар —</option>${opts}
        </select>
        <input class="form-input" type="number" min="1" value="${item.qty}" placeholder="Кол-во" oninput="orders.setQty(${i}, this.value)" />
        <input class="form-input" type="number" min="0" value="${item.price}" placeholder="Цена" oninput="orders.setPrice(${i}, this.value)" />
        <button class="btn btn-danger" onclick="orders.removeItem(${i})"><i class="ti ti-x"></i></button>
      </div>
    `).join('');
    this.updateTotal();
  },

  setProduct(i, sel) {
    const opt = sel.options[sel.selectedIndex];
    this.orderItems[i].product_id = sel.value;
    this.orderItems[i].price      = parseFloat(opt.dataset.price) || 0;
    this.renderOrderItems();
  },

  setQty(i, v)   { this.orderItems[i].qty   = parseInt(v)   || 1; this.updateTotal(); },
  setPrice(i, v) { this.orderItems[i].price = parseFloat(v) || 0; this.updateTotal(); },

  addItem() { this.orderItems.push({ product_id: '', qty: 1, price: 0 }); this.renderOrderItems(); },
  removeItem(i) { this.orderItems.splice(i, 1); this.renderOrderItems(); },

  updateTotal() {
    const total = this.orderItems.reduce((s, i) => s + i.qty * i.price, 0);
    document.getElementById('orderTotal').textContent = fmt(total) + ' ₽';
  },

  async save() {
    const clientId = document.getElementById('oClient').value;
    if (!clientId) { showToast('Выберите клиента', 'error'); return; }
    const items = this.orderItems.filter(i => i.product_id).map(i => ({ product_id: i.product_id, quantity: i.qty, price: i.price }));
    if (!items.length) { showToast('Добавьте хотя бы один товар', 'error'); return; }
    await apiFetch('orders.php', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, delivery_date: document.getElementById('oDate').value, items }),
    });
    showToast('Заказ создан');
    this.closeModal();
    this.load();
  },

  exportCSV() {
    const rows = [['№ заказа','Клиент','Сумма','Дата','Статус']];
    this.items.forEach(o => rows.push([o.order_number, o.client_name, o.total, o.created_at, o.status]));
    downloadCSV('orders.csv', rows);
  },
};


/* ============================================================
   Таблица не совпадает с БД
   ============================================================ */
const clientsPage = {
  items: [],

  async load() {
    this.items = await apiFetch('clients.php');
    this.render();
  },

  render() {
    const q    = (document.getElementById('clientsSearch').value || '').toLowerCase();
    const list = this.items.filter(c => !q || c.company_name.toLowerCase().includes(q) || (c.contact_name || '').toLowerCase().includes(q));
    const colors  = ['#eef4fd','#e4f5ee','#fef3e2','#fdf0f0','#f3f0ff'];
    const tcolors = ['#1c4a8a','#1d6f52','#92540a','#8f2b2b','#5b21b6'];
    const grid  = document.getElementById('clientsGrid');
    const empty = document.getElementById('clientsEmpty');

    if (list.length === 0) {
      grid.innerHTML = ''; empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      grid.innerHTML = list.map((c, i) => {
        const ci = i % colors.length;
        return `
          <div class="client-card">
            <div class="client-avatar" style="background:${colors[ci]};color:${tcolors[ci]}">${(c.company_name||'?').substring(0,2).toUpperCase()}</div>
            <div><div class="client-name">${c.company_name}</div><div class="client-meta">${c.contact_name||''}</div></div>
            <div class="client-field"><small>Телефон</small>${c.phone||'—'}</div>
            <div class="client-field"><small>Email</small>${c.email||'—'}</div>
            <div class="client-field"><small>Тип / ИНН</small><span class="badge badge-gray">${c.type}</span>${c.inn?`<span style="font-size:11px;color:var(--col-text-muted);margin-left:6px">${c.inn}</span>`:''}</div>
            <div class="client-actions">
              <button class="btn btn-ghost" onclick="clientsPage.openModal(${c.id})"><i class="ti ti-pencil"></i></button>
              <button class="btn btn-danger" onclick="clientsPage.delete(${c.id},'${c.company_name.replace(/'/g,"\\'")}')"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        `;
      }).join('');
    }
    document.getElementById('clientsCount').textContent = `${list.length} клиент${pluralForm(list.length)}`;
  },

  filter() { this.render(); },
  editingId: null,

  openModal(id = null) {
    this.editingId = id;
    if (id) {
      const c = this.items.find(x => x.id == id);
      document.getElementById('cName').value    = c.company_name;
      document.getElementById('cContact').value = c.contact_name || '';
      document.getElementById('cPhone').value   = c.phone || '';
      document.getElementById('cEmail').value   = c.email || '';
      document.getElementById('cType').value    = c.type;
      document.getElementById('cInn').value     = c.inn || '';
      document.querySelector('#clientModal .modal-title').textContent = 'Редактировать клиента';
    } else {
      ['cName','cContact','cPhone','cEmail','cInn'].forEach(i => document.getElementById(i).value = '');
      document.querySelector('#clientModal .modal-title').textContent = 'Новый клиент';
    }
    openModalEl('clientModalOverlay', 'clientModal');
    document.getElementById('cName').focus();
  },

  closeModal() { closeModalEl('clientModalOverlay', 'clientModal'); },

  async save() {
    const name = document.getElementById('cName').value.trim();
    if (!name) { document.getElementById('cName').focus(); return; }
    const body = {
      company_name: name,
      contact_name: document.getElementById('cContact').value,
      phone:        document.getElementById('cPhone').value,
      email:        document.getElementById('cEmail').value,
      type:         document.getElementById('cType').value,
      inn:          document.getElementById('cInn').value,
    };
    if (this.editingId) {
      await apiFetch(`clients.php?id=${this.editingId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Клиент обновлён');
    } else {
      await apiFetch('clients.php', { method: 'POST', body: JSON.stringify(body) });
      showToast('Клиент добавлен');
    }
    this.closeModal();
    this.load();
  },

  async delete(id, name) {
    if (!confirm(`Удалить клиента «${name}»?`)) return;
    await apiFetch(`clients.php?id=${id}`, { method: 'DELETE' });
    showToast('Клиент удалён');
    this.load();
  },

  exportCSV() {
    const rows = [['Компания','Контакт','Телефон','Email','Тип','ИНН']];
    this.items.forEach(c => rows.push([c.company_name, c.contact_name, c.phone, c.email, c.type, c.inn]));
    downloadCSV('clients.csv', rows);
  },
};


/* ============================================================
   REPORTS
   ============================================================ */
const reports = {
  async render() {
    const data = await apiFetch('reports.php');
    const s    = data.stats;

    document.getElementById('reportsStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon stat-icon--blue"><i class="ti ti-clipboard-list"></i></div><div class="stat-body"><div class="stat-value">${fmt(s.total_orders)}</div><div class="stat-label">Всего заказов</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon--green"><i class="ti ti-currency-ruble"></i></div><div class="stat-body"><div class="stat-value">${fmt(s.total_revenue)}</div><div class="stat-label">Выручка (₽)</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon--blue"><i class="ti ti-users"></i></div><div class="stat-body"><div class="stat-value">${fmt(s.total_clients)}</div><div class="stat-label">Клиентов</div></div></div>
      <div class="stat-card"><div class="stat-icon stat-icon--amber"><i class="ti ti-alert-triangle"></i></div><div class="stat-body"><div class="stat-value">${fmt(s.low_stock)}</div><div class="stat-label">Мало/нет на складе</div></div></div>
    `;

    document.getElementById('repCatBody').innerHTML = data.categories.map(c => `
      <tr>
        <td>${c.name}</td><td>${c.orders_count}</td>
        <td style="font-weight:500">${fmt(c.revenue)} ₽</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="donut-bar-wrap"><div class="donut-bar" style="width:${c.percent}%"></div></div><span style="font-size:12px;color:var(--col-text-muted)">${c.percent}%</span></div></td>
      </tr>
    `).join('');

    document.getElementById('repTopBody').innerHTML = data.top_products.map((p, i) => `
      <tr><td><span style="color:var(--col-text-muted);margin-right:8px">${i+1}</span>${p.name}</td><td>${fmt(p.sold)} шт.</td><td style="font-weight:500">${fmt(p.revenue)} ₽</td></tr>
    `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--col-text-muted);padding:20px">Нет данных</td></tr>';

    if (data.monthly.length) {
      const max = Math.max(...data.monthly.map(m => m.revenue));
      document.getElementById('revenueChart').innerHTML = `
        <div class="bar-chart">
          ${data.monthly.map(m => {
            const h = max > 0 ? Math.round((m.revenue / max) * 140) : 4;
            return `<div class="bar-col"><div class="bar-fill" style="height:${h}px" data-val="${fmt(m.revenue)} ₽"></div><div class="bar-label">${m.label}</div></div>`;
          }).join('')}
        </div>`;
    } else {
      document.getElementById('revenueChart').innerHTML = '<div style="padding:40px;text-align:center;color:var(--col-text-muted)">Нет данных за период</div>';
    }

    document.getElementById('repClientsBody').innerHTML = data.top_clients.map((c, i) => `
      <tr><td><span style="color:var(--col-text-muted);margin-right:8px">${i+1}</span>${c.company_name}</td><td>${c.orders_count}</td><td style="font-weight:500">${fmt(c.total_sum)} ₽</td><td style="color:var(--col-text-muted)">${c.last_order ? new Date(c.last_order).toLocaleDateString('ru') : '—'}</td></tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--col-text-muted);padding:20px">Нет данных</td></tr>';
  },
};


/* ============================================================
   KEYBOARD
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    [['catalogModalOverlay','catalogModal'],['orderModalOverlay','orderModal'],['clientModalOverlay','clientModal'],['catModalOverlay','catModal']]
      .forEach(([o,m]) => { if (document.getElementById(o).style.display === 'block') closeModalEl(o,m); });
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const inp = document.getElementById('searchInput');
    if (inp) inp.focus();
  }
});


/* ============================================================
   INIT
   ============================================================ */
navigate(location.hash.replace('#','') || 'catalog');
