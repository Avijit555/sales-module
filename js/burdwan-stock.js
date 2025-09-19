console.log('Burdwan stock logic');

// ------------------- API -------------------
const API_URL = "http://127.0.0.1:5000/burdwan_stock";   // Flask endpoint

let records = [];
let riceNames = [];

// --- DOM refs ---
const variantEl = document.getElementById("variant");
const brandEl = document.getElementById("brand");
const riceTypeRow = document.getElementById("riceTypeRow");
const riceTypeEl = document.getElementById("riceType");
const riceNameEl = document.getElementById("riceName");
const riceNamesList = document.getElementById("riceNamesList");
const quantityEl = document.getElementById("quantity");
const kgDropdownRow = document.getElementById("kgDropdownRow");
const kgPerBagSelect = document.getElementById("kgPerBagSelect");
const kgInputRow = document.getElementById("kgInputRow");
const kgPerBagInput = document.getElementById("kgPerBagInput");
const tonEl = document.getElementById("ton");
const stockForm = document.getElementById("stockForm");
const stockTableBody = document.querySelector("#stockTable tbody");
const resetBtn = document.getElementById("resetBtn");
const editingIndexEl = document.getElementById("editingIndex");

// Filters
const filterDateEl = document.getElementById("filterDate");
const filterVariantEl = document.getElementById("filterVariant");
const filterRiceTypeEl = document.getElementById("filterRiceType");
const filterRiceNameEl = document.getElementById("filterRiceName");
const applyFiltersBtn = document.getElementById("applyFilters");
const clearFiltersBtn = document.getElementById("clearFilters");

// Export
const exportCsvBtn = document.getElementById("exportCsv");
const exportPdfBtn = document.getElementById("exportPdf");

// ------------------- Utility -------------------
function loadRiceNames() {
  riceNamesList.innerHTML = "";
  riceNames.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    riceNamesList.appendChild(opt);
  });
}

// ------------------- Dynamic UI -------------------
function updateRiceTypeOptions() {
  riceTypeRow.style.display = "none";
  riceTypeEl.innerHTML = "";
  if (variantEl.value === "Non Basmoti") {
    if (brandEl.value === "Hemraj") {
      riceTypeRow.style.display = "";
      ["Puffed", "Parboiled", "Raw"].forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        riceTypeEl.appendChild(opt);
      });
    } else if (brandEl.value === "Shrivriddhi") {
      riceTypeRow.style.display = "";
      ["Parboiled", "Raw"].forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        riceTypeEl.appendChild(opt);
      });
    }
  }
}

function recalcTotals() {
  const bags = Number(quantityEl.value) || 0;
  let kgPerBag = 0;
  if (variantEl.value === "Basmoti") {
    kgPerBag = Number(kgPerBagSelect.value) || 0;
  } else if (variantEl.value === "Non Basmoti") {
    kgPerBag = Number(kgPerBagInput.value) || 0;
  }
  const ton = ((bags * kgPerBag) / 1000).toFixed(3);
  tonEl.value = ton;
}

// ------------------- API CRUD -------------------
// ✅ GET
async function fetchRecords() {
  const res = await fetch(API_URL);
  records = await res.json();
  riceNames = [...new Set(records.map(r => r.riceName))];
  loadRiceNames();
  renderTable();
}

// ✅ POST
async function addRecord(record) {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  await fetchRecords();
}

// ✅ PUT
async function updateRecord(id, record) {
  await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  await fetchRecords();
}

// ✅ DELETE
async function deleteRecord(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  await fetchRecords();
}

// ------------------- Event Listeners -------------------
variantEl.addEventListener("change", () => {
  updateRiceTypeOptions();
  if (variantEl.value === "Basmoti") {
    kgDropdownRow.style.display = "";
    kgInputRow.style.display = "none";
  } else if (variantEl.value === "Non Basmoti") {
    kgDropdownRow.style.display = "none";
    kgInputRow.style.display = "";
  } else {
    kgDropdownRow.style.display = "none";
    kgInputRow.style.display = "none";
  }
  recalcTotals();
});
brandEl.addEventListener("change", updateRiceTypeOptions);
quantityEl.addEventListener("input", recalcTotals);
kgPerBagSelect.addEventListener("change", recalcTotals);
kgPerBagInput.addEventListener("input", recalcTotals);

