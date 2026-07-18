import crypto from "crypto";
import CodigoVipTrial from "../models/CodigoVipTrial.js";
import { crearDatosVipTrial, usuarioTieneStripeActivo } from "./trials.js";

const CODE_PREFIX = "HC24-VIP";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ERROR_MESSAGES = {
  invalid: "Código no válido.",
  expired: "Código caducado.",
  used: "Código ya utilizado.",
  cancelled: "Este código está cancelado o ya no está disponible.",
  email_mismatch: "Este código pertenece a otro email.",
  stripe_active: "No se puede aplicar porque ya tienes una suscripción activa.",
  trial_already_used: "No se puede aplicar porque ya disfrutaste una prueba VIP."
};

export function normalizarCodigoVipTrial(code = "") {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function generarSufijoCodigo(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export async function generarCodigoVipTrial({
  emailAsignado,
  nombreAsignado,
  notaInterna,
  diasValidez = 30,
  creadoPorAdmin
} = {}) {
  const dias = Math.min(Math.max(Number(diasValidez) || 30, 1), 365);
  const expiresAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  for (let intento = 0; intento < 8; intento++) {
    const code = `${CODE_PREFIX}-${generarSufijoCodigo()}`;
    try {
      return await CodigoVipTrial.create({
        code,
        tipo: "vip_trial",
        estado: "disponible",
        emailAsignado: emailAsignado ? String(emailAsignado).trim().toLowerCase() : undefined,
        nombreAsignado: nombreAsignado ? String(nombreAsignado).trim() : undefined,
        notaInterna: notaInterna ? String(notaInterna).trim() : undefined,
        expiresAt,
        creadoPorAdmin: creadoPorAdmin || undefined,
        usoUnico: true
      });
    } catch (err) {
      if (err?.code !== 11000 || intento === 7) throw err;
    }
  }

  throw new Error("No se pudo generar el código");
}

function usuarioYaDisfrutoVipTrial(usuario = {}) {
  return Boolean(
    usuario.plan === "vip_trial" ||
    usuario.trialAccepted ||
    usuario.trialStartDate ||
    usuario.trialEndDate
  );
}

function usuarioTienePlanActivoNoGratis(usuario = {}) {
  return Boolean(
    usuario.planActivo &&
    usuario.plan &&
    usuario.plan !== "gratis" &&
    usuario.plan !== "vip_trial"
  );
}

function errorCodigo(reason) {
  const error = new Error(ERROR_MESSAGES[reason] || ERROR_MESSAGES.invalid);
  error.code = reason;
  error.publicMessage = ERROR_MESSAGES[reason] || ERROR_MESSAGES.invalid;
  return error;
}

function validarDocumentoCodigo(codigo, { email, usuario, now = new Date(), permitirRepetirTrial = false } = {}) {
  if (!codigo) throw errorCodigo("invalid");
  if (codigo.estado === "cancelado") throw errorCodigo("cancelled");
  if (codigo.estado === "usado" || codigo.usedAt || codigo.usedBy) throw errorCodigo("used");
  if (codigo.estado === "caducado" || (codigo.expiresAt && codigo.expiresAt <= now)) throw errorCodigo("expired");

  const emailNormalizado = String(email || usuario?.email || "").trim().toLowerCase();
  if (codigo.emailAsignado && codigo.emailAsignado !== emailNormalizado) {
    throw errorCodigo("email_mismatch");
  }

  if (usuarioTieneStripeActivo(usuario) || usuarioTienePlanActivoNoGratis(usuario)) {
    throw errorCodigo("stripe_active");
  }
  if (!permitirRepetirTrial && usuarioYaDisfrutoVipTrial(usuario)) {
    throw errorCodigo("trial_already_used");
  }
}

export async function validarCodigoVipTrial(code, opciones = {}) {
  const normalizado = normalizarCodigoVipTrial(code);
  if (!normalizado) throw errorCodigo("invalid");

  const codigo = await CodigoVipTrial.findOne({ code: normalizado });
  validarDocumentoCodigo(codigo, opciones);
  return codigo;
}

export async function canjearCodigoVipTrial({ code, usuario, email, permitirRepetirTrial = false } = {}) {
  const now = new Date();
  const codigo = await validarCodigoVipTrial(code, { usuario, email, now, permitirRepetirTrial });

  const consumido = await CodigoVipTrial.findOneAndUpdate(
    {
      _id: codigo._id,
      estado: "disponible",
      usedAt: { $exists: false },
      usedBy: { $exists: false },
      expiresAt: { $gt: now }
    },
    {
      $set: {
        estado: "usado",
        usedAt: now,
        usedBy: usuario._id
      }
    },
    { new: true }
  );

  if (!consumido) {
    const actualizado = await CodigoVipTrial.findById(codigo._id);
    validarDocumentoCodigo(actualizado, { usuario, email, now, permitirRepetirTrial });
    throw errorCodigo("invalid");
  }

  Object.assign(usuario, crearDatosVipTrial(now));
  await usuario.save();

  return {
    codigo: consumido,
    usuario
  };
}

export function mensajeErrorCodigoVipTrial(err) {
  return err?.publicMessage || ERROR_MESSAGES[err?.code] || ERROR_MESSAGES.invalid;
}
