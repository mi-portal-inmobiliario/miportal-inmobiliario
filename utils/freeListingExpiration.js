import Propiedad from "../models/Propiedad.js";
import Usuario from "../models/Usuario.js";
import { calcularFechaExpiracionPlan } from "./planLimits.js";

function filtroAnunciosPublicosGratis(usuarioIds = []) {
  return {
    usuarioId: { $in: usuarioIds },
    visiblePublicamente: { $ne: false }
  };
}

function filtroUsuariosConHistorialVipTrial() {
  return {
    $or: [
      { trialStartDate: { $exists: true, $ne: null } },
      { trialEndDate: { $exists: true, $ne: null } },
      { trialLimitsAppliedAt: { $exists: true, $ne: null } },
      { trialLimitsRepairedAt: { $exists: true, $ne: null } },
      { "trialReminders.expired": true }
    ]
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

  const usuariosGratisSinHistorialVip = await Usuario.find(
    { plan: "gratis", $nor: [filtroUsuariosConHistorialVipTrial()] },
    { _id: 1 }
  ).lean();
  const usuarioIdsSinHistorialVip = usuariosGratisSinHistorialVip.map(usuario => usuario._id);

  const fechaPorDefecto = propiedad => calcularFechaExpiracionPlan(
    "gratis",
    propiedad.createdAt || propiedad.updatedAt || now
  );

  const sinFecha = await Propiedad.find({
    ...filtroAnunciosPublicosGratis(usuarioIdsSinHistorialVip),
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
