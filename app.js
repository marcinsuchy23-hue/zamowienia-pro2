const products = [
  { id: "1", name: "Ogórek zielony", category: "Warzywa", section: "Grill" },
  { id: "2", name: "Pomidor malinowy", category: "Warzywa", section: "Sałatki" },
  { id: "3", name: "Ser żółty gouda", category: "Nabiał", section: "Wydawka" },
  { id: "4", name: "Frytki 1kg", category: "Mrożonki", section: "Zimna" },
  { id: "5", name: "Mleko 3.2%", category: "Nabiał", section: "" },
  { id: "6", name: "Cebula", category: "Warzywa", section: "Palniki" },
  { id: "7", name: "Kurczak filet", category: "Mięso", section: "Grill" },
];

let cart = []; // [{id, name, qty, category}, ...]

const sectionFilter = document.getElementById("sectionFilter");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("search");
const productList = document.getElementById("productList");
const cartCount = document.getElementById("cartCount");
const btnExport = document.getElementById("btnExport");
const btnClear = document.getElementById("btnClear");

// Wypełnij select-y unikalnymi wartościami
function populateFilters() {
  const sections = [...new Set(products.map(p => p.section).filter(Boolean))];
  const categories = [...new Set(products.map(p => p.category))];

  sections.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    sectionFilter.appendChild(opt);
  });

  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categoryFilter.appendChild(opt);
  });
}

function renderProducts() {
  const section = sectionFilter.value;
  const category = categoryFilter.value;
  const query = searchInput.value.toLowerCase();

  const filtered = products.filter(p => {
    if (section && p.section !== section) return false;
    if (category && p.category !== category) return false;
    if (query && !p.name.toLowerCase().includes(query)) return false;
    return true;
  });

  productList.innerHTML = "";

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <div class="product-header">
        <span class="product-name">${p.name}</span>
        <span class="product-category">${p.category}</span>
      </div>
      <div class="qty-container">
        <input type="number" min="1" class="qty-input" data-id="${p.id}" placeholder="ilość" />
        <button class="add-btn" data-id="${p.id}">Dodaj</button>
      </div>
    `;
    productList.appendChild(div);
  });

  // Obsługa przycisków "Dodaj"
  document.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", addToCartFromButton);
  });

  // Enter w polu ilości
  document.querySelectorAll(".qty-input").forEach(input => {
    input.addEventListener("keypress", e => {
      if (e.key === "Enter") {
        addToCartFromInput(input);
      }
    });
  });
}

function addToCartFromButton(e) {
  const id = e.target.dataset.id;
  const input = e.target.previousElementSibling;
  addToCart(id, input.value);
  input.value = "";
}

function addToCartFromInput(input) {
  const id = input.dataset.id;
  addToCart(id, input.value);
  input.value = "";
}

function addToCart(id, qtyStr) {
  const qty = parseInt(qtyStr, 10);
  if (isNaN(qty) || qty < 1) {
    alert("Wpisz poprawną ilość (liczba ≥ 1)");
    return;
  }

  const product = products.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...product, qty });
  }

  updateCartCount();
}

function updateCartCount() {
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = total;
}

function exportOrder() {
  if (cart.length === 0) {
    alert("Koszyk jest pusty");
    return;
  }

  const lines = ["Zamówienie:", ""];
  cart.forEach(item => {
    lines.push(`${item.qty} × ${item.name} (${item.category})`);
  });

  const text = lines.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    alert("Zamówienie skopiowane do schowka:\n\n" + text);
  }).catch(() => {
    alert("Nie udało się skopiować – oto tekst:\n\n" + text);
  });
}

function clearCart() {
  if (confirm("Na pewno wyczyścić koszyk?")) {
    cart = [];
    updateCartCount();
  }
}

// Eventy
sectionFilter.addEventListener("change", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
searchInput.addEventListener("input", renderProducts);
btnExport.addEventListener("click", exportOrder);
btnClear.addEventListener("click", clearCart);

// Start
populateFilters();
renderProducts();
