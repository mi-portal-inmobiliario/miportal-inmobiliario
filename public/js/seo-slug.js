function crearSlugSeo(texto = "", maxLength = 80) {
  const normalizado = String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return normalizado || "propiedad";
}

function crearSlugPropiedad(propiedad = {}) {
  const id = String(propiedad._id || propiedad.id || "").trim();
  const slug = crearSlugSeo(propiedad.titulo || "propiedad");
  return id ? `${slug}-${id}` : slug;
}

function getPropiedadSeoUrl(propiedad = {}) {
  const id = String(propiedad._id || propiedad.id || "").trim();
  if (!id) return "/propiedad";
  return `/propiedad/${crearSlugPropiedad(propiedad)}`;
}

function getPropiedadIdFromLocation() {
  const idQuery = new URLSearchParams(window.location.search).get("id");
  if (idQuery) return idQuery;

  const match = window.location.pathname.match(/^\/propiedad\/.+-([a-f0-9]{24})$/i);
  return match ? match[1] : "";
}

window.crearSlugSeo = crearSlugSeo;
window.crearSlugPropiedad = crearSlugPropiedad;
window.getPropiedadSeoUrl = getPropiedadSeoUrl;
window.getPropiedadIdFromLocation = getPropiedadIdFromLocation;
