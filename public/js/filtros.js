// ================================
// filtros.js - Comprar / Alquiler
// ================================

let propiedades = [];

// ================================
// CARGAR PROPIEDADES
// ================================
async function cargarPropiedades(modo = "venta") {
  try {
    const res = await fetch("/propiedades");
    if (!res.ok) throw new Error("Error cargando propiedades");

    const todas = await res.json();

    propiedades = todas.filter(p => p.tipoOperacion === modo);
    renderLista(propiedades);

  } catch (err) {
    console.error(err);
    document.getElementById("lista").innerHTML =
      "<p>Error cargando propiedades</p>";
  }
}

// ================================
// RENDER LISTA
// ================================
function renderLista(lista) {
  const cont = document.getElementById("lista");
  if (!cont) return;

  cont.innerHTML = "";

  if (!lista.length) {
    cont.innerHTML = "<h3>No hay resultados</h3>";
    return;
  }

  lista.forEach(p => {
    const img = p.imagenes?.[0] ||
      "https://via.placeholder.com/400x200?text=Sin+imagen";

    cont.innerHTML += `
      <div class="item" onclick="abrirPropiedad('${p._id}')">
        <img src="${img}" alt="Propiedad">
        <div class="info">
          <div class="precio">${p.precio} €</div>
          <div class="direccion">${p.direccion}</div>
        </div>
      </div>
    `;
  });
}

// ================================
// ABRIR DETALLE
// ================================
function abrirPropiedad(id) {
  location.href = `/propiedad.html?id=${id}`;
}

// ================================
// FILTROS
// ================================
function aplicarFiltros() {
  let lista = [...propiedades];

  const texto = document.getElementById("f_texto").value.toLowerCase();
  const min = Number(document.getElementById("f_min").value);
  const max = Number(document.getElementById("f_max").value);

  if (texto) {
    lista = lista.filter(p =>
      p.titulo.toLowerCase().includes(texto) ||
      p.direccion.toLowerCase().includes(texto)
    );
  }

  if (min) lista = lista.filter(p => p.precio >= min);
  if (max) lista = lista.filter(p => p.precio <= max);

  renderLista(lista);
}

// ================================
// AUTO-INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const modo = location.pathname.includes("alquiler")
    ? "alquiler"
    : "venta";

  cargarPropiedades(modo);
});
