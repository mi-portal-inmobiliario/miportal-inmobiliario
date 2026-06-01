import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

function getBearerToken(req) {
  const [type, token] = req.headers.authorization?.split(" ") || [];
  return type === "Bearer" ? token : null;
}

export async function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) return res.status(401).json({ error: "Token faltante" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.esAdmin) {
      req.user = { id: null, esAdmin: true };
      req.usuarioId = null;
      return next();
    }

    const usuario = await Usuario.findById(decoded.id);
    if (!usuario) return res.status(401).json({ error: "Usuario no encontrado" });

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
      esAdmin: false
    };
    req.usuarioId = req.user.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
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
