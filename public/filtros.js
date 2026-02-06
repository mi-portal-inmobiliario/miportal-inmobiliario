// ================================
// filtros.js - Comprar / Alquiler
// ================================

let propiedades = [];
let modoActual = "venta";

// =====================================
// CARGAR PROPIEDADES
// =====================================
async function cargarPropiedades(modo = "venta") {
  modoActual = modo;

  try {
    const res = await fetch("/propiedades");
    if (!res.ok) throw new Error("Error servidor");

    const todas = await res.json();

    // Filtrar por tipo de operación
    propiedades = todas.filter(p => p.tipoOperacion === modoActual);

    // Aplicar filtros desde URL si existen
    aplicarFiltrosDesdeURL();

    // Render inicial
    renderLista(propiedades);

  } catch (err) {
    console.error("Error cargando propiedades:", err);
    mostrarError("No se pudieron cargar las propiedades");
  }
}

// =====================================
// MOSTRAR LISTA
// =====================================
function renderLista(lista) {
  const cont = document.getElementById("lista");
  if (!cont) return;

  cont.innerHTML = "";

  if (!lista.length) {
    cont.innerHTML = `<h3>No se encontraron resultados</h3>`;
    return;
  }

  lista.forEach(p => {
    const img = p.imagenes?.[0] || "https://via.placeholder.com/400x200?text=Sin+imagen";

    cont.insertAdjacentHTML("beforeend", `
      <div class="item" onclick="abrirPropiedad('${p._id}')">
        <img src="${img}" alt="Foto propiedad">
        <div class="info">
          <div class="precio">${Number(p.precio).toLocaleString()} €</div>
          <div class="direccion">${p.direccion || ""}</div>
        </div>
      </div>
    `);
  });
}

// =====================================
// ABRIR PROPIEDAD
// =====================================
function abrirPropiedad(id) {
  window.location.href = `/propiedad.html?id=${id}`;
}

// =====================================
// APLICAR FILTROS MANUALES
// =====================================
function aplicarFiltros() {
  let lista = [...propiedades];

  const texto = document.getElementById("f_texto")?.value.toLowerCase() || "";
  const min = Number(document.getElementById("f_min")?.value);
  const max = Number(document.getElementById("f_max")?.value);
  const hab = Number(document.getElementById("f_hab")?.value);

  if (texto) {
    lista = lista.filter(p =>
      (p.direccion || "").toLowerCase().includes(texto) ||
      (p.titulo || "").toLowerCase().includes(texto)
    );
  }

  if (min) lista = lista.filter(p => p.precio >= min);
  if (max) lista = lista.filter(p => p.precio <= max);
  if (hab) lista = lista.filter(p => (p.habitaciones || 0) >= hab);

  renderLista(lista);
}

// =====================================
// FILTROS DESDE URL (INDEX → COMPRAR)
// =====================================
function aplicarFiltrosDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const texto = params.get("search");

  if (!texto) return;

  const input = document.getElementById("f_texto");
  if (input) input.value = texto;

  propiedades = propiedades.filter(p =>
    (p.direccion || "").toLowerCase().includes(texto.toLowerCase()) ||
    (p.titulo || "").toLowerCase().includes(texto.toLowerCase())
  );
}

// =====================================
// ERRORES
// =====================================
function mostrarError(msg) {
  const cont = document.getElementById("lista");
  if (cont) cont.innerHTML = `<h3>${msg}</h3>`;
}
