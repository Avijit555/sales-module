// order.js
// Keeps all behavior: dependent dropdowns, calculations, CRUD, filters, CSV/PDF export, now using backend API

const API_URL = "http://127.0.0.1:5000/orders";

// --- DOM refs ---
const orderIdEl = document.getElementById('orderId');
const orderDateEl = document.getElementById('orderDate');
const customerTypeEl = document.getElementById('customerType');
const brokerWrap = document.getElementById('brokerNameWrap');
const brokerNameEl = document.getElementById('brokerName');
const customerNameEl = document.getElementById('customerName');

const riceVariantEl = document.getElementById('riceVariant');
const basmatiBlock = document.getElementById('basmatiBlock');
const basmatiProductEl = document.getElementById('basmatiProduct');
const basmatiCategoryWrap = document.getElementById('basmatiCategoryWrap');
const basmatiCategoryEl = document.getElementById('basmatiCategory');

const nonBasmatiBlock = document.getElementById('nonBasmatiBlock');
const nonBasmatiProductEl = document.getElementById('nonBasmatiProduct');
const nonBasmatiRiceTypeWrap = document.getElementById('nonBasmatiRiceTypeWrap');
const nonBasmatiRiceTypeEl = document.getElementById('nonBasmatiRiceType');
const nonBasmatiRiceNameWrap = document.getElementById('nonBasmatiRiceNameWrap');
const nonBasmatiRiceNameEl = document.getElementById('nonBasmatiRiceName');

const packagingWrap = document.getElementById('packagingWrap');
const packagingTypeEl = document.getElementById('packagingType');

const quantityEl = document.getElementById('quantity');
const rateEl = document.getElementById('rate');
const costEl = document.getElementById('cost');
const discountEl = document.getElementById('discountType');
const amountEl = document.getElementById('amount');

const statusEl = document.getElementById('status');
const cancelReasonWrap = document.getElementById('cancelReasonWrap');
const cancelReasonEl = document.getElementById('cancelReason');

const orderForm = document.getElementById('order-form');
const ordersTableBody = document.querySelector('#ordersTable tbody');
const totalCountEl = document.getElementById('totalCount');

const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const filterCustomer = document.getElementById('filterCustomer');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');

const exportCsvBtn = document.getElementById('exportCsv');
const exportPdfBtn = document.getElementById('exportPdf');
const resetBtn = document.getElementById('resetBtn');

// --- state ---
let orders = [];
let editingIndex = null;

// --- helper functions ---
function genOrderId() {
  const t = Date.now().toString();
  return 'ORD-' + t.slice(-8) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
}
function setDefaults() {
  orderIdEl.value = genOrderId();
  orderDateEl.value = new Date().toISOString().slice(0, 10);
  quantityEl.value = '0';
  rateEl.value = '0';
  costEl.value = '';
  amountEl.value = '';
}
setDefaults();

const nonBasmatiData = {
  hemraj: { types: ['Parboiled', 'Raw', 'Puffed'], names: { 'Parboiled': ['Sita', 'Miniket', 'Basnkati', 'IR-1010', 'Ratna'], 'Raw': ['Sita', 'Miniket', 'Basnkati', 'IR-1010', 'Ratna'], 'Puffed': ['Sita', 'Miniket', 'Basnkati', 'IR-1010', 'Ratna'] } },
  shrivriddhi: { types: ['Parboiled', 'Raw'], names: { 'Parboiled': ['Sita', 'Miniket', 'Basnkati', 'IR-1010', 'Ratna'], 'Raw': ['Sita', 'Miniket', 'Basnkati', 'IR-1010', 'Ratna'] } }
};

// --- UI behaviors ---
customerTypeEl.addEventListener('change', () => {
  brokerWrap.style.display = customerTypeEl.value === 'broker' ? 'block' : 'none';
});

