document.addEventListener("DOMContentLoaded", () => {
  const cont = document.getElementById("main-header");
  if (!cont) return;

  const raw = localStorage.getItem("usuario");
  let usuario = null;

  try {
    usuario = JSON.parse(raw);
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
            Costa Hogar
          </div>

          <div class="header-actions">
            <a href="/comprar.html">Comprar</a>
            <a href="/alquiler.html">Alquilar</a>
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
          Costa Hogar
        </div>

        <div class="header-actions">
          <a href="/comprar.html">Comprar</a>
          <a href="/alquiler.html">Alquilar</a>
          <a href="/publicar.html" class="btn-primary">Publicar</a>

          <div class="user-menu" id="userMenu">
            <div class="user-name" id="userToggle">
              ${usuario.nombre}
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
     DROPDOWN CLICK
  ====================== */
  const userMenu = document.getElementById("userMenu");
  const userToggle = document.getElementById("userToggle");
  const logoutBtn = document.getElementById("logoutBtn");

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
