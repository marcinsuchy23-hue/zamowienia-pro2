// app.js – wersja z load(), save(), renderAll(), renderProducts() i testowymi produktami

// --- Keyboard state (small screens): compact UI while typing ---
function __updateKeyboardState(){
  try{
    const vv = window.visualViewport;
    const h = vv && vv.height ? vv.height : window.innerHeight;
    const full = window.innerHeight || h;
    const keyboardOpen = (vv && vv.height) ? (vv.height < full - 120) : false;
    document.body.classList.toggle('kb-open', !!keyboardOpen);
  }catch(e){}
}

if(window.visualViewport){
  window.visualViewport.addEventListener('resize', __updateKeyboardState);
  window.visualViewport.addEventListener('scroll', __updateKeyboardState);
}
window.addEventListener('resize', __updateKeyboardState);
__updateKeyboardState();

(() => {

  // --- iOS/Chrome: stabilizuj scroll przy klawiaturze ---
  let __lastScrollY = 0;
  let __scrollRestoreTimer = null;
  function rememberScroll(){
    __lastScrollY = window.scrollY || 0;
  }
  function restoreScrollSoon(delayMs=60){
    if(__scrollRestoreTimer) clearTimeout(__scrollRestoreTimer);
    __scrollRestoreTimer = setTimeout(()=>{
      try { window.scrollTo({ top: __lastScrollY, left: 0, behavior: "auto" }); }
      catch(e){ window.scrollTo(0, __lastScrollY); }
    }, delayMs);
  }

  function ensureInputVisible(el){
    try{
      if(!el) return;
      const vv = window.visualViewport;
      const rect = el.getBoundingClientRect();
      const header = document.querySelector('.app-header');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const topPad = Math.round(headerH + 9);
      const bottomPad = 22;
      let viewH = (vv && vv.height) ? vv.height : window.innerHeight;

      const desiredBottom = viewH - bottomPad;
      if(rect.bottom > desiredBottom){
        const delta = rect.bottom - desiredBottom;
        window.scrollBy({ top: delta, left: 0, behavior: "auto" });
        return;
      }
      const desiredTop = topPad;
      if(rect.top < desiredTop){
        const delta = rect.top - desiredTop;
        window.scrollBy({ top: delta, left: 0, behavior: "auto" });
      }
    }catch(e){}
  }

  const LS_KEY = "zamowienia_pro_v2";

  // Podstawowy stan aplikacji
  let state = {
    catalog: [],
    cart: [],
    settings: {
      userName: "",
      restName: "",
      catalogCsvUrl: ""
    }
    // możesz dodać więcej pól, jeśli potrzebujesz
  };

  // ------------------------------
  //   FUNKCJE ZAPISU I ODCZYTU
  // ------------------------------
  function load() {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        console.log("Stan załadowany z localStorage:", state);
      } else {
        console.log("Brak zapisanego stanu – startujemy od czystej bazy");
      }
    } catch (e) {
      console.error("Błąd ładowania localStorage:", e);
      localStorage.removeItem(LS_KEY);
    }
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      console.log("Stan zapisany do localStorage");
    } catch (e) {
      console.error("Błąd zapisu do localStorage:", e);
    }
  }

  // ------------------------------
  //   TESTOWE PRODUKTY (jeśli baza pusta)
  // ------------------------------
  function ensureSeed() {
    if (!state.catalog || state.catalog.length === 0) {
      state.catalog = [
        { id: "p1", name: "Ogórek zielony", category: "Warzywa", sections: "Grill", createdAt: Date.now() },
        { id: "p2", name: "Pomidor malinowy", category: "Warzywa", sections: "", createdAt: Date.now() },
        { id: "p3", name: "Ser żółty gouda", category: "Nabiał", sections: "", createdAt: Date.now() },
        { id: "p4", name: "Frytki 1kg", category: "Mrożonki", sections: "Zimna", createdAt: Date.now() },
        { id: "p5", name: "Mleko 3.2%", category: "Nabiał", sections: "", createdAt: Date.now() },
        { id: "p6", name: "Cebula", category: "Warzywa", sections: "Palniki", createdAt: Date.now() }
      ];
      save();
      console.log("Dodano 6 przykładowych produktów do bazy");
    }
  }

  // ------------------------------
  //   RENDEROWANIE LISTY PRODUKTÓW
  // ------------------------------
  function renderProducts() {
    console.log("renderProducts() – rysuję listę produktów");
    const container = document.getElementById('productList');
    if (!container) {
      console.error("Nie znaleziono elementu #productList");
      return;
    }

    container.innerHTML = '';

    const products = state.catalog || [];

    if (products.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">Brak produktów w bazie</div>';
      return;
    }

    products.forEach(product => {
      const item = document.createElement('div');
      item.className = 'item row row--gap';
      item.style.marginBottom = '12px';
      item.style.padding = '12px';
      item.style.background = 'rgba(255,255,255,0.05)';
      item.style.borderRadius = '12px';
      item.innerHTML = `
        <div style="flex:1; font-weight:600;">${product.name || 'Bez nazwy'}</div>
        <div style="color:#aaa; min-width:100px;">${product.category || '-'}</div>
        <input type="number" min="1" step="1" class="qty" placeholder="ilość" data-id="${product.id}" style="width:80px; text-align:center;" />
        <button class="btn primary add-to-cart" data-id="${product.id}">Dodaj</button>
      `;
      container.appendChild(item);
    });

    console.log(`Wyrenderowano ${products.length} produktów`);
  }

  function renderAll() {
    console.log("renderAll() uruchomione");
    renderProducts();
    // Tutaj możesz dodać render koszyka, nagłówka itp. w przyszłości
    // np. renderCart();
    // updateCartCount();
  }

  // ------------------------------
  //   PODPINANIE PRZYCISKÓW (wire)
  // ------------------------------
  function wire() {
    console.log("wire() – podpinam eventy");

    // Przykład: przycisk "Dodaj" (jeśli używasz klasy .add-to-cart)
    document.querySelectorAll('.add-to-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const qtyInput = e.target.previousElementSibling; // input qty
        const qty = parseInt(qtyInput.value) || 1;
        console.log(`Dodaję do koszyka produkt ${id} w ilości ${qty}`);
        // Tutaj dodaj logikę dodawania do koszyka (np. state.cart.push(...))
        qtyInput.value = ''; // wyczyść pole
      });
    });

    // Dodaj inne eventy, np. przycisk "Baza", "Eksport", "Ulubione" itd.
    // document.getElementById('btnGoCatalog').addEventListener('click', () => { ... });
  }

  // ------------------------------
  //   START APLIKACJI
  // ------------------------------
  function boot(){
    console.log("boot() started");
    load();
    ensureSeed();
    renderAll();
    wire();
    // Tutaj możesz dodać initFirebase(), liveBindUI() itp. z Twojego oryginalnego kodu
    console.log("Aplikacja uruchomiona – gotowa do użycia");
  }

  boot();

})();
