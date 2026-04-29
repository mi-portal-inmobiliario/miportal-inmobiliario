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

  const topbar = `
    <div class="header-topbar">
      <div class="header-topbar-inner">
        <span class="topbar-brand">🏠 HomeClick24</span>
        <div class="topbar-lang" id="topbarLang">
          <button class="topbar-lang-btn" onclick="toggleLangMenu(event)">🇪🇸 ▾</button>
          <div class="topbar-lang-menu" id="topbarLangMenu">
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
          </div>
        </div>
      </div>
    </div>
  `;

  const langSelector = `
    <div class="topbar-lang header-lang-desktop" id="topbarLang">
      <button class="topbar-lang-btn" onclick="toggleLangMenu(event)">🇪🇸 ▾</button>
      <div class="topbar-lang-menu" id="topbarLangMenu">
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
  if (!e.target.closest("#userMenu")) {
    userMenu.classList.remove("open");
  }
    const menu = document.getElementById("topbarLangMenu");
    if (menu) menu.classList.remove("open");
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
   SELECTOR DE IDIOMA
====================== */
window.toggleLangMenu = function(e) {
  e.stopPropagation();
  e.preventDefault();
  const menu = document.getElementById("topbarLangMenu");
  if (menu) {
    const isOpen = menu.classList.contains("open");
    menu.classList.toggle("open");
    menu.style.display = isOpen ? "none" : "block";
  }
};

window.selectLang = function(flag, name) {
  const btns = document.querySelectorAll(".topbar-lang-btn");
  btns.forEach(btn => {
    btn.textContent = `${flag} ▾`;
  });
  const menus = document.querySelectorAll(".topbar-lang-menu");
  menus.forEach(m => m.classList.remove("open"));
  if (name !== "España") {
    alert(`La versión en ${name} estará disponible próximamente 🌍`);
  }
};
