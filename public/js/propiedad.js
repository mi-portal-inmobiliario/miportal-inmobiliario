let propiedad = null;
let fotos = [];
let indexFoto = 0;
let mapa = null;

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
    : ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200"];

  actualizarSEO();
  renderPropiedad();
  await iniciarMapa();
}

/* ================================
   SEO
================================ */
function actualizarSEO() {
  document.title = `${propiedad.titulo} · ${propiedad.precio?.toLocaleString("es-ES")} € | HomeClick24`;
  
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc) metaDesc.setAttribute("content",
    `${propiedad.titulo}. Precio ${propiedad.precio} €. ${propiedad.direccion || ""}`
  );

  // Open Graph
  document.querySelector("meta[property='og:title']")
    ?.setAttribute("content", propiedad.titulo);
  document.querySelector("meta[property='og:description']")
    ?.setAttribute("content", `${propiedad.precio?.toLocaleString("es-ES")} € · ${propiedad.direccion}`);

  // Schema.org
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": propiedad.titulo,
    "description": propiedad.descripcion || "",
    "url": window.location.href,
    "price": propiedad.precio,
    "priceCurrency": "EUR",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": propiedad.direccion || "",
      "addressCountry": "ES"
    },
    "numberOfRooms": propiedad.habitaciones || null,
    "image": fotos[0] || "",
    "offers": {
      "@type": "Offer",
      "price": propiedad.precio,
      "priceCurrency": "EUR",
      "availability": "https://schema.org/InStock"
    }
  };

  // Eliminar schema anterior si existe
  const schemaAnterior = document.getElementById("schema-propiedad");
  if (schemaAnterior) schemaAnterior.remove();

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "schema-propiedad";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* ================================
   RENDER
================================ */
function renderPropiedad() {
  const contenedor = document.getElementById("contenedor");
  const tipo = propiedad.tipoOperacion === "venta" ? "Venta" : "Alquiler";
  const tipoCls = propiedad.tipoOperacion === "venta" ? "tag-venta" : "tag-alquiler";
  const precio = propiedad.precio?.toLocaleString("es-ES") + " €";
  const hab = propiedad.habitaciones ? `🛏 ${propiedad.habitaciones} habitaciones` : "";

  contenedor.innerHTML = `
    <a class="volver-link" href="javascript:history.back()">← Volver</a>

    <div class="propiedad-layout">

      <!-- COLUMNA IZQUIERDA -->
      <div class="propiedad-left">

        <!-- SLIDER -->
        <div class="slider-container">
          <button class="slider-btn left" onclick="prevFoto()">‹</button>
          <img class="slider-img" src="${fotos[0]}" alt="${propiedad.titulo}"
               onclick="abrirModal('${fotos[0]}')">
          <button class="slider-btn right" onclick="nextFoto()">›</button>
          <span class="slider-count">1 / ${fotos.length}</span>
          <span class="tag-tipo ${tipoCls}">${tipo}</span>
        </div>

        <!-- MINIATURAS -->
        ${fotos.length > 1 ? `
        <div class="miniaturas">
          ${fotos.map((f, i) => `
            <img src="${f}" class="miniatura ${i === 0 ? 'active' : ''}"
                 onclick="irFoto(${i})" alt="foto ${i+1}">
          `).join("")}
        </div>` : ""}

        <!-- DESCRIPCIÓN -->
        <div class="propiedad-descripcion">
          <h2>Descripción</h2>
          <p>${propiedad.descripcion || "Sin descripción disponible."}</p>
        </div>

        <!-- MAPA -->
        <div class="propiedad-mapa-wrap">
          <h2>Ubicación</h2>
          <div id="mapa"></div>
        </div>

      </div>

      <!-- COLUMNA DERECHA -->
      <div class="propiedad-right">
        <div class="propiedad-card-info">
          <span class="tag-tipo ${tipoCls}">${tipo}</span>
          <div class="propiedad-precio">${precio}</div>
          <h1 class="propiedad-titulo">${propiedad.titulo}</h1>
          <div class="propiedad-dir">📍 ${propiedad.direccion}</div>
          ${hab ? `<div class="propiedad-hab">${hab}</div>` : ""}

          <hr>

          <button class="chat-open-btn" onclick="contactar()">
            💬 Contactar con el anunciante
          </button>

          <a class="btn-whatsapp" href="${generarEnlaceWhatsapp()}" target="_blank" rel="noopener">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="20" height="20" alt="WhatsApp">
            Compartir en WhatsApp
          </a>

          <div class="propiedad-aviso">
            <p>🔒 Tus datos están protegidos</p>
            <p>✅ Anuncio verificado por HomeClick24</p>
          </div>
        </div>
      </div>

    </div>
  `;
}

/* ================================
   MAPA CON GEOCODING AUTOMÁTICO
================================ */
async function iniciarMapa() {
  let lat = propiedad.lat;
  let lng = propiedad.lng;

  // Si no tiene coordenadas, geocodifica la dirección
  if (!lat || !lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(propiedad.direccion)}&format=json&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.length) {
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon);
      }
    } catch (e) {
      console.warn("No se pudo geocodificar la dirección");
    }
  }

  if (!lat || !lng) return;

  if (mapa) mapa.remove();

  mapa = L.map("mapa").setView([lat, lng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  L.marker([lat, lng])
    .addTo(mapa)
    .bindPopup(propiedad.titulo)
    .openPopup();
}

/* ================================
   SLIDER
================================ */
function irFoto(i) {
  indexFoto = i;
  const img = document.querySelector(".slider-img");
  if (img) {
    img.src = fotos[i];
    img.onclick = () => abrirModal(fotos[i]);
  }
  const count = document.querySelector(".slider-count");
  if (count) count.textContent = `${i + 1} / ${fotos.length}`;
  document.querySelectorAll(".miniatura").forEach((m, idx) => {
    m.classList.toggle("active", idx === i);
  });
}

function nextFoto() { irFoto((indexFoto + 1) % fotos.length); }
function prevFoto()  { irFoto((indexFoto - 1 + fotos.length) % fotos.length); }

/* ================================
   MODAL
================================ */
function abrirModal(src) {
  const modal = document.getElementById("modal");
  const img   = document.getElementById("modal-img");
  img.src = src;
  modal.style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

/* ================================
   ERROR
================================ */
function mostrarError(msg) {
  document.getElementById("contenedor").innerHTML = `
    <div style="text-align:center;padding:60px">
      <h2>😕 ${msg}</h2>
      <a href="javascript:history.back()" style="color:#7cc242">← Volver</a>
    </div>`;
}

/* ================================
   CONTACTAR
================================ */
async function contactar() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const token   = localStorage.getItem("token");

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
  if (!res.ok || !data._id) { alert("No se pudo abrir el chat"); return; }
  window.location.href = `/chat.html?id=${data._id}`;
}

/* ================================
   WHATSAPP
================================ */
function generarEnlaceWhatsapp() {
  const texto = encodeURIComponent(
    `🏠 *${propiedad.titulo}*\n📍 ${propiedad.direccion}\n💶 ${propiedad.precio?.toLocaleString("es-ES")} €\n\n${window.location.href}`
  );
  return `https://wa.me/?text=${texto}`;
}