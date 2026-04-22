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

  /* ======================
     HEADER SIN SESIÓN
  ====================== */
  if (!usuario || !usuario._id) {
    cont.innerHTML = `
      <header class="header">
        <div class="header-container">
          <div class="header-logo" onclick="location.href='/index.html'">
            <img src="/CasaClick.png" alt="" class="logo-icon" />
            <span class="logo-text">Casa<span class="logo-green">Click24</span></span>
         </div>
          <div class="header-actions">
            <a href="/comprar.html" class="btn-outline">Comprar</a>
            <a href="/alquiler.html" class="btn-outline">Alquilar</a>
            <a href="/publicar.html" class="btn-publish">Pon tu anuncio</a>
            <a href="/favoritos.html" class="btn-icon" title="Favoritos">❤️</a>
            <a href="/login.html" class="btn-icon" title="Chats">💬</a>
            <a href="/login.html" class="btn-primary">Iniciar sesión</a>
          </div>
        </div>
      </header>
    `;
    return;
  }

  /* ======================
     HEADER CON SESIÓN
  ====================== */
  cont.innerHTML = `
    <header class="header">
      <div class="header-container">
        <div class="header-logo" onclick="location.href='/index.html'">
          <img src="/CasaClick.png" alt="" class="logo-icon" />
          <span class="logo-text">Casa<span class="logo-green">Click24</span></span>
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

  document.addEventListener("click", () => {
    userMenu.classList.remove("open");
  });

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    location.href = "/index.html";
  });
});