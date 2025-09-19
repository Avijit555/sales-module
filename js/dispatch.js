// dispatch.js
const API_URL = "http://127.0.0.1:5000/dispatches";   // Flask API endpoint

// --- DOM refs ---
const dispatchIdEl = document.getElementById('dispatchID');
const dispatchDateEl = document.getElementById('dispatchDate');
const dispatchLocationEl = document.getElementById('dispatchLocation');

const customerTypeEl = document.getElementById('customerType');
const brokerWrap = document.getElementById('brokerNameWrap');
const brokerNameEl = document.getElementById('brokerName');
const customerNameEl = document.getElementById('customerName');

const riceVariantEl = document.getElementById('riceVariant');
const basmatiBlock = document.getElementById('basmatiBlock');
const basmatiProductEl = document.getElementById('basmatiProduct');

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

const advanceEl = document.getElementById('advance');
const dueEl = document.getElementById('due');
const dueDateEl = document.getElementById('dueDate');

const challanPhotoEl = document.getElementById('challanPhoto');
const carPhotoEl = document.getElementById('carPhoto');

const dispatchForm = document.getElementById('Dispatch');
const dispatchTableBody = document.querySelector('#dispatchTable tbody');
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
let dispatches = [];
let editingId = null;

// --- helper functions ---
function genDispatchId() {
    const t = Date.now().toString();
    return 'DISP-' + t.slice(-8) + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
}

function setDefaults(){
    dispatchIdEl.value = genDispatchId();
    dispatchDateEl.value = new Date().toISOString().slice(0,10);
    dueDateEl.value = '';
    quantityEl.value = '0';
    rateEl.value = '0';
    costEl.value = '';
    amountEl.value = '';
    advanceEl.value = '';
    dueEl.value = '';
}
setDefaults();

// --- Non-Basmati Data ---
const nonBasmatiData = {
    hemraj: { types: ['Parboiled','Raw','Puffed'], names: { 'Parboiled':['Sita','Miniket'], 'Raw':['Sita','Miniket'], 'Puffed':['Sita','Miniket'] } },
    shrivriddhi: { types: ['Parboiled','Raw'], names: { 'Parboiled':['Sita','Miniket'], 'Raw':['Sita','Miniket'] } }
};

// --- UI behaviors ---
customerTypeEl.addEventListener('change', ()=>{
    brokerWrap.style.display = customerTypeEl.value === 'broker' ? 'block' : 'none';
});

riceVariantEl.addEventListener('change', ()=>{
    if(riceVariantEl.value === 'basmati'){ 
        basmatiBlock.style.display = 'block';
        nonBasmatiBlock.style.display = 'none';
        nonBasmatiRiceTypeWrap.style.display = 'none';
        nonBasmatiRiceNameWrap.style.display = 'none';
        packagingWrap.style.display = 'none';
    } else {
        basmatiBlock.style.display = 'none';
        nonBasmatiBlock.style.display = 'block';
        packagingWrap.style.display = 'block';
    }
});

nonBasmatiProductEl.addEventListener('change', ()=>{
    const v = nonBasmatiProductEl.value;
    if(!v){
        nonBasmatiRiceTypeWrap.style.display = 'none';
        nonBasmatiRiceNameWrap.style.display = 'none';
        return;
    }
    nonBasmatiRiceTypeWrap.style.display = 'block';
    nonBasmatiRiceNameWrap.style.display = 'none';
    nonBasmatiRiceTypeEl.innerHTML = '<option value="">Select</option>' + nonBasmatiData[v].types.map(t=>`<option value="${t}">${t}</option>`).join('');
});

nonBasmatiRiceTypeEl.addEventListener('change', ()=>{
    const prod = nonBasmatiProductEl.value;
    const t = nonBasmatiRiceTypeEl.value;
    if(!t){ nonBasmatiRiceNameWrap.style.display = 'none'; return; }
    const names = nonBasmatiData[prod].names[t] || [];
    nonBasmatiRiceNameEl.innerHTML = '<option value="">Select</option>' + names.map(n=>`<option value="${n}">${n}</option>`).join('');
    nonBasmatiRiceNameWrap.style.display = 'block';
});

