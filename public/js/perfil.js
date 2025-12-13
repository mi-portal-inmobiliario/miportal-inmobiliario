// =========================
// PERFIL.JS
// =========================

document.addEventListener("DOMContentLoaded", () => {
  cargarUsuario();
  cargarPropiedades();
  cargarChats();
});

/* =========================
   CARGAR USUARIO
========================= */
function cargarUsuario() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  document.getElementById("nombreUsuario").textContent =
    usuario.nombre || "Usuario";

  document.getElementById("emailUsuario").textContent =
    usuario.email || "";

  document.getElementById("avatar").textContent =
    (usuario.nombre || "U").charAt(0).toUpperCase();
}

/* =========================
   PROPIEDADES PUBLICADAS
========================= */
async function cargarPropiedades() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const res = await fetch("/propiedades");
  const data = await res.json();

  const mias = data.filter(p => String(p.usuarioId) === String(usuario._id));

  const cont = document.getElementById("lista");
  cont.innerHTML = "";

  if (!mias.length) {
    document.getElementById("noProps").style.display = "block";
    return;
  }

  mias.forEach(p => {
    const img = p.imagenes?.[0] || "https://via.placeholder.com/500?text=Sin+imagen";

    cont.innerHTML += `
      <div class="card" onclick="location.href='propiedad.html?id=${p._id}'">
        <img src="${img}">
        <div class="info">
          <div class="precio">${p.precio} €</div>
          <div>${p.direccion}</div>
        </div>
      </div>
    `;
  });
}

/* =========================
   CHATS DEL USUARIO
========================= */
async function cargarChats() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  if (!usuario._id) return;

  const res = await fetch(`/chat/mis-conversaciones/${usuario._id}`);
  const chats = await res.json();

  const cont = document.getElementById("chatsRecibidos");
  cont.innerHTML = "";

  if (!chats.length) {
    document.getElementById("noChats").style.display = "block";
    return;
  }

  chats.forEach(c => {
    cont.innerHTML += `
      <div class="chat-item"
           onclick="location.href='propiedad.html?id=${c.propiedadId._id}'">
        <div class="titulo">${c.propiedadId.titulo}</div>
        <small>${c.propiedadId.direccion}</small>
      </div>
    `;
  });
}

/* =========================
   LOGOUT
========================= */
function cerrarSesion() {
  localStorage.removeItem("usuario");
  location.href = "login.html";
}
