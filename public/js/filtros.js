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
    const sort  = document.getElementById("f_sort")?.value;

    const params = new URLSearchParams();
    if (tipo)   params.append("tipo", tipo);
    if (texto)  params.append("texto", texto);
    if (min)    params.append("min", min);
    if (max)    params.append("max", max);
    if (hab)    params.append("hab", hab);

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
    const hab = p.habitaciones ? `🛏 ${p.habitaciones} hab.` : "";
    const tipo = p.tipoOperacion === "venta" ? "Venta" : "Alquiler";
    const tipoCls = p.tipoOperacion === "venta" ? "tag-venta" : "tag-alquiler";

    return `
      <div class="card-propiedad" onclick="abrirPropiedad('${p._id}')">
        <div class="card-img-wrap">
          <img src="${img}" alt="${p.titulo}" loading="lazy">
          <span class="tag-tipo ${tipoCls}">${tipo}</span>
        </div>
        <div class="card-body">
          <div class="card-precio">${precio}</div>
          <div class="card-titulo">${p.titulo}</div>
          <div class="card-direccion">📍 ${p.direccion}</div>
          ${hab ? `<div class="card-hab">${hab}</div>` : ""}
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
  ["f_hab", "f_sort"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
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

