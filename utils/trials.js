import Usuario from "../models/Usuario.js";
import Propiedad from "../models/Propiedad.js";

export async function expireVipTrials(now = new Date()) {
  const expirados = await Usuario.find({
    plan: "vip_trial",
    trialAccepted: true,
    trialEndDate: { $lte: now }
  });

  for (const usuario of expirados) {
    usuario.plan = "gratis";
    usuario.planActivo = false;
    usuario.planFechaFin = null;
    await usuario.save();

    await Propiedad.updateMany(
      { usuarioId: usuario._id },
      { visiblePublicamente: false }
    );
  }

  return expirados.length;
}

export function scheduleVipTrialExpiration() {
  const intervalMs = 6 * 60 * 60 * 1000;

  expireVipTrials().catch(err => {
    console.error("❌ Error expirando pruebas VIP:", err.message);
  });

  return setInterval(() => {
    expireVipTrials().catch(err => {
      console.error("❌ Error expirando pruebas VIP:", err.message);
    });
  }, intervalMs);
}
