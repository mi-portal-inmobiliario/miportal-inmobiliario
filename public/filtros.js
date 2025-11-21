// ================================
// filtros.js - Comprar / Alquiler
// ================================

// Lista completa de propiedades cargadas del servidor
let propiedades = [];

// Tipo de operación actual (venta / alquiler)
let modoActual = "venta";


// =====================================
// 1) CARGAR PROPIEDADES SEGÚN MODO
// =====================================
async function cargarPropiedades(modo = "venta") {
    modoActual = modo;

    try {
        const res = await fetch("/propiedades");
        const todas = await res.json();

        // Filtrar únicamente por tipoOperacion
        propiedades = todas.filter(p => p.tipoOperacion === modo);

        // Aplicar filtros si vienen por URL
        leerFiltrosURL();

        renderLista(propiedades);
    } catch (err) {
        console.error("Error cargando propiedades:", err);
    }
}


// =====================================
// 2) MOSTRAR LISTA DE PROPIEDADES
// =====================================
function renderLista(lista) {
    const cont = document.getElementById("lista");
    cont.innerHTML = "";

    if (lista.length === 0) {
        cont.innerHTML = `<h3>No se encontraron resultados</h3>`;
        return;
    }

    lista.forEach(p => {
        const img = p.imagenes?.[0] || "https://via.placeholder.com/400x200?text=Sin+imagen";

        cont.innerHTML += `
        <div class="item" onclick="abrirPropiedad('${p._id}')">
            <img src="${img}" alt="Foto propiedad">
            <div class="info">
                <div class="precio">${p.precio.toLocaleString()} €</div>
                <div class="direccion">${p.direccion}</div>
            </div>
        </div>`;
    });
}


// =====================================
// 3) ABRIR PROPIEDAD
// =====================================
function abrirPropiedad(id) {
    window.location.href = `propiedad.html?id=${id}`;
}


// =====================================
// 4) APLICAR FILTROS
// =====================================
function aplicarFiltros() {
    let lista = [...propiedades];

    const texto = document.getElementById("f_texto").value.toLowerCase();
    const min = Number(document.getElementById("f_min").value);
    const max = Number(document.getElementById("f_max").value);
    const hab = Number(document.getElementById("f_hab").value);

    // Filtro por texto
    if (texto) {
        lista = lista.filter(p =>
            (p.direccion || "").toLowerCase().includes(texto) ||
            (p.titulo || "").toLowerCase().includes(texto)
        );
    }

    // Filtro precio mínimo
    if (min) lista = lista.filter(p => p.precio >= min);

    // Filtro precio máximo
    if (max) lista = lista.filter(p => p.precio <= max);

    // Filtro habitaciones (cuando lo añadas al servidor)
    if (hab) lista = lista.filter(p => (p.habitaciones || 0) >= hab);

    renderLista(lista);
}


// =========================================================
// 5) LEER FILTROS DESDE URL (para búsquedas desde index)
// =========================================================
function leerFiltrosURL() {
    const params = new URLSearchParams(window.location.search);

    const texto = params.get("search");
    const modo = params.get("modo");

    // Si viene modo desde alquiler.html → "alquiler"
    if (modo === "alquiler") modoActual = "alquiler";

    // Si viene búsqueda desde index.html
    if (texto) {
        const input = document.getElementById("f_texto");
        input.value = texto;
    }
}


// =========================================================
// 6) EJECUTAR AUTOMÁTICO SEGÚN LA PÁGINA
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);

    const modo = params.get("modo") || "venta";

    cargarPropiedades(modo);
});
