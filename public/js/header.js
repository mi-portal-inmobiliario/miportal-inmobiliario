console.log("✅ header.js cargado");

document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("main-header");
  if (!cont) return;

  let usuario = null;
  try {
    usuario = JSON.parse(localStorage.getItem("usuario"));
  } catch (e) {
    usuario = null;
  }

  /* =================================================
     HEADER SIN SESIÓN
  ================================================= */
  if (!usuario || !usuario._id) {
    cont.innerHTML = `
      <header class="header">
        <div class="header-container">
          <div class="header-logo" onclick="location.href='index.html'">
            Costa Hogar
          </div>

          <nav class="header-actions">
            <a href="comprar.html">Comprar</a>
            <a href="alquiler.html">Alquilar</a>
            <a href="login.html" class="btn-primary">Iniciar sesión</a>
          </nav>
        </div>
      </header>
    `;
    return;
  }

  /* =================================================
     HEADER CON SESIÓN
  ================================================= */
  cont.innerHTML = `
    <header class="header">
      <div class="header-container">

        <div class="header-logo" onclick="location.href='index.html'">
          Costa Hogar
        </div>

        <nav class="header-actions desktop-only">
          <a href="comprar.html">Comprar</a>
          <a href="alquiler.html">Alquilar</a>
          <a href="publicar.html" class="btn-primary">Publicar</a>

          <div class="user-menu" id="userMenu">
            <div class="user-name" id="userName">
              ${usuario.nombre}
            </div>

            <div class="dropdown" id="userDropdown">
              <a href="perfil.html">Mi perfil</a>
              <a href="favoritos.html">Mis favoritos</a>
              <a href="perfil.html#chats">Conversaciones</a>
              <a href="#" class="logout" id="logoutBtn">Cerrar sesión</a>
            </div>
          </div>
        </nav>

        <!-- BOTÓN MÓVIL -->
        <div class="menu-toggle mobile-only" id="menuToggle">☰</div>

      </div>

      <!-- MENÚ MÓVIL -->
      <div class="mobile-menu" id="mobileMenu">
        <div class="mobile-panel">
          <a href="comprar.html">Comprar</a>
          <a href="alquiler.html">Alquilar</a>
          <a href="publicar.html">Publicar</a>
          <hr>
          <a href="perfil.html">Mi perfil</a>
          <a href="favoritos.html">Mis favoritos</a>
          <a href="perfil.html#chats">Conversaciones</a>
          <a href="#" class="logout" id="logoutMobile">Cerrar sesión</a>
        </div>
      </div>

    </header>
  `;

  /* =================================================
     DROPDOWN DESKTOP
  ================================================= */
  const userMenu = document.getElementById("userMenu");
  const userName = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");

  userName.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    userMenu.classList.remove("open");
  });

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cerrarSesion();
  });

  /* =================================================
     MENÚ MÓVIL
  ================================================= */
  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");
  const logoutMobile = document.getElementById("logoutMobile");

  menuToggle.addEventListener("click", () => {
    mobileMenu.classList.add("open");
  });

  mobileMenu.addEventListener("click", (e) => {
    if (e.target === mobileMenu) {
      mobileMenu.classList.remove("open");
    }
  });

  logoutMobile.addEventListener("click", (e) => {
    e.preventDefault();
    cerrarSesion();
  });

  /* =================================================
     LOGOUT COMÚN
  ================================================= */
  function cerrarSesion() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    location.href = "index.html";
  }
});
