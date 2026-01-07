// app.js – wersja z poprawioną funkcją load() i save()

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

  // ------------------------------
  //   NOWE FUNKCJE – load i save
  // ------------------------------
  function load() {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        console.log("Stan aplikacji załadowany z localStorage:", state);
      } else {
        console.log("Brak zapisanego stanu – startujemy od czystej bazy");
      }
    } catch (e) {
      console.error("Błąd ładowania stanu z localStorage:", e);
      localStorage.removeItem(LS_KEY); // wyczyść uszkodzony zapis
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
  //   RESZTA TWOJEGO KODU
  //   (wklej tutaj swoją oryginalną logikę po tych funkcjach)
  // ------------------------------
  // ... Twój cały kod poniżej ...

  // Przykładowo – jeśli masz state, to dodaj taki obiekt na początku
  let state = {
    catalog: [],
    cart: [],
    settings: {
      userName: "",
      restName: "",
      catalogCsvUrl: ""
    },
    // ... inne pola, które masz
  };

  function ensureSeed() {
    if (!state.catalog || state.catalog.length === 0) {
      state.catalog = [
        { id: "test1", name: "Ogórek", category: "Warzywa", sections: "Grill", createdAt: Date.now() },
        { id: "test2", name: "Pomidor", category: "Warzywa", sections: "", createdAt: Date.now() },
        { id: "test3", name: "Ser żółty", category: "Nabiał", sections: "", createdAt: Date.now() },
        { id: "test4", name: "Frytki", category: "Mrożonki", sections: "Zimna", createdAt: Date.now() },
        { id: "test5", name: "Mleko", category: "Nabiał", sections: "", createdAt: Date.now() }
      ];
      save();
      console.log("Dodano 5 przykładowych produktów do bazy");
    }
  }

  function boot(){
    console.log("boot() started");
    load();               // ← teraz działa
    ensureSeed();         // doda testowe produkty, jeśli baza pusta
    renderAll();          // ← zakładam, że masz taką funkcję
    wire();               // ← zakładam, że masz taką funkcję
    initFirebase();
    liveBindUI();
    liveLoadPeople();
    if(LIVE.enabled && LIVE.orderId){
      liveUseOrder(LIVE.orderId).catch(e=>console.error(e));
    }

    // ... reszta Twojego kodu w boot()
  }

  // ------------------------------
  //   TU WSTAW CAŁĄ RESZTĘ SWOJEGO KODU
  //   (wszystkie inne funkcje: renderAll, wire, renderProducts, addToCart, etc.)
  // ------------------------------
  // ... wklej tutaj swój oryginalny kod ...

  // Na samym końcu wywołaj boot
  boot();

})();
