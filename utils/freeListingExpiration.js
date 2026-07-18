import Propiedad from "../models/Propiedad.js";
import Usuario from "../models/Usuario.js";
import { calcularFechaExpiracionPlan } from "./planLimits.js";

function filtroAnunciosPublicosGratis(usuarioIds = []) {
  return {
    usuarioId: { $in: usuarioIds },
    visiblePublicamente: { $ne: false }
  };
}

export function filtroNoCaducado(now = new Date()) {
  return {
    $or: [
      { fechaExpiracion: { $exists: false } },
      { fechaExpiracion: null },
      { fechaExpiracion: { $gt: now } }
    ]
  };
}

export async function aplicarCaducidadAnunciosGratis(now = new Date()) {
  const usuariosGratis = await Usuario.find({ plan: "gratis" }, { _id: 1 }).lean();
  const usuarioIds = usuariosGratis.map(usuario => usuario._id);
  if (!usuarioIds.length) {
    return { revisados: 0, fechasNormalizadas: 0, caducados: 0 };
  }

  const fechaPorDefecto = propiedad => calcularFechaExpiracionPlan(
    "gratis",
    propiedad.createdAt || propiedad.updatedAt || now
  );

  const sinFecha = await Propiedad.find({
    ...filtroAnunciosPublicosGratis(usuarioIds),
    $or: [
      { fechaExpiracion: { $exists: false } },
      { fechaExpiracion: null }
    ]
  });

  let fechasNormalizadas = 0;
  for (const propiedad of sinFecha) {
    propiedad.fechaExpiracion = fechaPorDefecto(propiedad);
    await propiedad.save();
    fechasNormalizadas += 1;
  }

  const caducadas = await Propiedad.updateMany(
    {
      ...filtroAnunciosPublicosGratis(usuarioIds),
      fechaExpiracion: { $lte: now }
    },
    { $set: { visiblePublicamente: false } }
  );

  return {
    revisados: usuariosGratis.length,
    fechasNormalizadas,
    caducados: caducadas.modifiedCount || 0
  };
}
