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
   CARGAR PROPIEDAD (OPTIMIZADO)
================================ */
async function cargarPropiedad() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return mostrarError("ID de propiedad inválido");

  try {
    const res = await fetch(`/propiedades/${id}`);
    if (!res.ok) throw new Error("No encontrada");
    propiedad = await res.json();
  } catch (err) {
    return mostrarError("Propiedad no encontrada");
  }

  fotos = propiedad.imagenes?.length
    ? propiedad.imagenes
    : ["https://via.placeholder.com/1200x700?text=Sin+imagen"];

  actualizarSEO();
  renderPropiedad();
}

/* ================================
   SEO DINÁMICO
================================ */
function actualizarSEO() {
  document.title = `${propiedad.titulo} · ${propiedad.precio} € | Costa Hogar`;

  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc) {
    metaDesc.setAttribute(
      "content",
      `${propiedad.titulo}. Precio ${propiedad.precio} €. ${propiedad.direccion || ""}`
    );
  }
}

/* ================================
   RENDER PROPIEDAD
================================ */
function renderPropiedad() {
  document.getElementById("contenedor").innerHTML = `
    <div class="slider-container">
      <button class="slider-btn left" onclick="prevFoto()">‹</button>

      <img src="${fotos[indexFoto]}" class="slider-img"
           onclick="abrirModal('${fotos[indexFoto]}')">

      <button class="slider-btn right" onclick="nextFoto()">›</button>
    </div>

    <h1>${propiedad.titulo}</h1>
    <p class="price">${propiedad.precio} €</p>
    <p><strong>Dirección:</strong> ${propiedad.direccion}</p>

    <!-- MAPA -->
    <div id="mapa" class="mapa-propiedad"></div>

    <p>${propiedad.descripcion || ""}</p>

    <button class="chat-open-btn" onclick="contactar()">
      💬 Contactar con el anunciante
    </button>

    <a class="volver-btn" href="javascript:history.back()">⬅ Volver</a>
  `;

  iniciarMapa();
}

/* ================================
   MAPA LEAFLET
================================ */
function iniciarMapa() {
  if (!propiedad.lat || !propiedad.lng) return;

  const mapa = L.map("mapa").setView(
    [propiedad.lat, propiedad.lng],
    15
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  L.marker([propiedad.lat, propiedad.lng])
    .addTo(mapa)
    .bindPopup(propiedad.titulo)
    .openPopup();
}

/* ================================
   SLIDER
================================ */
function nextFoto() {
  indexFoto = (indexFoto + 1) % fotos.length;
  renderPropiedad();
}

function prevFoto() {
  indexFoto = (indexFoto - 1 + fotos.length) % fotos.length;
  renderPropiedad();
}

/* ================================
   MODAL IMÁGENES
================================ */
function abrirModal(src) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-img").src = src;
  modal.style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

/* ================================
   ERRORES
================================ */
function mostrarError(msg) {
  document.getElementById("contenedor").innerHTML = `<h2>${msg}</h2>`;
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

  location.href = `/chat.html?id=${data._id}`;
}
