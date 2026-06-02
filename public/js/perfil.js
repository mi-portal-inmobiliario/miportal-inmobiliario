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
  const token = localStorage.getItem("token");
  const res = await fetch("/propiedades/mias", {
    headers: { "Authorization": "Bearer " + token }
  });
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
function tiempoRelativo(fecha) {
  const diffMs = Date.now() - new Date(fecha).getTime();
  const min = Math.max(1, Math.floor(diffMs / 60000));
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? "s" : ""}`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias !== 1 ? "s" : ""}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

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
    // Determinar quién es el otro usuario
    const esAnunciante = String(c.anuncianteId) === String(usuario._id);
    const otroNombre = esAnunciante
      ? (c.compradorNombre || "Interesado")
      : (c.anuncianteNombre || "Anunciante");
    const noLeidos = Number(c.noLeidos) || 0;
    const ultimoMensaje = escapeHtml(c.ultimoMensaje || "Conversación iniciada");

    cont.innerHTML += `
      <div class="chat-item ${noLeidos > 0 ? "unread" : ""}" onclick="location.href='chat.html?id=${c._id}'">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:40px; height:40px; border-radius:50%; background:#2563eb; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0;">
            ${otroNombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;">${otroNombre}</div>
            <div style="font-size:13px; color:#4b5563;">${ultimoMensaje}</div>
            <div style="font-size:12px; color:#9ca3af;">${tiempoRelativo(c.ultimaActividad || c.creado)}</div>
          </div>
        </div>
        ${noLeidos > 0 ? `<span class="chat-badge">${noLeidos > 99 ? "99+" : noLeidos}</span>` : ""}
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
