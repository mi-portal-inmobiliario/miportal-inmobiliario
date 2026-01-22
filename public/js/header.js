console.log("✅ header.js cargado");

document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("main-header");
  if (!cont) return;

  const usuarioRaw = localStorage.getItem("usuario");
  let usuario = null;

  try {
    usuario = JSON.parse(usuarioRaw);
  } catch (e) {
    usuario = null;
  }

  /* =========================
     HEADER BASE
  ======================== */
  cont.innerHTML = `
    <header class="app-header">
      <div class="header-left">
        <div class="logo" onclick="location.href='index.html'">
          Costa Hogar
        </div>
      </div>

      <nav class="header-nav">
        <a href="comprar.html">Comprar</a>
        <a href="alquiler.html">Alquilar</a>
        ${usuario ? `<a href="publicar.html" class="btn">Publicar</a>` : ""}
      </nav>

      <div class="header-right">
        ${
          usuario
            ? `
          <div class="user-menu">
            <span id="userToggle">${usuario.nombre}</span>
            <div class="user-dropdown" id="userDropdown">
              <a href="perfil.html">Mi perfil</a>
              <a href="favoritos.html">Favoritos</a>
              <a href="perfil.html#chats">Conversaciones</a>
              <a href="#" id="logoutBtn" class="logout">Cerrar sesión</a>
            </div>
          </div>
          `
            : `<a href="login.html" class="btn">Iniciar sesión</a>`
        }

        <div class="burger" id="burger">☰</div>
      </div>
    </header>

    <div class="mobile-menu" id="mobileMenu">
      <a href="comprar.html">Comprar</a>
      <a href="alquiler.html">Alquilar</a>
      ${
        usuario
          ? `
          <a href="perfil.html">Mi perfil</a>
          <a href="favoritos.html">Favoritos</a>
          <a href="#" id="logoutMobile">Cerrar sesión</a>
          `
          : `<a href="login.html">Iniciar sesión</a>`
      }
    </div>
  `;

  /* =========================
     DROPDOWN DESKTOP
  ======================== */
  const toggle = document.getElementById("userToggle");
  const dropdown = document.getElementById("userDropdown");

  if (toggle && dropdown) {
    toggle.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    };

    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
    });
  }

  /* =========================
     LOGOUT
  ======================== */
  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    location.href = "index.html";
  });

  document.getElementById("logoutMobile")?.addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.clear();
    location.href = "index.html";
  });

  /* =========================
     MENÚ MÓVIL
  ======================== */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");

  if (burger && mobileMenu) {
    burger.onclick = () => {
      mobileMenu.classList.toggle("open");
    };
  }
});

