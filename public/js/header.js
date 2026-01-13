console.log("✅ header.js cargado");

document.addEventListener("DOMContentLoaded", () => {
  alert("HEADER JS SE EJECUTA");

  const cont = document.getElementById("main-header");
  if (!cont) {
    alert("❌ NO EXISTE #main-header");
    return;
  }

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (!usuario) {
    cont.innerHTML = `
      <header style="padding:15px; background:white; display:flex; justify-content:space-between">
        <strong>Costa Hogar</strong>
        <a href="login.html">Iniciar sesión</a>
      </header>
    `;
    return;
  }

  cont.innerHTML = `
    <header style="padding:15px; background:white; display:flex; justify-content:space-between">
      <strong>Costa Hogar</strong>
      <div>
        ${usuario.nombre}
        <button id="logout">Salir</button>
      </div>
    </header>
  `;

  document.getElementById("logout").onclick = () => {
    localStorage.clear();
    location.reload();
  };
});
