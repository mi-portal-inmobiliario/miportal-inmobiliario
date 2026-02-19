// ================================
// filtros.js - versión profesional
// ================================

let modoActual = "venta";

// ================================
// CARGAR PROPIEDADES
// ================================
async function cargarPropiedades() {
  const texto = document.getElementById("f_texto")?.value || "";
  const min = document.getElementById("f_min")?.value || "";
  const max = document.getElementById("f_max")?.value || "";
  const hab = document.getElementById("f_hab")?.value || "";

  const params = new URLSearchParams();

  params.append("tipo", modoActual);

  if (texto) params.append("texto", texto);
  if (min) params.append("min", min);
  if (max) params.append("max", max);
  if (hab) params.append("hab", hab);

  try {
    const res = await fetch(`/propiedades?${params.toString()}`);
    if (!res.ok) throw new Error("Error cargando propiedades");

    const propiedades = await res.json();

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
          <div>${p.habitaciones || 0} habitaciones</div>
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

// ================================
// AUTO INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("comprar")) {
    modoActual = "venta";
  }

  if (window.location.pathname.includes("alquiler")) {
    modoActual = "alquiler";
  }

  cargarPropiedades();
});
