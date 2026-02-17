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

    // 🔥 CAMPO CORRECTO SEGÚN TU MODELO
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
// ABRIR PROPIEDAD
// ================================
function abrirPropiedad(id) {
  location.href = `/propiedad.html?id=${id}`;
}
