document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("main-header");
  if (!cont) return;

  const raw = localStorage.getItem("usuario");
  let usuario = null;

  try {
    usuario = raw ? JSON.parse(raw) : null;
  } catch {
    usuario = null;
  }

  const langOptions = `
    <a href="#" onclick="selectLang('🇪🇸','España')">🇪🇸 España</a>
    <a href="#" onclick="selectLang('🏴󠁧󠁢󠁣󠁴󠁿','Català')">🏴󠁧󠁢󠁣󠁴󠁿 Català</a>
    <a href="#" onclick="selectLang('🇬🇧','English')">🇬🇧 English</a>
    <a href="#" onclick="selectLang('🇩🇪','Deutsch')">🇩🇪 Deutsch</a>
    <a href="#" onclick="selectLang('🇫🇷','Français')">🇫🇷 Français</a>
    <a href="#" onclick="selectLang('🇮🇹','Italiano')">🇮🇹 Italiano</a>
    <a href="#" onclick="selectLang('🇵🇹','Português')">🇵🇹 Português</a>
    <a href="#" onclick="selectLang('🇩🇰','Dansk')">🇩🇰 Dansk</a>
    <a href="#" onclick="selectLang('🇺🇦','Українська')">🇺🇦 Українська</a>
    <a href="#" onclick="selectLang('🇫🇮','Suomi')">🇫🇮 Suomi</a>
    <a href="#" onclick="selectLang('🇳🇴','Norsk')">🇳🇴 Norsk</a>
    <a href="#" onclick="selectLang('🇳🇱','Nederlands')">🇳🇱 Nederlands</a>
    <a href="#" onclick="selectLang('🇵🇱','Polski')">🇵🇱 Polski</a>
    <a href="#" onclick="selectLang('🇷🇴','Română')">🇷🇴 Română</a>
  `;

  // Topbar — solo visible en móvil
  const topbar = `
  <div class="header-topbar">
    <div class="header-topbar-inner">
      <div class="header-logo" onclick="location.href='/index.html'" style="cursor:pointer; display:flex; align-items:center; gap:8px;">
        <img src="/HomeClick.png" alt="" style="height:36px; width:auto;" />
        <span style="font-size:1.4rem; font-weight:800; color:#fff;">Home<span style="color:#7cc242;">Click24</span></span>
      </div>
      <div class="topbar-lang" id="topbarLangMobile">
        <button class="topbar-lang-btn" onclick="toggleLangMenuMobile(event)">🇪🇸 España ▾</button>
        <div class="topbar-lang-menu" id="topbarLangMenuMobile">
          ${langOptions}
        </div>
      </div>
    </div>
  </div>
`;

  // Selector — solo visible en escritorio
  const langSelector = `
    <div class="topbar-lang header-lang-desktop" id="topbarLangDesktop">
      <button class="topbar-lang-btn" onclick="toggleLangMenuDesktop(event)">🇪🇸 ▾</button>
      <div class="topbar-lang-menu" id="topbarLangMenuDesktop">
        ${langOptions}
      </div>
    </div>
  `;

  /* ======================
     HEADER SIN SESIÓN
  ====================== */
  if (!usuario || !usuario._id) {
    cont.innerHTML = `
      <header class="header">
        ${topbar}
        <div class="header-container">
          <div class="header-logo" onclick="location.href='/index.html'">
            <img src="/HomeClick.png" alt="" class="logo-icon" />
            <span class="logo-text">Home<span class="logo-green">Click24</span></span>
          </div>
          <div class="header-actions">
            <a href="/comprar.html" class="btn-outline">Comprar</a>
            <a href="/alquiler.html" class="btn-outline">Alquilar</a>
            <a href="/publicar.html" class="btn-publish">Pon tu anuncio</a>
            <a href="/planes.html" class="btn-outline">Planes</a>
            <a href="/favoritos.html" class="btn-icon" title="Favoritos">❤️</a>
            <a href="/login.html" class="btn-icon" title="Chats">💬</a>
            ${langSelector}
            <a href="/login.html" class="btn-primary">👤 Acceder</a>
          </div>
        </div>
      </header>
    `;
    iniciarScroll();
    return;
  }

  /* ======================
     HEADER CON SESIÓN
  ====================== */
  cont.innerHTML = `
    <header class="header">
      ${topbar}
      <div class="header-container">
        <div class="header-logo" onclick="location.href='/index.html'">
          <img src="/HomeClick.png" alt="" class="logo-icon" />
          <span class="logo-text">Home<span class="logo-green">Click24</span></span>
        </div>
        <div class="header-actions">
          <a href="/comprar.html" class="btn-outline">Comprar</a>
          <a href="/alquiler.html" class="btn-outline">Alquilar</a>
          <a href="/publicar.html" class="btn-publish">Pon tu anuncio</a>
          <a href="/planes.html" class="btn-outline">Planes</a>
          <a href="/favoritos.html" class="btn-icon" title="Favoritos">❤️</a>
          <a href="/perfil.html#chats" class="btn-icon" title="Chats" style="position:relative;">
            💬
            <span id="chatBadge" style="
              display:none;
              position:absolute;
              top:-6px;
              right:-6px;
              background:#f87171;
              color:#fff;
              border-radius:50%;
              width:18px;
              height:18px;
              font-size:0.7rem;
              font-weight:700;
              align-items:center;
              justify-content:center;
            ">0</span>
          </a>
          ${langSelector}
          <div class="user-menu" id="userMenu">
            <div class="user-name" id="userToggle">
              ${usuario.nombre || "Usuario"}
            </div>
            <div class="dropdown" id="userDropdown">
              <a href="/perfil.html">Mi perfil</a>
              <a href="/favoritos.html">Favoritos</a>
              <a href="/perfil.html#chats">Conversaciones</a>
              <a href="#" id="logoutBtn" class="logout">Cerrar sesión</a>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;

  iniciarScroll();

  /* ======================
     BADGE NOTIFICACIONES
  ====================== */
  async function actualizarBadge() {
    try {
      const res  = await fetch(`/chat/no-leidos/${usuario._id}`);
      const data = await res.json();
      const badge = document.getElementById("chatBadge");
      if (badge) {
        badge.textContent = data.count;
        badge.style.display = data.count > 0 ? "flex" : "none";
      }
    } catch(e) {}
  }

  actualizarBadge();
  setInterval(actualizarBadge, 10000);

  /* ======================
     DROPDOWN MENU
  ====================== */
  const userMenu   = document.getElementById("userMenu");
  const userToggle = document.getElementById("userToggle");
  const logoutBtn  = document.getElementById("logoutBtn");

  if (!userMenu || !userToggle || !logoutBtn) return;

  userToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#topbarLangDesktop")) {
      const menu = document.getElementById("topbarLangMenuDesktop");
      if (menu) menu.style.display = "none";
    }
    if (!e.target.closest("#topbarLangMobile")) {
      const menu = document.getElementById("topbarLangMenuMobile");
      if (menu) menu.style.display = "none";
    }
    if (!e.target.closest("#userMenu")) {
      if (userMenu) userMenu.classList.remove("open");
    }
  });

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    location.href = "/index.html";
  });

  /* ======================
     HEADER SCROLL
  ====================== */
  function iniciarScroll() {
    const header = document.querySelector(".header");
    if (!header) return;
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }

});

/* ======================
   SELECTOR DE IDIOMA - ESCRITORIO
====================== */
window.topbarLangMenuMobile = function(e) {
  e.stopPropagation();
  e.preventDefault();
  const menu = document.getElementById("topbarLangMenuDesktop");
  if (!menu) return;
  if (menu.style.display === "block") {
    menu.style.display = "none";
  } else {
    menu.style.display = "block";
    menu.style.position = "fixed";
    menu.style.top = "75px";
    menu.style.right = "20px";
    menu.style.zIndex = "999999";
    menu.style.minWidth = "180px";
    menu.style.background = "#1a2332";
    menu.style.borderRadius = "10px";
    menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    menu.style.overflow = "hidden";
  }
};

/* ======================
   SELECTOR DE IDIOMA - MÓVIL
====================== */
window.toggleLangMenuMobile = function(e) {
  e.stopPropagation();
  e.preventDefault();
  const menu = document.getElementById("topbarLangMenuMobile");
  const btn = e.currentTarget;
  if (!menu) return;
  if (menu.style.display === "block") {
    menu.style.display = "none";
  } else {
    const rect = btn.getBoundingClientRect();
    menu.style.display = "block";
    menu.style.position = "fixed";
    menu.style.top = (rect.bottom + 6) + "px";
    menu.style.left = (rect.left - 100) + "px";
    menu.style.right = "auto";
    menu.style.zIndex = "999999";
    menu.style.minWidth = "180px";
    menu.style.background = "#1a2332";
    menu.style.borderRadius = "10px";
    menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    menu.style.overflow = "hidden";
  }
};

/* ======================
   SELECCIONAR IDIOMA
====================== */
window.selectLang = function(flag, name) {
  const btns = document.querySelectorAll(".topbar-lang-btn");
  btns.forEach(btn => {
    const text = btn.textContent.includes("España") || btn.textContent.length > 5
      ? `${flag} ${name} ▾`
      : `${flag} ▾`;
    btn.textContent = text;
  });
  const menus = document.querySelectorAll(".topbar-lang-menu");
  menus.forEach(m => m.style.display = "none");
  if (name !== "España") {
    alert(`La versión en ${name} estará disponible próximamente 🌍`);
  }
};
