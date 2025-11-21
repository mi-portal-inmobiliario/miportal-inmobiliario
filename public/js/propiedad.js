/* propiedad.js */

let propiedad = null;
let fotos = [];
let indexFoto = 0;
let favoritos = JSON.parse(localStorage.getItem("favoritos") || "[]");

const API_KEY = "691dbf7ce0ac5786669402bgm8f835e"; 


/* ===============================
   CARGAR PROPIEDAD
================================ */
async function cargarPropiedad() {
  const id = new URLSearchParams(location.search).get("id");
  const res = await fetch("/propiedades");
  const data = await res.json();

  propiedad = data.find(p => p._id === id);

  if (!propiedad) {
    document.getElementById("contenedor").innerHTML = "<h2>Propiedad no encontrada</h2>";
    return;
  }

  fotos = propiedad.imagenes.length ? propiedad.imagenes : [
    "https://via.placeholder.com/1200x700?text=Sin+Imagen"
  ];

  renderPropiedad();
  iniciarSlider();
  generarMiniaturas();
  iniciarMapa();
  actualizarFavoritoUI();
}


/* ===============================
   RENDERIZAR PROPIEDAD
================================ */
function renderPropiedad() {
  const html = `
    <div class="slider-container" id="slider">
      ${fotos.map((f,i)=>`<img src="${f}" class="${i===0?'activa':''}">`).join("")}

      <div class="flecha flecha-izq" onclick="cambiarFoto(-1)">&#10094;</div>
      <div class="flecha flecha-der" onclick="cambiarFoto(1)">&#10095;</div>

      <div class="favorito-detalle" onclick="toggleFavorito()" id="favBtn">🤍</div>
    </div>

    <div class="miniaturas" id="miniaturas"></div>

    <h1>${propiedad.titulo}</h1>
    <p class="price">${propiedad.precio} €</p>
    <p><strong>Dirección:</strong> ${propiedad.direccion}</p>
    <p><strong>Descripción:</strong> ${propiedad.descripcion || "Sin información"}</p>

    <h2>Ubicación</h2>
    <div id="mapa"></div>

    <br>
    <a class="volver-btn" href="index.html">⬅ Volver</a>
  `;

  document.getElementById("contenedor").innerHTML = html;
}


/* ===============================
   SLIDER & MINIATURAS
================================ */
function iniciarSlider() {
  setInterval(() => cambiarFoto(1), 5000);
}

function cambiarFoto(dir) {
  const imgs = document.querySelectorAll("#slider img");

  imgs[indexFoto].classList.remove("activa");
  indexFoto = (indexFoto + dir + imgs.length) % imgs.length;
  imgs[indexFoto].classList.add("activa");

  marcarMiniatura();
}

function generarMiniaturas() {
  const mini = document.getElementById("miniaturas");
  mini.innerHTML = "";

  fotos.forEach((f, i) => {
    const img = document.createElement("img");
    img.src = f;
    if (i === 0) img.classList.add("activa");

    img.addEventListener("click", () => {
      indexFoto = i;
      document.querySelectorAll("#slider img").forEach(img => img.classList.remove("activa"));
      document.querySelectorAll("#slider img")[i].classList.add("activa");
      marcarMiniatura();
    });

    img.addEventListener("dblclick", () => abrirModal(f));

    mini.appendChild(img);
  });
}

function marcarMiniatura() {
  document.querySelectorAll(".miniaturas img")
    .forEach((img, i) => img.classList.toggle("activa", i === indexFoto));
}


/* ===============================
   MODAL FULLSCREEN
================================ */
function abrirModal(src) {
  document.getElementById("modal-img").src = src;
  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}


/* ===============================
   FAVORITOS
================================ */
function toggleFavorito() {
  const id = propiedad._id;

  if (favoritos.includes(id)) {
    favoritos = favoritos.filter(f => f !== id);
  } else {
    favoritos.push(id);
  }

  localStorage.setItem("favoritos", JSON.stringify(favoritos));
  actualizarFavoritoUI();
}

function actualizarFavoritoUI() {
  const fav = document.getElementById("favBtn");
  fav.textContent = favoritos.includes(propiedad._id) ? "❤️" : "🤍";
}


/* ===============================
   MAPA
================================ */
async function iniciarMapa() {
  let lat = propiedad.lat;
  let lng = propiedad.lng;

  if (!lat || !lng) {
    console.warn("No hay coordenadas → usando geocoding...");

    const url = `https://geocode.maps.co/search?q=${encodeURIComponent(propiedad.direccion)}&api_key=${API_KEY}`;
    const r = await fetch(url);
    const d = await r.json();

    if (d.length) {
      lat = Number(d[0].lat);
      lng = Number(d[0].lon);
    } else {
      document.getElementById("mapa").innerHTML = "<p>No se pudo cargar el mapa.</p>";
      return;
    }
  }

  const mapa = L.map("mapa").setView([lat, lng], 15);

  setTimeout(() => mapa.invalidateSize(), 300);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(mapa);

  L.marker([lat, lng]).addTo(mapa).bindPopup(propiedad.direccion).openPopup();
}


/* INICIAR TODO */
cargarPropiedad();
