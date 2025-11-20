let propiedades = [];
let modoActual = "venta";

async function cargarPropiedades(modo = "venta") {
    modoActual = modo;

    const res = await fetch("/propiedades");
    const todas = await res.json();

    // Filtrar por tipoOperacion
    propiedades = todas.filter(p => p.tipoOperacion === modo);

    renderLista(propiedades);
}

function renderLista(lista) {
    const cont = document.getElementById("lista");
    cont.innerHTML = "";

    if (lista.length === 0) {
        cont.innerHTML = "<h3>No se encontraron resultados</h3>";
        return;
    }

    lista.forEach(p => {
        const img = p.imagenes?.[0] || "https://via.placeholder.com/400x200?text=Sin+imagen";

        cont.innerHTML += `
        <div class="item" onclick="abrirPropiedad('${p._id}')">
            <img src="${img}" alt="foto propiedad">
            <div class="info">
                <div class="precio">${p.precio} €</div>
                <div class="direccion">${p.direccion}</div>
            </div>
        </div>`;
    });
}

function abrirPropiedad(id) {
    window.location.href = `propiedad.html?id=${id}`;
}

function aplicarFiltros() {
    let lista = [...propiedades];

    const texto = document.getElementById("f_texto").value.toLowerCase();
    const min = Number(document.getElementById("f_min").value);
    const max = Number(document.getElementById("f_max").value);
    const hab = Number(document.getElementById("f_hab").value);

    if (texto) {
        lista = lista.filter(p =>
            p.direccion.toLowerCase().includes(texto) ||
            p.titulo.toLowerCase().includes(texto)
        );
    }

    if (min) lista = lista.filter(p => p.precio >= min);
    if (max) lista = lista.filter(p => p.precio <= max);

    // si en el futuro agregas habitaciones:
    if (hab) lista = lista.filter(p => (p.habitaciones || 0) >= hab);

    renderLista(lista);
}