// calculations
function recalc(){
    const q = parseFloat(quantityEl.value) || 0;
    const r = parseFloat(rateEl.value) || 0;
    const cost = q * r;
    costEl.value = cost ? Number(cost.toFixed(2)) : '';
    const disc = parseFloat(discountEl.value) || 0;
    const amount = cost * (1 - disc);
    amountEl.value = amount ? Number(amount.toFixed(2)) : '';
    const adv = parseFloat(advanceEl.value) || 0;
    dueEl.value = amount - adv;
}
quantityEl.addEventListener('input', recalc);
rateEl.addEventListener('input', recalc);
discountEl.addEventListener('change', recalc);
advanceEl.addEventListener('input', recalc);

// --- API functions ---
async function fetchDispatches(){
    const res = await fetch(API_URL);
    dispatches = await res.json();
    refreshTable();
}

async function addDispatch(data){
    await fetch(API_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    await fetchDispatches();
}

async function updateDispatch(id, data){
    await fetch(`${API_URL}/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    await fetchDispatches();
}

async function deleteDispatch(id){
    await fetch(`${API_URL}/${id}`, {method:'DELETE'});
    await fetchDispatches();
}

// --- storage & rendering ---
function variantDescriptionFromForm(){
    const v = riceVariantEl.value;
    if(v === 'basmati'){
        let desc = 'Basmati';
        if(basmatiProductEl.value) desc += ' / ' + basmatiProductEl.options[basmatiProductEl.selectedIndex].text;
        return desc;
    } else {
        let desc = 'Non-Basmati';
        if(nonBasmatiProductEl.value) desc += ' / ' + nonBasmatiProductEl.options[nonBasmatiProductEl.selectedIndex].text;
        if(nonBasmatiRiceTypeEl.value) desc += ' / ' + nonBasmatiRiceTypeEl.value;
        if(nonBasmatiRiceNameEl.value) desc += ' / ' + nonBasmatiRiceNameEl.value;
        return desc;
    }
}

// convert file to base64
function fileToBase64(file){
    return new Promise((resolve)=>{
        if(!file){ resolve(''); return; }
        const reader = new FileReader();
        reader.onload = ()=> resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

async function getFormData(){
    return {
        dispatchId: dispatchIdEl.value,
        date: dispatchDateEl.value,
        dueDate: dueDateEl.value || '', 
        location: dispatchLocationEl.value,
        customerType: customerTypeEl.value,
        brokerName: brokerNameEl.value || '',
        customerName: customerNameEl.value,
        riceVariant: riceVariantEl.value,
        riceProduct: basmatiProductEl.value || nonBasmatiProductEl.value,
        riceType: nonBasmatiRiceTypeEl.value || '',
        riceName: nonBasmatiRiceNameEl.value || '',
        packagingType: packagingWrap.style.display==='block' ? packagingTypeEl.value : '',
        quantity: parseFloat(quantityEl.value) || 0,
        rate: parseFloat(rateEl.value) || 0,
        cost: parseFloat(costEl.value) || 0,
        discount: parseFloat(discountEl.value) || 0,
        amount: parseFloat(amountEl.value) || 0,
        advance: parseFloat(advanceEl.value) || 0,
        due: parseFloat(dueEl.value) || 0,
        loadingLocation: document.getElementById('loadingLocation').value || '',
        loadingMan: document.getElementById('loadingMan').value || '',
        challan: document.getElementById('challan').value || '',
        challanPhoto: await fileToBase64(challanPhotoEl.files[0]),
        carNo: document.getElementById('carNo').value || '',
        carPhoto: await fileToBase64(carPhotoEl.files[0]),
        netWeight: document.getElementById('netWeight').value || '',
        driverContact: document.getElementById('driverContact').value || '',
        variantDesc: variantDescriptionFromForm()
    };
}

function renderTable(list){
    dispatchTableBody.innerHTML = '';
    list.forEach((d, idx)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.dispatchId}</td>
            <td>${d.date}</td>
            <td>${d.location}</td>
            <td>${d.customerType}</td>
            <td>${d.brokerName}</td>
            <td>${d.customerName}</td>
            <td>${d.riceVariant}</td>
            <td>${d.riceProduct}</td>
            <td>${d.riceType}</td>
            <td>${d.riceName}</td>
            <td>${d.packagingType || ''}</td>
            <td>${d.loadingLocation || ''}</td>
            <td>${d.loadingMan || ''}</td>
            <td>${d.challan || ''}</td>
            <td>${d.challanPhoto ? '<img src="'+d.challanPhoto+'" width="40" class="previewable" />' : ''}</td>
            <td>${d.carNo || ''}</td>
            <td>${d.carPhoto ? '<img src="'+d.carPhoto+'" width="40" class="previewable" />' : ''}</td>
            <td>${d.quantity}</td>
            <td>${d.rate}</td>
            <td>${d.cost}</td>
            <td>${d.discount}</td>
            <td>${d.amount}</td>
            <td>${d.advance}</td>
            <td>${d.due}</td>
            <td>${d.dueDate || ''}</td>
            <td>${d.netWeight || ''}</td>
            <td>${d.driverContact || ''}</td>
            <td>
                <button class="btn btn-ghost" data-action="edit" data-id="${d.id}">Edit</button>
                <button class="btn btn-danger" data-action="delete" data-id="${d.id}">Delete</button>
            </td>
        `;
        dispatchTableBody.appendChild(tr);
    });
    totalCountEl.textContent = list.length;
}

