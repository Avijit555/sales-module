console.log('Katwa stock logic (API version)');

// Helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// DOM
const form = $('#stock-form');
const dateInput = $('#date');
const riceType = $('#riceType');
const varietyInput = $('#variety');
const kariInput = $('#kariQty');
const godownInput = $('#godownQty');
const totalInput = $('#totalQty');
const tableBody = $('#stockTable tbody');
const filterDate = $('#filterDate');
const filterVariety = $('#filterVariety');
const exportCsvBtn = $('#exportCsv');
const exportPdfBtn = $('#exportPdf');
const clearFiltersBtn = $('#clearFilters');
const tableSummary = $('#tableSummary');

const API_URL = "http://127.0.0.1:5000/katwa_stock";

// State
let entries = [];
let varieties = [];
let editingId = null;

// Initialize
fetchEntries();

// Update total when kari/godown changes
[kariInput, godownInput].forEach(el => el.addEventListener('input', updateTotal));
function updateTotal() {
    const k = parseFloat(kariInput.value || 0);
    const g = parseFloat(godownInput.value || 0);
    totalInput.value = (k + g).toFixed(2);
}

// Form submit
form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
        date: dateInput.value,
        riceType: riceType.value,
        variety: varietyInput.value,
        kari: parseFloat(kariInput.value || 0),
        godown: parseFloat(godownInput.value || 0),
        total: parseFloat(totalInput.value || 0)
    };

    try {
        if (editingId) {
            // Update existing
            await fetch(`${API_URL}/${editingId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
        } else {
            // Add new
            await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
        }
        editingId = null;
        form.reset();
        totalInput.value = 0;
        await fetchEntries();
    } catch (err) {
        alert('Error saving entry: ' + err.message);
    }
});

// Fetch from API
async function fetchEntries() {
    try {
        const res = await fetch(API_URL);
        entries = await res.json();
        varieties = [...new Set(entries.map(e => e.variety).filter(Boolean))].sort();
        renderFilters();
        renderTable();
        renderVarietyDatalist();
    } catch (err) {
        console.error(err);
        alert('Failed to load entries');
    }
}

// Variety datalist
function renderVarietyDatalist() {
    let dl = $('#varietyList');
    if (!dl) {
        dl = document.createElement('datalist');
        dl.id = 'varietyList';
        document.body.appendChild(dl);
        varietyInput.setAttribute('list', 'varietyList');
    }
    dl.innerHTML = '';
    varieties.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        dl.appendChild(opt);
    });
}

// Filters
function renderFilters() {
    filterVariety.innerHTML = '<option value="">All varieties</option>';
    varieties.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        filterVariety.appendChild(opt);
    });

    if (entries.length) {
        const latestDate = entries.reduce((max, d) => d.date > max ? d.date : max, entries[0].date);
        if (!filterDate.value) filterDate.value = latestDate;
    }
}

function getFiltered() {
    let res = [...entries];
    if (filterDate.value) res = res.filter(r => r.date === filterDate.value);
    if (filterVariety.value) res = res.filter(r => r.variety === filterVariety.value);

    if (!filterDate.value && res.length) {
        const latestDate = res.reduce((max, d) => d.date > max ? d.date : max, res[0].date);
        res = res.filter(r => r.date === latestDate);
    }

    res.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    return res;
}

// Table
function renderTable() {
    const list = getFiltered();
    tableBody.innerHTML = '';
    let total = 0;

    list.forEach((row, idx) => {
        const tr = document.createElement('tr');
        if (editingId === row.id) tr.classList.add('editing');

        tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${row.date}</td>
        <td>${escapeHtml(row.riceType)}</td>
        <td>${escapeHtml(row.variety)}</td>
        <td>${row.kari.toFixed(2)}</td>
        <td>${row.godown.toFixed(2)}</td>
        <td>${row.total.toFixed(2)}</td>
        <td>
            <button class="action-btn action-edit" data-id="${row.id}">Edit</button>
            <button class="action-btn action-delete" data-id="${row.id}">Delete</button>
        </td>`;
        tableBody.appendChild(tr);
        total += row.total;
    });

    tableSummary.textContent = `${list.length} entr${list.length===1?'y':'ies'} • Total: ${total.toFixed(2)} ton`;

    $$('.action-delete').forEach(btn => btn.addEventListener('click', onDelete));
    $$('.action-edit').forEach(btn => btn.addEventListener('click', onEdit));
}

// Delete
async function onDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Delete this entry?')) return;
    try {
        await fetch(`${API_URL}/${id}`, {method: 'DELETE'});
        await fetchEntries();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

// Edit
function onEdit(e) {
    const id = e.currentTarget.dataset.id;
    const entry = entries.find(x => x.id === id);
    if (!entry) return;
    dateInput.value = entry.date;
    riceType.value = entry.riceType;
    varietyInput.value = entry.variety;
    kariInput.value = entry.kari;
    godownInput.value = entry.godown;
    updateTotal();
    editingId = id;
    renderTable();
}

// Filter events
[filterDate, filterVariety].forEach(el => el.addEventListener('input', renderTable));
clearFiltersBtn.addEventListener('click', () => {
    filterDate.value = '';
    filterVariety.value = '';
    renderTable();
});

// Export CSV
exportCsvBtn.addEventListener('click', () => {
    const data = getFiltered();
    if (!data.length) return alert('No rows to export');

    const title = "Katwa Stock Report";
    const subtitle = filterDate.value ? `Date: ${filterDate.value}` : '';
    const header = ['Date','Rice Type','Variety','Kari (t)','Godown (t)','Total (t)'];
    const rows = data.map(r => [r.date,r.riceType,r.variety,r.kari.toFixed(2),r.godown.toFixed(2),r.total.toFixed(2)]);

    const csvLines = [];
    csvLines.push(`"${title}"`);
    if (subtitle) csvLines.push(`"${subtitle}"`);
    csvLines.push("");
    csvLines.push(header.join(','));
    rows.forEach(r => csvLines.push(r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')));

    const csv = csvLines.join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `katwa-stock-report-${filterDate.value||'latest'}-${filterVariety.value||'all'}.csv`;
    link.click();
});

// Export PDF
exportPdfBtn.addEventListener('click', () => {
    const data = getFiltered();
    if (!data.length) return alert('No rows to export');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt', format:'a4'});
    doc.setFontSize(14).text('Katwa Stock Report', 40, 40);

    const meta = [];
    if (filterDate.value) meta.push('Date: ' + filterDate.value);
    if (filterVariety.value) meta.push('Variety: ' + filterVariety.value);
    if (meta.length) doc.setFontSize(10).text(meta.join(' • '), 40, 58);

    const columns = ['#','Date','Rice Type','Variety','Kari (t)','Godown (t)','Total (t)'];
    const rows = data.map((r, i) => [i+1,r.date,r.riceType,r.variety,r.kari.toFixed(2),r.godown.toFixed(2),r.total.toFixed(2)]);
    doc.autoTable({
        head: [columns],
        body: rows,
        startY: (meta.length ? 70 : 60),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [11,99,193], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245,250,255] },
        margin: { left: 40, right: 40 }
    });
    const summaryY = doc.lastAutoTable.finalY + 10;
    const total = data.reduce((s,r)=>s+r.total,0);
    doc.text(`Entries: ${data.length} • Total: ${total.toFixed(2)} ton`, 40, summaryY + 6);
    doc.save(`katwa-stock-report-${filterDate.value||'latest'}-${filterVariety.value||'all'}.pdf`);
});

// Escape HTML
function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
