/* ================================
   VARIABLES
================================ */
let propiedad = null;
let fotos = [];
let indexFoto = 0;

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", cargarPropiedad);

/* ================================
   CARGAR PROPIEDAD
================================ */
async function cargarPropiedad() {
  const id = new URLSearchParams(location.search).get("id");

  const res = await fetch("/propiedades");
  const data = await res.json();

  propiedad = data.find(p => p._id === id);

  if (!propiedad) {
    document.getElementById("contenedor").innerHTML =
      "<h2>Propiedad no encontrada</h2>";
    return;
  }

  fotos = propiedad.imagenes?.length
    ? propiedad.imagenes
    : ["https://via.placeholder.com/1200x700?text=Sin+imagen"];

  renderPropiedad();
}

/* ================================
   RENDER
================================ */
function renderPropiedad() {
  document.getElementById("contenedor").innerHTML = `
    <div class="slider-container">
      ${fotos.map((f,i)=>`
        <img src="${f}" class="${i===0?"activa":""}">
      `).join("")}
    </div>

    <h1>${propiedad.titulo}</h1>
    <p class="price">${propiedad.precio} €</p>
    <p><strong>Dirección:</strong> ${propiedad.direccion}</p>
    <p>${propiedad.descripcion || ""}</p>

    <button class="chat-open-btn" onclick="contactar()">
      💬 Contactar con el anunciante
    </button>

    <a class="volver-btn" href="index.html">⬅ Volver</a>
  `;
}

/* ================================
   CONTACTAR → CHAT REAL
================================ */
async function contactar() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario || !usuario._id) {
    alert("Debes iniciar sesión para contactar");
    location.href = "login.html";
    return;
  }

  if (!propiedad.usuarioId) {
    alert("Esta propiedad no tiene anunciante asignado");
    return;
  }

  const res = await fetch("/chat/conversaciones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
      propiedadId: String(propiedad._id),
      compradorId: String(usuario._id),
      anuncianteId: String(propiedad.usuarioId)
    })
  });

  const data = await res.json();

  if (!res.ok || !data._id) {
    alert("No se pudo abrir el chat");
    return;
  }

  location.href = `chat.html?id=${data._id}`;
}

