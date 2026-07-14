const SEO_ZONAS = {
  cadiz: {
    nombre: "Cádiz",
    nombreSeo: "Cádiz",
    filtro: "Cádiz",
    introVenta: "Busca viviendas en venta en Cádiz y compara anuncios reales publicados por particulares, agentes y agencias de la zona.",
    introAlquiler: "Consulta pisos y casas en alquiler en Cádiz con filtros útiles para encontrar una vivienda que encaje con tu presupuesto.",
  },
  "el-puerto-de-santa-maria": {
    nombre: "El Puerto de Santa María",
    nombreSeo: "El Puerto de Santa María",
    filtro: "El Puerto de Santa María",
    introVenta: "Explora pisos, casas y chalets en venta en El Puerto de Santa María, una zona con demanda residencial durante todo el año.",
    introAlquiler: "Encuentra alquileres en El Puerto de Santa María y revisa viviendas disponibles cerca de servicios, playas y conexiones.",
  },
  "jerez-de-la-frontera": {
    nombre: "Jerez de la Frontera",
    nombreSeo: "Jerez de la Frontera",
    filtro: "Jerez de la Frontera",
    introVenta: "Compara viviendas en venta en Jerez de la Frontera, desde pisos urbanos hasta casas familiares en barrios consolidados.",
    introAlquiler: "Revisa pisos y casas en alquiler en Jerez de la Frontera con anuncios actualizados y contacto directo desde HomeClick24.",
  },
  "sanlucar-de-barrameda": {
    nombre: "Sanlúcar de Barrameda",
    nombreSeo: "Sanlúcar de Barrameda",
    filtro: "Sanlúcar de Barrameda",
    introVenta: "Descubre propiedades en venta en Sanlúcar de Barrameda, una ciudad costera ideal para vivienda habitual o segunda residencia.",
    introAlquiler: "Busca alquileres en Sanlúcar de Barrameda y encuentra opciones para vivir cerca del centro, la playa o zonas tranquilas.",
  },
  rota: {
    nombre: "Rota",
    nombreSeo: "Rota",
    filtro: "Rota",
    introVenta: "Consulta viviendas en venta en Rota y encuentra anuncios de pisos, casas y apartamentos en una zona costera muy solicitada.",
    introAlquiler: "Explora pisos y casas en alquiler en Rota con filtros por precio, habitaciones y caracteristicas de la vivienda.",
  },
  chipiona: {
    nombre: "Chipiona",
    nombreSeo: "Chipiona",
    filtro: "Chipiona",
    introVenta: "Encuentra casas y pisos en venta en Chipiona, con propiedades para residencia habitual, vacaciones o inversion.",
    introAlquiler: "Mira viviendas en alquiler en Chipiona y localiza opciones disponibles para vivir cerca del mar y de los servicios diarios.",
  }
};

const SEO_ZONA_LINKS = Object.entries(SEO_ZONAS).map(([slug, zona]) => ({
  slug,
  nombre: zona.nombre
}));

function getSeoZoneContext() {
  const match = window.location.pathname.match(/^\/(comprar|alquiler)\/([^/?#]+)$/);
  if (!match) return null;

  const operacionPath = match[1];
  const slug = match[2];
  const zona = SEO_ZONAS[slug];
  if (!zona) return null;

  const esVenta = operacionPath === "comprar";
  return {
    slug,
    zona,
    operacionPath,
    tipoOperacion: esVenta ? "venta" : "alquiler",
    accion: esVenta ? "venta" : "alquiler",
    accionTitulo: esVenta ? "en venta" : "en alquiler",
    canonical: `https://www.homeclick24.com/${operacionPath}/${slug}`,
    title: `Pisos y casas ${esVenta ? "en venta" : "en alquiler"} en ${zona.nombreSeo} | HomeClick24`,
    description: esVenta
      ? `Encuentra viviendas en venta en ${zona.nombreSeo}. Pisos, casas y propiedades publicadas en HomeClick24.`
      : `Encuentra viviendas en alquiler en ${zona.nombreSeo}. Pisos, casas y propiedades disponibles en HomeClick24.`,
    intro: esVenta ? zona.introVenta : zona.introAlquiler,
    h1: `Pisos y casas ${esVenta ? "en venta" : "en alquiler"} en ${zona.nombreSeo}`,
    parentName: esVenta ? "Comprar" : "Alquiler",
    parentUrl: `https://www.homeclick24.com/${operacionPath}`
  };
}

function setMetaContent(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute("content", value);
}

function setCanonicalUrl(url) {
  let canonical = document.querySelector("link[rel='canonical']");
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function addJsonLd(id, data) {
  document.getElementById(id)?.remove();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function addBaseStructuredData() {
  addJsonLd("schema-organization", {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "HomeClick24",
    "url": "https://www.homeclick24.com/",
    "logo": "https://www.homeclick24.com/HomeClick-full.png"
  });

  addJsonLd("schema-website", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "HomeClick24",
    "url": "https://www.homeclick24.com/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.homeclick24.com/comprar?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });
}

function addZoneBreadcrumbSchema(context) {
  addJsonLd("schema-breadcrumb", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Inicio",
        "item": "https://www.homeclick24.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": context.parentName,
        "item": context.parentUrl
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": context.zona.nombreSeo,
        "item": context.canonical
      }
    ]
  });
}

function renderSeoZoneLinks(containerId, operacionPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = SEO_ZONA_LINKS.map(zona => `
    <a href="/${operacionPath}/${zona.slug}">${zona.nombre}</a>
  `).join("");
}

window.SEO_ZONAS = SEO_ZONAS;
window.SEO_ZONA_LINKS = SEO_ZONA_LINKS;
window.getSeoZoneContext = getSeoZoneContext;
window.addBaseStructuredData = addBaseStructuredData;
window.addZoneBreadcrumbSchema = addZoneBreadcrumbSchema;
window.renderSeoZoneLinks = renderSeoZoneLinks;
window.setMetaContent = setMetaContent;
window.setCanonicalUrl = setCanonicalUrl;