// ------------------- Form Submit -------------------
stockForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const record = {
    date: document.getElementById("date").value,
    variant: variantEl.value,
    brand: brandEl.value,
    riceType: riceTypeEl.value || "",
    riceName: riceNameEl.value.trim(),
    quantity: Number(quantityEl.value) || 0,
    kgPerBag:
      variantEl.value === "Basmoti"
        ? Number(kgPerBagSelect.value) || 0
        : Number(kgPerBagInput.value) || 0,
  };
  record.ton = Number(((record.quantity * record.kgPerBag) / 1000).toFixed(3));

  const editIdx = Number(editingIndexEl.value);
  if (editIdx >= 0) {
    await updateRecord(records[editIdx].id, record);   // 🔥 backend update
    editingIndexEl.value = -1;
  } else {
    await addRecord(record);   // 🔥 backend insert
  }

  stockForm.reset();
  recalcTotals();
  kgDropdownRow.style.display = "none";
  kgInputRow.style.display = "none";
});

// ------------------- Table -------------------
function renderTable(data = records) {
  stockTableBody.innerHTML = "";
  data.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.variant}</td>
      <td>${r.brand}</td>
      <td>${r.riceType || ""}</td>
      <td>${r.riceName}</td>
      <td>${r.quantity}</td>
      <td>${r.kgPerBag}</td>
      <td>${r.ton}</td>
      <td>
        <button class="action-btn edit-btn" data-idx="${idx}">Edit</button>
        <button class="action-btn delete-btn" data-id="${r.id}">Delete</button>
      </td>
    `;
    stockTableBody.appendChild(tr);
  });

  // edit/delete handlers
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = btn.dataset.idx;
      const rec = records[idx];
      document.getElementById("date").value = rec.date;
      variantEl.value = rec.variant;
      brandEl.value = rec.brand;
      updateRiceTypeOptions();
      riceTypeEl.value = rec.riceType;
      riceNameEl.value = rec.riceName;
      quantityEl.value = rec.quantity;

      if (rec.variant === "Basmoti") {
        kgDropdownRow.style.display = "";
        kgInputRow.style.display = "none";
        kgPerBagSelect.value = rec.kgPerBag;
      } else {
        kgDropdownRow.style.display = "none";
        kgInputRow.style.display = "";
        kgPerBagInput.value = rec.kgPerBag;
      }

      tonEl.value = rec.ton;
      editingIndexEl.value = idx;
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Delete this record?")) {
        await deleteRecord(id);   // 🔥 backend delete
      }
    });
  });
}

// ------------------- Filters -------------------
function applyFilters() {
  let filtered = [...records];
  if (filterDateEl.value) {
    filtered = filtered.filter((r) => r.date === filterDateEl.value);
  }
  if (filterVariantEl.value) {
    filtered = filtered.filter((r) => r.variant === filterVariantEl.value);
  }
  if (filterRiceTypeEl.value) {
    filtered = filtered.filter((r) => r.riceType === filterRiceTypeEl.value);
  }
  if (filterRiceNameEl.value) {
    filtered = filtered.filter(
      (r) =>
        r.riceName.toLowerCase() === filterRiceNameEl.value.toLowerCase()
    );
  }
  renderTable(filtered);
  return filtered;
}

applyFiltersBtn.addEventListener("click", applyFilters);
clearFiltersBtn.addEventListener("click", () => {
  filterDateEl.value = "";
  filterVariantEl.value = "";
  filterRiceTypeEl.value = "";
  filterRiceNameEl.value = "";
  renderTable();
});

// ------------------- Export -------------------
exportCsvBtn.addEventListener("click", () => {
  const data = applyFilters();
  let csv =
    "Date,Variant,Brand,Rice Type,Rice Name,Bags,Kg/Bag,Ton\n";
  data.forEach((r) => {
    csv += `${r.date},${r.variant},${r.brand},${r.riceType},${r.riceName},${r.quantity},${r.kgPerBag},${r.ton}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rice_stock.csv";
  link.click();
});

exportPdfBtn.addEventListener("click", () => {
  const data = applyFilters();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Rice Stock Records", 14, 15);
  doc.autoTable({
    startY: 20,
    head: [
      ["Date", "Variant", "Brand", "Rice Type", "Rice Name", "Bags", "Kg/Bag", "Ton"],
    ],
    body: data.map((r) => [
      r.date,
      r.variant,
      r.brand,
      r.riceType,
      r.riceName,
      r.quantity,
      r.kgPerBag,
      r.ton,
    ]),
  });
  doc.save("rice_stock.pdf");
});

// ------------------- Init -------------------
fetchRecords();
recalcTotals();
resetBtn.addEventListener("click", () => {
  stockForm.reset();
  editingIndexEl.value = -1;
  tonEl.value = "";
  kgDropdownRow.style.display = "none";
  kgInputRow.style.display = "none";
});