function refreshTable(){
    const filtered = applyCurrentFilters(dispatches);
    renderTable(filtered);
}

// --- form submit / reset ---
dispatchForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const data = await getFormData();

    if(!data.customerName){ alert('Customer name required'); return; }
    if(data.quantity <= 0){ alert('Quantity must be > 0'); return; }
    if(data.rate <= 0){ alert('Rate must be > 0'); return; }

    if(editingId === null){
        await addDispatch(data);
    } else {
        await updateDispatch(editingId, data);
        editingId = null;
    }

    await fetchDispatches();
    dispatchForm.reset();
    setDefaults();
    basmatiBlock.style.display='none';
    nonBasmatiBlock.style.display='none';
    nonBasmatiRiceTypeWrap.style.display='none';
    nonBasmatiRiceNameWrap.style.display='none';
    packagingWrap.style.display='none';
    brokerWrap.style.display='none';
});

// Reset button
resetBtn.addEventListener('click', ()=>{
    editingId = null;
    dispatchForm.reset();
    setDefaults();
    basmatiBlock.style.display='none';
    nonBasmatiBlock.style.display='none';
    nonBasmatiRiceTypeWrap.style.display='none';
    nonBasmatiRiceNameWrap.style.display='none';
    packagingWrap.style.display='none';
    brokerWrap.style.display='none';
});

// --- table actions ---
dispatchTableBody.addEventListener('click', async e=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if(action==='delete'){
        if(confirm('Delete this dispatch?')){
            await deleteDispatch(id);
        }
    } else if(action==='edit'){
        editingId = id;
        const d = dispatches.find(x=>x.id===id);

        dispatchIdEl.value = d.dispatchId;
        dispatchDateEl.value = d.date;
        dueDateEl.value = d.dueDate || '';
        dispatchLocationEl.value = d.location;
        customerTypeEl.value = d.customerType; customerTypeEl.dispatchEvent(new Event('change'));
        brokerNameEl.value = d.brokerName;
        customerNameEl.value = d.customerName;
        riceVariantEl.value = d.riceVariant; riceVariantEl.dispatchEvent(new Event('change'));

        if(d.riceVariant==='basmati'){
            basmatiProductEl.value = d.riceProduct;
        } else {
            nonBasmatiProductEl.value = d.riceProduct;
            nonBasmatiProductEl.dispatchEvent(new Event('change'));
            nonBasmatiRiceTypeEl.value = d.riceType;
            nonBasmatiRiceTypeEl.dispatchEvent(new Event('change'));
            nonBasmatiRiceNameEl.value = d.riceName;
        }

        quantityEl.value = d.quantity;
        rateEl.value = d.rate;
        recalc();
        if(d.packagingType) packagingTypeEl.value = d.packagingType;
    }
});

