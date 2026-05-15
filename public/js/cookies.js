document.addEventListener("DOMContentLoaded", () => {

  // comprobar si ya aceptó
  const aceptadas = localStorage.getItem("cookiesAceptadas");

  if (aceptadas) return;

  // crear banner
  const banner = document.createElement("div");

  banner.innerHTML = `
    <div class="cookie-box">
      <p>
        HomeClick24 utiliza cookies para mejorar tu experiencia.
        <a href="/legal.html#cookies">Más información</a>
      </p>

      <button id="aceptarCookies">
        Aceptar
      </button>
    </div>
  `;

  banner.classList.add("cookie-banner");

  document.body.appendChild(banner);

  // aceptar
  document
    .getElementById("aceptarCookies")
    .addEventListener("click", () => {

      localStorage.setItem("cookiesAceptadas", "true");

      banner.remove();
    });

});