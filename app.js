// --- Keyboard state (small screens): compact UI while typing ---
function __updateKeyboardState(){
  try{
    const vv = window.visualViewport;
    const h = vv && vv.height ? vv.height : window.innerHeight;
    const full = window.innerHeight || h;
    // If visible viewport height shrinks a lot, we assume keyboard is open
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

  // --- iOS/Chrome: stabilizuj scroll przy klawiaturze (żeby po dodaniu nie "uciekało") ---
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

  const LS_KEY = "zamowienia_pro_v2"; // Zaktualizowana wersja LS
  const DEFAULT_CATS = ["Warzywa","Mięso","Nabiał","Mrożonki","Suchy magazyn","Przyprawy","Owoce","Ryby","Inne"];
  const DEFAULT_SECTIONS = ["Grill","Palniki","Zimna","Wydawka"];
  const TZ = "Europe/Warsaw";

  // --- LIVE (Firebase Firestore) ---
  const LIVE = {
    enabled: false,
    ready: false,
    db: null,
    orderId: "",
    status: "offline",
    orderStatus: "open",
    unsubItems: null,
    unsubOrder: null
  };

  const LS_ORDER = "zamowienia_pro_live_order";

  function liveEl(id){ return document.getElementById(id); }
  function liveSetStatus(txt){ const el = liveEl("liveStatus"); if(el) el.textContent = txt; }
  function liveCanWrite(){ return LIVE.enabled && LIVE.orderId && LIVE.orderStatus !== "closed"; }

  function initFirebase(){
    try{
      const cfg = window.__FIREBASE_CONFIG__;
      if(!cfg || !cfg.projectId){ LIVE.status="no-config"; liveSetStatus("LIVE: brak konfiguracji (firebase-config.js)"); return; }
      if(!window.firebase || !firebase.firestore){ LIVE.status="no-sdk"; liveSetStatus("LIVE: brak SDK Firebase"); return; }
      if(!firebase.apps || !firebase.apps.length){ firebase.initializeApp(cfg); }
      LIVE.db = firebase.firestore();
      LIVE.enabled = true;
      LIVE.status = "ready";
      LIVE.ready = true;
      LIVE.orderId = localStorage.getItem(LS_ORDER) || "";
      liveLoadPeople();
      if(LIVE.enabled && LIVE.orderId){
        liveUseOrder(LIVE.orderId).catch(e=>console.error(e));
      }
    }catch(e){
      console.error("Firebase init error:", e);
      liveSetStatus("LIVE: błąd inicjalizacji");
    }
  }

  // Dodane: debounce func
  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  // Ulepszona walidacja dodawania do koszyka (przykład - dostosuj do Twojej funkcji addToCart)
  function addToCart(product) { // Załóżmy, że to Twoja funkcja
    const qty = parseFloat(product.qty);
    if (isNaN(qty) || qty <= 0) {
      toast("Ilość musi być liczbą dodatnią ❌");
      return;
    }
    // Reszta logiki dodawania
  }

  // Ulepszony import catalog z loadingiem i error handling
  async function doImportCatalogFromUrl(url, {saveUrl=false} = {}){
    try {
      document.getElementById('loadingSpinner').classList.remove('hidden');
      const res = await fetch(url);
      if(!res.ok) throw new Error("Nie mogę pobrać CSV");
      const csv = await res.text();
      const rows = parseCSV(csv);
      if(rows.length < 1) throw new Error("Pusty plik CSV");

      const header = rows[0].map(h => norm(h).toLowerCase());
      const idxName = header.indexOf("name");
      const idxCategory = header.indexOf("category");
      const idxSections = header.indexOf("sections");
      if(idxName === -1 || idxCategory === -1) throw new Error("CSV musi mieć kolumny name i category");

      const out = [];
      for(let i=1;i<rows.length;i++){
        const r = rows[i];
        const name = capFirst(norm(r[idxName] || ""));
        const category = capFirst(norm(r[idxCategory] || ""));
        if(!name || !category) continue;
        const sections = idxSections >= 0 ? norm(r[idxSections] || "") : "";
        out.push({ id: uid(), name, category, sections, createdAt: Date.now() });
      }
      state.catalog = out;
      if(saveUrl){
        state.settings.catalogCsvUrl = url.trim();
      }
      save();
      renderAll();
      toast(`Baza zaktualizowana ✅ (${out.length} produktów)`);
    } catch(e) {
      console.error(e);
      toast("Błąd importu bazy ❌");
      alert("Błąd: " + e.message);
    } finally {
      document.getElementById('loadingSpinner').classList.add('hidden');
    }
  }

  // Ulepszony import z Sheets
  async function importCatalogFromGoogleSheets(){
    try{
      const url = prompt(
        "Wklej link CSV z Google Sheets (Opublikowane do internetu)\n" +
        "Przykład: .../pub?output=csv\n\n" +
        "Kolumny: name, category, sections",
        state.settings.catalogCsvUrl || ""
      );
      if(!url) return;
      await doImportCatalogFromUrl(url.trim(), {saveUrl:true});
    }catch(e){
      console.error(e);
      toast("Błąd importu bazy ❌");
      alert("Błąd importu: " + (e && e.message ? e.message : e));
    }
  }

  // Reszta funkcji jak w oryginalnym, ale dodaj walidację do newProdName itp.
  // Np. w dodawaniu produktu:
  function addNewProduct() {
    const name = document.getElementById('newProdName').value.trim();
    if (!name) {
      toast("Nazwa produktu nie może być pusta ❌");
      return;
    }
    // Reszta
  }

  // Dodane: theme switch
  function applyTheme(theme) {
    document.body.classList.remove('light', 'dark');
    if (theme === 'light') document.body.classList.add('light');
    else document.body.classList.add('dark');
  }

  // W boot(): załaduj theme z LS
  function boot(){
    load();
    ensureSeed();
    renderAll();
    wire();
    initFirebase();
    liveBindUI();
    if(LIVE.enabled && LIVE.orderId){
      liveUseOrder(LIVE.orderId).catch(e=>console.error(e));
    }

    // Theme
    const savedTheme = localStorage.getItem('theme') || 'auto';
    applyTheme(savedTheme);
    document.getElementById('themeSelect').value = savedTheme;

    // Debounce search
    document.getElementById('filterSearch').addEventListener('input', debounce(renderProducts, 250)); // Załóż, że renderProducts to Twoja funkcja filtrująca

    // Prompt settings if missing
    if(!norm(state.settings.userName)){
      setTimeout(() => {
        toast("Ustaw swoje imię w menu ☰");
        openSheet();
      }, 450);
    }

    // Focus trap w sheet
    const sheet = document.getElementById('sheet');
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = sheet.querySelectorAll('button, input, select');
        if (e.shiftKey && document.activeElement === focusable[0]) {
          focusable[focusable.length - 1].focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
          focusable[0].focus();
          e.preventDefault();
        }
      }
    });
  }

  // Ulepszone btnCloseOrder z potwierdzeniem
  document.getElementById('btnCloseOrder').addEventListener('click', () => {
    if (confirm("Na pewno zamknąć zamówienie? Nie będzie można edytować.")) {
      // Reszta logiki zamknięcia
    }
  });

  // Zapisz theme w ustawieniach
  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    const theme = document.getElementById('themeSelect').value;
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    // Reszta save
  });

  boot();
  // Dodaj resztę oryginalnego kodu (np. parseCSV, exportCatalogToCSV, itd.) – upewnij się, że jest pełny
})();
