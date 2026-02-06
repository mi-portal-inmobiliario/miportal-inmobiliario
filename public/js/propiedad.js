/* ================================
   VARIABLES GLOBALES
================================ */
let propiedad = null;
let fotos = [];
let indexFoto = 0;
let mapa = null;

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", cargarPropiedad);

/* ================================
   CARGAR PROPIEDAD
================================ */
async function cargarPropiedad() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return mostrarError("ID de propiedad inválido");

  try {
    const res = await fetch(`/propiedades/${id}`);
    if (!res.ok) throw new Error("No encontrada");
    propiedad = await res.json();
  } catch (err) {
    return mostrarError("Propiedad no encontrada");
  }

  fotos = Array.isArray(propiedad.imagenes) && propiedad.imagenes.length
    ? propiedad.imagenes
    : ["https://via.placeholder.com/1200x700?text=Sin+imagen"];

  actualizarSEO();
  renderPropiedad();
  iniciarMapa();
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
  const contenedor = document.getElementById("contenedor");

  contenedor.innerHTML = `
    <div class="slider-container">
      <div class="flecha flecha-izq" onclick="prevFoto()">‹</div>
      <img src="${fotos[indexFoto]}" class="activa"
           onclick="abrirModal('${fotos[indexFoto]}')" />
      <div class="flecha flecha-der" onclick="nextFoto()">›</div>
    </div>

    <h1>${propiedad.titulo}</h1>
    <p class="price">${propiedad.precio} €</p>
    <p><strong>Dirección:</strong> ${propiedad.direccion}</p>

    <p>${propiedad.descripcion || ""}</p>

    <div id="mapa"></div>

    <button class="chat-open-btn" onclick="contactar()">
      💬 Contactar con el anunciante
    </button>

    <a class="volver-btn" href="javascript:history.back()">⬅ Volver</a>
  `;
}

/* ================================
   MAPA LEAFLET
================================ */
function iniciarMapa() {
  if (!propiedad.lat || !propiedad.lng) return;

  if (mapa) {
    mapa.remove();
  }

  mapa = L.map("mapa").setView(
    [propiedad.lat, propiedad.lng],
    15
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  L.marker([propiedad.lat, propiedad.lng])
    .addTo(mapa)
    .bindPopup(propiedad.titulo);
}

/* ================================
   SLIDER
================================ */
function nextFoto() {
  indexFoto = (indexFoto + 1) % fotos.length;
  actualizarFoto();
}

function prevFoto() {
  indexFoto = (indexFoto - 1 + fotos.length) % fotos.length;
  actualizarFoto();
}

function actualizarFoto() {
  const img = document.querySelector(".slider-container img");
  if (img) {
    img.src = fotos[indexFoto];
  }
}

/* ================================
   MODAL IMÁGENES
================================ */
function abrirModal(src) {
  const modal = document.getElementById("modal");
  const img = document.getElementById("modal-img");
  img.src = src;
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
   CONTACTAR → CHAT
================================ */
async function contactar() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const token = localStorage.getItem("token");

  if (!usuario || !usuario._id || !token) {
    alert("Debes iniciar sesión para contactar");
    window.location.href = "/login.html";
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
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      propiedadId: propiedad._id,
      compradorId: usuario._id,
      anuncianteId: propiedad.usuarioId
    })
  });

  const data = await res.json();

  if (!res.ok || !data._id) {
    alert("No se pudo abrir el chat");
    return;
  }

  window.location.href = `/chat.html?id=${data._id}`;
}