riceVariantEl.addEventListener('change', () => {
  if (riceVariantEl.value === 'basmati') {
    basmatiBlock.style.display = 'block';
    basmatiCategoryWrap.style.display = basmatiProductEl.value ? 'block' : 'none';
    nonBasmatiBlock.style.display = 'none';
    nonBasmatiRiceTypeWrap.style.display = 'none';
    nonBasmatiRiceNameWrap.style.display = 'none';
    packagingWrap.style.display = 'none';
  } else {
    basmatiBlock.style.display = 'none';
    basmatiCategoryWrap.style.display = 'none';
    nonBasmatiBlock.style.display = 'block';
    packagingWrap.style.display = 'block';
  }
});

basmatiProductEl.addEventListener('change', () => {
  basmatiCategoryWrap.style.display = basmatiProductEl.value ? 'block' : 'none';
});

nonBasmatiProductEl.addEventListener('change', () => {
  const v = nonBasmatiProductEl.value;
  if (!v) {
    nonBasmatiRiceTypeWrap.style.display = 'none';
    nonBasmatiRiceNameWrap.style.display = 'none';
    return;
  }
  nonBasmatiRiceTypeWrap.style.display = 'block';
  nonBasmatiRiceNameWrap.style.display = 'none';
  nonBasmatiRiceTypeEl.innerHTML = '<option value="">Select</option>' + nonBasmatiData[v].types.map(t => `<option value="${t}">${t}</option>`).join('');
});

nonBasmatiRiceTypeEl.addEventListener('change', () => {
  const prod = nonBasmatiProductEl.value;
  const t = nonBasmatiRiceTypeEl.value;
  if (!t) { nonBasmatiRiceNameWrap.style.display = 'none'; return; }
  const names = nonBasmatiData[prod].names[t] || [];
  nonBasmatiRiceNameEl.innerHTML = '<option value="">Select</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
  nonBasmatiRiceNameWrap.style.display = 'block';
});

// calculations
function recalc() {
  const q = parseFloat(quantityEl.value) || 0;
  const r = parseFloat(rateEl.value) || 0;
  const cost = q * r;
  costEl.value = cost ? Number(cost.toFixed(2)) : '';
  const disc = parseFloat(discountEl.value) || 0;
  const amount = cost * (1 - disc);
  amountEl.value = amount ? Number(amount.toFixed(2)) : '';
}
quantityEl.addEventListener('input', recalc);
rateEl.addEventListener('input', recalc);
discountEl.addEventListener('change', recalc);

statusEl.addEventListener('change', () => {
  if (statusEl.value === 'cancel') {
    cancelReasonWrap.style.display = 'block';
    cancelReasonEl.required = true; // ✅ required if cancelled
  } else {
    cancelReasonWrap.style.display = 'none';
    cancelReasonEl.required = false;
    cancelReasonEl.value = '';
  }
});

// --- backend interaction ---
async function loadOrders() {
  const res = await fetch(API_URL);
  orders = await res.json();
  refreshTable();
}

async function saveOrder(data) {
  if (editingIndex === null) {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } else {
    const id = orders[editingIndex].id;
    await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    editingIndex = null;
  }
  await loadOrders();
}

async function deleteOrder(idx) {
  const id = orders[idx].id;
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  await loadOrders();
}

// --- helpers ---
function variantDescriptionFromForm() {
  const v = riceVariantEl.value;
  if (v === 'basmati') {
    let desc = 'Basmati';
    if (basmatiProductEl.value) desc += ' / ' + basmatiProductEl.options[basmatiProductEl.selectedIndex].text;
    if (basmatiCategoryEl.value) desc += ' / ' + basmatiCategoryEl.value;
    return desc;
  } else {
    let desc = 'Non-Basmati';
    if (nonBasmatiProductEl.value) desc += ' / ' + nonBasmatiProductEl.options[nonBasmatiProductEl.selectedIndex].text;
    if (nonBasmatiRiceTypeEl.value) desc += ' / ' + nonBasmatiRiceTypeEl.value;
    if (nonBasmatiRiceNameEl.value) desc += ' / ' + nonBasmatiRiceNameEl.value;
    return desc;
  }
}

