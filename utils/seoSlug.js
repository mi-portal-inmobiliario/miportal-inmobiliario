export function crearSlugSeo(texto = "", maxLength = 80) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "") || "propiedad";
}

export function crearSlugPropiedad(propiedad = {}) {
  const id = String(propiedad._id || propiedad.id || "").trim();
  const slug = crearSlugSeo(propiedad.titulo || "propiedad");
  return id ? `${slug}-${id}` : slug;
}

export function crearRutaPropiedadSeo(propiedad = {}) {
  return `/propiedad/${crearSlugPropiedad(propiedad)}`;
}
