import Usuario from "../models/Usuario.js";
import Propiedad from "../models/Propiedad.js";
import { enviarCorreo } from "./email.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function ensureTrialReminders(usuario) {
  usuario.trialReminders = {
    sevenDays: usuario.trialReminders?.sevenDays || false,
    threeDays: usuario.trialReminders?.threeDays || false,
    lastDay: usuario.trialReminders?.lastDay || false,
    expired: usuario.trialReminders?.expired || false
  };
}

function getReminderStage(usuario, now) {
  const end = usuario.trialEndDate?.getTime();
  if (!end) return null;

  const diffMs = end - now.getTime();
  if (diffMs <= 0) return "expired";
  if (diffMs <= DAY_MS) return "lastDay";
  if (diffMs <= 3 * DAY_MS) return "threeDays";
  if (diffMs <= 7 * DAY_MS) return "sevenDays";
  return null;
}

function getTrialEmail(usuario, stage) {
  const nombre = usuario.nombre || "Hola";
  const fechaFin = usuario.trialEndDate
    ? usuario.trialEndDate.toLocaleDateString("es-ES")
    : "";

  const emails = {
    sevenDays: {
      subject: "Tu prueba VIP termina en 7 días",
      html: `<p>${nombre}, tu prueba gratuita VIP de HomeClick24 termina el ${fechaFin}.</p><p>Puedes seguir disfrutando de las ventajas VIP hasta esa fecha.</p>`
    },
    threeDays: {
      subject: "Tu prueba VIP termina en 3 días",
      html: `<p>${nombre}, tu prueba gratuita VIP de HomeClick24 termina en 3 días, el ${fechaFin}.</p><p>Cuando expire, tus anuncios se conservarán pero dejarán de ser visibles públicamente.</p>`
    },
    lastDay: {
      subject: "Último día de tu prueba VIP",
      html: `<p>${nombre}, hoy es el último día de tu prueba gratuita VIP de HomeClick24.</p><p>Al finalizar, tu cuenta pasará al plan gratis y tus anuncios se conservarán ocultos al público.</p>`
    },
    expired: {
      subject: "Tu prueba VIP ha finalizado",
      html: `<p>${nombre}, tu prueba gratuita VIP de HomeClick24 ha finalizado.</p><p>Tu cuenta ha pasado al plan gratis. Tus anuncios no se han borrado, pero ya no son visibles públicamente.</p>`
    }
  };

  return emails[stage];
}

async function sendTrialReminder(usuario, stage, mailer = enviarCorreo) {
  ensureTrialReminders(usuario);
  if (!stage || usuario.trialReminders[stage]) return false;
  if (!usuario.email) return false;

  const email = getTrialEmail(usuario, stage);
  const ok = await mailer(usuario.email, email.subject, email.html);
  if (!ok) return false;

  usuario.trialReminders[stage] = true;
  if (stage !== "expired") usuario.trialReminderSent = true;
  await usuario.save();
  return true;
}

export async function sendVipTrialReminders(now = new Date(), mailer = enviarCorreo) {
  const usuarios = await Usuario.find({
    trialAccepted: true,
    trialEndDate: { $exists: true, $ne: null },
    $or: [
      { plan: "vip_trial", planActivo: true },
      { "trialReminders.expired": { $ne: true } }
    ]
  });

  let enviados = 0;

  for (const usuario of usuarios) {
    const stage = getReminderStage(usuario, now);
    if (!stage) continue;
    if (stage === "expired" && usuario.plan === "vip_trial") continue;
    if (stage !== "expired" && usuario.plan !== "vip_trial") continue;
    if (await sendTrialReminder(usuario, stage, mailer)) enviados += 1;
  }

  return enviados;
}

export async function expireVipTrials(now = new Date(), mailer = enviarCorreo) {
  const expirados = await Usuario.find({
    plan: "vip_trial",
    trialAccepted: true,
    trialEndDate: { $lte: now }
  });

  for (const usuario of expirados) {
    await sendTrialReminder(usuario, "expired", mailer);

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

  sendVipTrialReminders().catch(err => {
    console.error("❌ Error enviando recordatorios VIP Trial:", err.message);
  });

  expireVipTrials().catch(err => {
    console.error("❌ Error expirando pruebas VIP:", err.message);
  });

  return setInterval(() => {
    sendVipTrialReminders().catch(err => {
      console.error("❌ Error enviando recordatorios VIP Trial:", err.message);
    });

    expireVipTrials().catch(err => {
      console.error("❌ Error expirando pruebas VIP:", err.message);
    });
  }, intervalMs);
}
