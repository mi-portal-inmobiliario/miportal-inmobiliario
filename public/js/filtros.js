// =====================================
// filtros.js - versión profesional final
// =====================================

let propiedades = [];

// =====================================
// CARGAR PROPIEDADES (CON FILTROS BACKEND)
// =====================================
async function cargarPropiedades() {
  try {

    // Detectar modo (venta / alquiler)
    let tipo = "";
    if (window.location.pathname.includes("comprar")) {
      tipo = "venta";
    }
    if (window.location.pathname.includes("alquiler")) {
      tipo = "alquiler";
    }

    // Leer filtros
    const texto = document.getElementById("f_texto")?.value.trim();
    const min = document.getElementById("f_min")?.value;
    const max = document.getElementById("f_max")?.value;
    const hab = document.getElementById("f_hab")?.value;

    // Construir parámetros
    const params = new URLSearchParams();

    if (tipo) params.append("tipo", tipo);
    if (texto) params.append("texto", texto);
    if (min) params.append("min", min);
    if (max) params.append("max", max);
    if (hab) params.append("hab", hab);

    const url = "/propiedades?" + params.toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error("Error cargando propiedades");

    const data = await res.json();

    propiedades = data;
    renderLista(propiedades);

  } catch (err) {
    console.error(err);
    const cont = document.getElementById("lista");
    if (cont) {
      cont.innerHTML = "<p>Error cargando propiedades</p>";
    }
  }
}

// =====================================
// BOTÓN APLICAR FILTROS
// =====================================
function aplicarFiltros() {
  cargarPropiedades();
}

// =====================================
// RENDER LISTA
// =====================================
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

// =====================================
// ABRIR PROPIEDAD
// =====================================
function abrirPropiedad(id) {
  location.href = `/propiedad.html?id=${id}`;
}

// =====================================
// AUTO INIT AL CARGAR PÁGINA
// =====================================
document.addEventListener("DOMContentLoaded", () => {
  cargarPropiedades();
});
