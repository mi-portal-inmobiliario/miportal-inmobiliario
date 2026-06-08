document.addEventListener("DOMContentLoaded", () => {
  const GA_ID = "G-K06Q40JXYL";

  function cargarGoogleAnalytics() {
    if (window.homeclickAnalyticsLoaded) return;
    window.homeclickAnalyticsLoaded = true;

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  const consentimiento = localStorage.getItem("cookiesConsent");

  if (consentimiento === "accepted") {
    cargarGoogleAnalytics();
    return;
  }

  if (consentimiento === "rejected") return;

  // crear banner
  const banner = document.createElement("div");

  banner.innerHTML = `
    <div class="cookie-box">
      <p>
        HomeClick24 utiliza cookies para mejorar tu experiencia.
        <a href="/legal.html#cookies">Más información</a>
      </p>

      <div class="cookie-actions">
        <button id="rechazarCookies" class="cookie-btn-secondary">Rechazar</button>
        <button id="aceptarCookies">Aceptar</button>
      </div>
    </div>
  `;

  banner.classList.add("cookie-banner");

  document.body.appendChild(banner);

  // aceptar
  document
    .getElementById("aceptarCookies")
    .addEventListener("click", () => {

      localStorage.setItem("cookiesAceptadas", "true");
      localStorage.setItem("cookiesConsent", "accepted");

      cargarGoogleAnalytics();
      banner.remove();
    });

  document
    .getElementById("rechazarCookies")
    .addEventListener("click", () => {
      localStorage.setItem("cookiesConsent", "rejected");
      localStorage.removeItem("cookiesAceptadas");
      banner.remove();
    });

});
