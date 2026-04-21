let propiedades = [];

// =====================================
// CARGAR PROPIEDADES
// =====================================
async function cargarPropiedades() {
  const lista = document.getElementById("lista");
  if (lista) lista.innerHTML = `<div class="loading">Cargando propiedades...</div>`;

  try {
    let tipo = "";
    if (window.location.pathname.includes("comprar")) tipo = "venta";
    if (window.location.pathname.includes("alquiler")) tipo = "alquiler";

    const texto = document.getElementById("f_texto")?.value.trim();
    const min   = document.getElementById("f_min")?.value;
    const max   = document.getElementById("f_max")?.value;
    const hab   = document.getElementById("f_hab")?.value;
    const sort       = document.getElementById("f_sort")?.value;
    const banos      = document.getElementById("f_banos")?.value;
    const supMin     = document.getElementById("f_sup_min")?.value;
    const supMax     = document.getElementById("f_sup_max")?.value;
    const tipoInmueble = document.getElementById("f_tipo_inmueble")?.value;
    const estado     = document.getElementById("f_estado")?.value;
    const garaje     = document.getElementById("f_garaje")?.checked;
    const piscina    = document.getElementById("f_piscina")?.checked;
    const terraza    = document.getElementById("f_terraza")?.checked;

    const params = new URLSearchParams();
    if (tipo)         params.append("tipo", tipo);
    if (texto)        params.append("texto", texto);
    if (min)          params.append("min", min);
    if (max)          params.append("max", max);
    if (hab)          params.append("hab", hab);
    if (banos)        params.append("banos", banos);
    if (supMin)       params.append("sup_min", supMin);
    if (supMax)       params.append("sup_max", supMax);
    if (tipoInmueble) params.append("tipoInmueble", tipoInmueble);
    if (estado)       params.append("estado", estado);
    if (garaje)       params.append("garaje", "true");
    if (piscina)      params.append("piscina", "true");
    if (terraza)      params.append("terraza", "true");

    const res = await fetch("/propiedades?" + params.toString());
    if (!res.ok) throw new Error("Error");

    let data = await res.json();

    // Ordenación en frontend
    if (sort === "precio_asc")  data.sort((a, b) => a.precio - b.precio);
    if (sort === "precio_desc") data.sort((a, b) => b.precio - a.precio);

    propiedades = data;

    const count = document.getElementById("resultado-count");
    if (count) count.textContent = `${data.length} resultado${data.length !== 1 ? "s" : ""}`;

    renderLista(propiedades);

  } catch (err) {
    console.error(err);
    if (lista) lista.innerHTML = "<p class='error-msg'>Error cargando propiedades</p>";
  }
}

// =====================================
// RENDER TARJETAS
// =====================================
function renderLista(lista) {
  const cont = document.getElementById("lista");
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML = `
      <div class="no-resultados">
        <p>😕 No hay propiedades con estos filtros</p>
        <button onclick="resetFiltros()">Limpiar filtros</button>
      </div>`;
    return;
  }

  cont.innerHTML = lista.map(p => {
    const img = p.imagenes?.[0] || "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600";
    const precio = p.precio?.toLocaleString("es-ES") + " €";
    const hab        = p.habitaciones ? `🛏 ${p.habitaciones} hab.` : "";
    const banos      = p.banos ? `🚿 ${p.banos} baño${p.banos > 1 ? "s" : ""}` : "";
    const superficie = p.superficie ? `📐 ${p.superficie} m²` : "";
    const extras     = [
      p.garaje  ? "🚗 Garaje"  : "",
      p.piscina ? "🏊 Piscina" : "",
      p.terraza ? "🌿 Terraza" : ""
    ].filter(Boolean).join(" · ");
    const tipo = p.tipoOperacion === "venta" ? "Venta" : "Alquiler";
    const tipoCls = p.tipoOperacion === "venta" ? "tag-venta" : "tag-alquiler";

   return `
    <div class="card-propiedad" onclick="abrirPropiedad('${p._id}')">
      <div class="card-img-wrap">
        <img src="${img}" alt="${p.titulo}" loading="lazy">
        <span class="tag-tipo ${tipoCls}">${tipo}</span>
        <button class="btn-fav" onclick="toggleFavorito(event, '${p._id}', this)">🤍</button>
      </div>
      <div class="card-body">
        <div class="card-precio">${precio}</div>
        <div class="card-titulo">${p.titulo}</div>
        <div class="card-direccion">📍 ${p.direccion}</div>
        ${hab || banos || superficie ? `
          <div class="card-hab">
            ${hab} ${banos} ${superficie}
          </div>` : ""}
        ${extras ? `<div class="card-extras" style="font-size:0.8rem;color:#888;margin-top:4px;">${extras}</div>` : ""}
      </div>
    </div>
  `;
  }).join("");
}

// =====================================
// RESET FILTROS
// =====================================
function resetFiltros() {
  ["f_texto", "f_min", "f_max"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  ["f_hab", "f_sort", "f_banos", "f_tipo_inmueble", "f_estado"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  ["f_sup_min", "f_sup_max"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  ["f_garaje", "f_piscina", "f_terraza"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  
  cargarPropiedades();
}

// =====================================
// TOGGLE FILTROS MÓVIL
// =====================================
function toggleFiltrosMobile() {
  const filtros = document.querySelector(".filtros");
  if (filtros) filtros.classList.toggle("open");
}

// =====================================
// ABRIR PROPIEDAD
// =====================================
function abrirPropiedad(id) {
  location.href = "/propiedad.html?id=" + id;
}

// =====================================
// INIT
// =====================================
document.addEventListener("DOMContentLoaded", cargarPropiedades);
window.cargarPropiedades = cargarPropiedades;
window.resetFiltros = resetFiltros;

// =====================================
// TOGGLE FAVORITO
// =====================================
async function toggleFavorito(e, propiedadId, btn) {
  e.stopPropagation();
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
  const token   = localStorage.getItem("token");

  if (!usuario || !token) {
    location.href = "/login.html";
    return;
  }

  const esFav = btn.textContent === "❤️";
  const method = esFav ? "DELETE" : "POST";

  await fetch(`/usuarios/${usuario._id}/favoritos/${propiedadId}`, {
    method,
    headers: { "Authorization": "Bearer " + token }
  });

  btn.textContent = esFav ? "🤍" : "❤️";
}