// --- filters ---
function applyCurrentFilters(list){
    const from = filterFrom.value;
    const to = filterTo.value;
    const cust = (filterCustomer.value||'').trim().toLowerCase();
    return list.filter(d=>{
        if(from && d.date<from) return false;
        if(to && d.date>to) return false;
        if(cust && !(d.customerName||'').toLowerCase().includes(cust)) return false;
        return true;
    });
}
applyFiltersBtn.addEventListener('click', ()=>refreshTable());
clearFiltersBtn.addEventListener('click', ()=>{
    filterFrom.value=''; filterTo.value=''; filterCustomer.value='';
    refreshTable();
});

// --- export CSV ---
function exportCsv(list){
    if(!list || !list.length){ alert('No rows to export'); return; }
    const headers = [
        'Dispatch ID','Date','Location','Customer Type','Broker','Customer',
        'Rice Variant','Rice Product','Rice Type','Rice Name','Packaging Type',
        'Loading Location','Loading Man','Challan','Car No',
        'Qty','Rate','Cost','Discount','Amount','Advance','Due','Due Date'
    ];
    const rows = list.map(d=>[
        d.dispatchId,d.date,d.location,d.customerType,d.brokerName,d.customerName,
        d.riceVariant,d.riceProduct,d.riceType,d.riceName,d.packagingType,
        d.loadingLocation,d.loadingMan,d.challan,d.carNo,
        d.quantity,d.rate,d.cost,d.discount,d.amount,d.advance,d.due,d.dueDate
    ]);
    let csv = headers.join(',')+'\n'+rows.map(r=>r.map(c=>`"${(''+(c||'')).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'}); 
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`dispatch_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
exportCsvBtn.addEventListener('click', ()=>exportCsv(applyCurrentFilters(dispatches)));

// --- export PDF ---
exportPdfBtn.addEventListener('click', ()=>{
    const data = applyCurrentFilters(dispatches);
    if(!data.length){ alert('No rows to export'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({orientation:'landscape'});
    const tableData = data.map(d=>[
        d.dispatchId,d.date,d.location,d.customerType,d.brokerName,d.customerName,
        d.riceVariant,d.riceProduct,d.riceType,d.riceName,d.packagingType,
        d.loadingLocation,d.loadingMan,d.challan,d.carNo,
        d.quantity,d.rate,d.cost,d.discount,d.amount,d.advance,d.due,d.dueDate
    ]);
    doc.setFontSize(14);
    doc.text('Dispatch Records',14,16);
    doc.autoTable({
        head:[['Dispatch ID','Date','Location','Customer Type','Broker','Customer',
               'Rice Variant','Rice Product','Rice Type','Rice Name','Packaging Type',
               'Loading Location','Loading Man','Challan','Car No',
               'Qty','Rate','Cost','Discount','Amount','Advance','Due','Due Date']],
        body: tableData,
        startY:22,
        theme:'grid',
        headStyles:{fillColor:[0,57,107]},
        styles:{fontSize:7}
    });
    doc.save(`dispatch_${new Date().toISOString().slice(0,10)}.pdf`);
});

// --- photo preview modal ---
document.addEventListener('click', e=>{
    const img = e.target.closest('.previewable');
    if(!img) return;

    let modal = document.getElementById('photoPreviewModal');
    if(!modal){
        modal = document.createElement('div');
        modal.id = 'photoPreviewModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.innerHTML = '<img style="max-width:90%;max-height:90%;border:5px solid white;border-radius:8px;">';
        modal.addEventListener('click', ()=>modal.style.display='none');
        document.body.appendChild(modal);
    }
    modal.querySelector('img').src = img.src;
    modal.style.display = 'flex';
});

// --- init ---
fetchDispatches();