function getFormData() {
  return {
    orderId: orderIdEl.value,
    date: orderDateEl.value,
    customerType: customerTypeEl.value,
    brokerName: brokerNameEl.value || '',
    customerName: customerNameEl.value,
    riceVariant: riceVariantEl.value,
    variantDesc: variantDescriptionFromForm(),
    quantity: parseFloat(quantityEl.value) || 0,
    packagingType: packagingWrap.style.display === 'block' ? packagingTypeEl.value : '',
    rate: parseFloat(rateEl.value) || 0,
    cost: parseFloat(costEl.value) || 0,
    discount: parseFloat(discountEl.value) || 0,
    amount: parseFloat(amountEl.value) || 0,
    status: statusEl.value,
    cancelReason: cancelReasonEl.value || ''
  };
}

// check if any cancel reason exists
function hasCancelReasons(list) {
  return list.some(o => o.cancelReason && o.cancelReason.trim() !== '');
}

function renderTable(list) {
  ordersTableBody.innerHTML = '';
  const showCancel = hasCancelReasons(list);

  // dynamic header
  const headerRow = document.querySelector('#ordersTable thead tr');
  headerRow.innerHTML = `
    <th>Order ID</th>
    <th>Date</th>
    <th>Customer</th>
    <th>Variant</th>
    <th>Quantity</th>
    <th>Rate</th>
    <th>Amount</th>
    <th>Status</th>
    ${showCancel ? '<th>Cancel Reason</th>' : ''}
    <th>Actions</th>
  `;

  list.forEach((o, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${o.orderId}</td>
      <td>${o.date}</td>
      <td>${o.customerName}${o.customerType === 'broker' ? ' (B: ' + (o.brokerName || '') + ')' : ''}</td>
      <td>${o.variantDesc}</td>
      <td>${o.quantity}</td>
      <td>${o.rate}</td>
      <td>${o.amount}</td>
      <td><span class="pill status-${o.status}">${o.status}</span></td>
      ${showCancel ? `<td>${o.cancelReason || ''}</td>` : ''}
      <td>
        <button class="btn btn-ghost" data-action="edit" data-idx="${idx}">Edit</button>
        <button class="btn btn-danger" data-action="delete" data-idx="${idx}">Delete</button>
      </td>
    `;
    ordersTableBody.appendChild(tr);
  });
  totalCountEl.textContent = list.length;
}

function refreshTable() {
  const filtered = applyCurrentFilters(orders);
  renderTable(filtered);
}

// initial render
(async function initFromBackend() {
  await loadOrders();
})();

// --- form submit / reset ---
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = getFormData();
  if (!data.customerName) { alert('Customer name required'); return; }
  if (data.quantity <= 0) { alert('Quantity must be greater than zero'); return; }
  if (data.rate <= 0) { alert('Rate must be greater than zero'); return; }
  if (data.status === 'cancel' && !data.cancelReason) { alert('Cancel reason required'); return; } // ✅ enforced

  await saveOrder(data);

  orderForm.reset();
  setDefaults();
  basmatiBlock.style.display = 'none';
  basmatiCategoryWrap.style.display = 'none';
  nonBasmatiBlock.style.display = 'none';
  nonBasmatiRiceTypeWrap.style.display = 'none';
  nonBasmatiRiceNameWrap.style.display = 'none';
  packagingWrap.style.display = 'none';
  brokerWrap.style.display = 'none';
  cancelReasonWrap.style.display = 'none';
});

// reset button
resetBtn.addEventListener('click', () => {
  editingIndex = null;
  orderForm.reset();
  setDefaults();
  basmatiBlock.style.display = 'none';
  basmatiCategoryWrap.style.display = 'none';
  nonBasmatiBlock.style.display = 'none';
  nonBasmatiRiceTypeWrap.style.display = 'none';
  nonBasmatiRiceNameWrap.style.display = 'none';
  packagingWrap.style.display = 'none';
  brokerWrap.style.display = 'none';
  cancelReasonWrap.style.display = 'none';
});

// table action delegation - edit/delete
ordersTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const idx = parseInt(btn.dataset.idx, 10);
  if (action === 'delete') {
    if (confirm('Delete this order?')) { await deleteOrder(idx); }
  } else if (action === 'edit') {
    const o = orders[idx];
    editingIndex = idx;
    orderIdEl.value = o.orderId;
    orderDateEl.value = o.date;
    customerTypeEl.value = o.customerType; customerTypeEl.dispatchEvent(new Event('change'));
    brokerNameEl.value = o.brokerName || '';
    customerNameEl.value = o.customerName;
    riceVariantEl.value = o.riceVariant; riceVariantEl.dispatchEvent(new Event('change'));

    if (o.riceVariant === 'basmati') {
      const prod = (o.variantDesc.split('/')[1] || '').trim();
      Array.from(basmatiProductEl.options).forEach(opt => {
        if (opt.text === prod) basmatiProductEl.value = opt.value;
      });
      basmatiProductEl.dispatchEvent(new Event('change'));
      basmatiCategoryEl.value = (o.variantDesc.split('/')[2] || '').trim() || basmatiCategoryEl.value;
    } else {
      const prod = (o.variantDesc.split('/')[1] || '').trim();
      Array.from(nonBasmatiProductEl.options).forEach(opt => {
        if (opt.text === prod) nonBasmatiProductEl.value = opt.value;
      });
      nonBasmatiProductEl.dispatchEvent(new Event('change'));
      nonBasmatiRiceTypeEl.value = (o.variantDesc.split('/')[2] || '').trim() || '';
      nonBasmatiRiceTypeEl.dispatchEvent(new Event('change'));
      nonBasmatiRiceNameEl.value = (o.variantDesc.split('/')[3] || '').trim() || '';
    }

    quantityEl.value = o.quantity;
    rateEl.value = o.rate;
    recalc();
    if (o.packagingType) packagingTypeEl.value = o.packagingType;
    discountEl.value = o.discount;
    statusEl.value = o.status; statusEl.dispatchEvent(new Event('change'));
    cancelReasonEl.value = o.cancelReason || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// --- filters ---
function applyCurrentFilters(list) {
  const from = filterFrom.value;
  const to = filterTo.value;
  const cust = (filterCustomer.value || '').trim().toLowerCase();
  return list.filter(o => {
    if (from && o.date < from) return false;
    if (to && o.date > to) return false;
    if (cust && !(o.customerName || '').toLowerCase().includes(cust)) return false;
    return true;
  });
}
applyFiltersBtn.addEventListener('click', () => refreshTable());
clearFiltersBtn.addEventListener('click', () => {
  filterFrom.value = ''; filterTo.value = ''; filterCustomer.value = '';
  refreshTable();
});

// --- export CSV & PDF ---
function exportCsv(list) {
  if (!list || !list.length) { alert('No rows to export'); return; }

  const showCancel = hasCancelReasons(list);

  const headers = ['Order ID', 'Date', 'Customer', 'Variant', 'Quantity', 'Rate', 'Amount', 'Status'];
  if (showCancel) headers.push('Cancel Reason');

  const rows = list.map(r => {
    const row = [
      r.orderId,
      r.date,
      r.customerName + (r.customerType === 'broker' ? ' (B:' + r.brokerName + ')' : ''),
      r.variantDesc,
      r.quantity,
      r.rate,
      r.amount,
      r.status
    ];
    if (showCancel) row.push(r.cancelReason || '');
    return row;
  });

  let csv = headers.join(',') + '\n' + rows.map(r => r.map(c => `"${('' + (c ?? '')).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
exportCsvBtn.addEventListener('click', () => exportCsv(applyCurrentFilters(orders)));

function exportPdf(list) {
  if (!list || !list.length) { alert('No rows to export'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const showCancel = hasCancelReasons(list);

  const headers = ['Order ID', 'Date', 'Customer', 'Variant', 'Qty', 'Rate', 'Amount', 'Status'];
  if (showCancel) headers.push('Cancel Reason');

  const body = list.map(r => {
    const row = [
      r.orderId,
      r.date,
      r.customerName + (r.customerType === 'broker' ? ' (B:' + r.brokerName + ')' : ''),
      r.variantDesc,
      r.quantity,
      r.rate,
      r.amount,
      r.status
    ];
    if (showCancel) row.push(r.cancelReason || '');
    return row;
  });

  doc.autoTable({ head: [headers], body });
  doc.save(`orders_${new Date().toISOString().slice(0, 10)}.pdf`);
}
exportPdfBtn.addEventListener('click', () => exportPdf(applyCurrentFilters(orders)));