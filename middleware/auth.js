import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const [type, token] = authorization.trim().split(/\s+/);
  if (type !== "Bearer") return null;
  if (!token || token === "null" || token === "undefined") return null;
  return token;
}

function shouldLogAuth(req) {
  return req.originalUrl?.startsWith("/propiedades") || req.originalUrl?.startsWith("/usuarios/me");
}

function logAuthDebug(req, estado, extra = {}) {
  if (!shouldLogAuth(req)) return;

  const authorization = req.headers.authorization || "";
  const [type, token] = authorization.trim().split(/\s+/);
  console.log("[Auth]", {
    estado,
    method: req.method,
    url: req.originalUrl,
    authorizationPresente: Boolean(authorization),
    esquema: type || null,
    tokenLength: token ? token.length : 0,
    ...extra
  });
}

export async function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    logAuthDebug(req, "token_faltante_o_malformado");
    return res.status(401).json({ error: "Tu sesión ha caducado. Inicia sesión de nuevo para publicar." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.esAdmin) {
      req.user = { id: null, esAdmin: true };
      req.usuarioId = null;
      return next();
    }

    const usuario = await Usuario.findById(decoded.id);
    if (!usuario) {
      logAuthDebug(req, "usuario_no_encontrado", { userId: decoded.id || null });
      return res.status(401).json({ error: "Tu sesión ha caducado. Inicia sesión de nuevo para publicar." });
    }

    if (usuario.activo === false) {
      logAuthDebug(req, "usuario_desactivado", { userId: usuario._id.toString() });
      return res.status(403).json({ error: "Esta cuenta ha sido desactivada. Contacta con HomeClick24." });
    }

    req.user = {
      id: usuario._id.toString(),
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      plan: usuario.plan || "gratis",
      planActivo: usuario.planActivo || false,
      trialAccepted: usuario.trialAccepted || false,
      trialStartDate: usuario.trialStartDate || null,
      trialEndDate: usuario.trialEndDate || null,
      stripeCustomerId: usuario.stripeCustomerId || null,
      stripeSubscriptionId: usuario.stripeSubscriptionId || null,
      esAdmin: false
    };
    req.usuarioId = req.user.id;
    logAuthDebug(req, "ok", {
      userId: req.user.id,
      plan: req.user.plan,
      planActivo: Boolean(req.user.planActivo)
    });
    next();
  } catch (err) {
    logAuthDebug(req, "token_invalido", { motivo: err.name || "JWTError" });
    return res.status(401).json({ error: "Tu sesión ha caducado. Inicia sesión de nuevo para publicar." });
  }
}

export function requireAdmin(req, res, next) {
  const token = getBearerToken(req);

  if (!token) return res.status(401).json({ error: "No autorizado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.esAdmin) return res.status(403).json({ error: "No tienes permisos" });

    req.user = { id: null, esAdmin: true };
    req.usuarioId = null;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export default requireAuth;
