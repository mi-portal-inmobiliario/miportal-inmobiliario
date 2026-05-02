import "dotenv/config";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import Usuario from "../models/Usuario.js";

const router = express.Router();

// Configuración de Nodemailer con Gmail
const resend = new Resend(process.env.RESEND_API_KEY);

/* ============================
   REGISTRO (EMAIL + TOKEN)
============================ */
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, tipoDoc, numDoc } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const usuario = new Usuario({
      nombre,
      email,
      verificado: false,
      token,
      tipoDoc: tipoDoc || "",
      numDoc:  numDoc  || ""
    });

    await usuario.save();

    const enlace = `${process.env.APP_URL}/set-password.html?token=${token}`;

    await resend.emails.send({
      from: 'HomeClick24 <contacto@homeclick24.com>',
      to: email,
      subject: "Activa tu cuenta - HomeClick24",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;">
          <h2 style="color:#7cc242">HomeClick24</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Para activar tu cuenta, crea tu contraseña:</p>
          <a href="${enlace}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#7cc242;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;">
            Crear contraseña
          </a>
          <p style="color:#888;font-size:0.85rem">Este enlace caduca en 24h.</p>
        </div>
      `
    });

    res.json({ ok: true, message: "Revisa tu email para activar la cuenta" });

  } catch (err) {
    console.error("❌ Error registro:", err);
    res.status(500).json({ error: "Error en el registro" });
  }
});

/* ============================
   CREAR CONTRASEÑA (ACTIVACIÓN)
============================ */
router.post("/set-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findOne({ email: decoded.email });
    if (!usuario) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    const hash = await bcrypt.hash(password, 10);

    usuario.password = hash;
    usuario.verificado = true;
    usuario.token = undefined;

    await usuario.save();

    res.json({ ok: true, message: "Cuenta activada correctamente" });

  } catch (err) {
    res.status(400).json({ error: "Token inválido o expirado" });
  }
});

/* ============================
   LOGIN
============================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      return res.status(400).json({ error: "Credenciales incorrectas" });
    }

    if (!usuario.verificado) {
      return res.status(401).json({
        error: "Debes activar tu cuenta desde el email"
      });
    }

    if (!usuario.password) {
      return res.status(400).json({
        error: "Debes crear tu contraseña desde el email"
      });
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      return res.status(400).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        plan: usuario.plan || "gratis",
        planActivo: usuario.planActivo || false,
        planFechaFin: usuario.planFechaFin || null
      }
    });

  } catch (err) {
    console.error("❌ Error login:", err);
    res.status(500).json({ error: "Error en login" });
  }
});

/* ============================
   RECUPERAR CONTRASEÑA
============================ */
router.post("/recuperar", async (req, res) => {
  try {
    const { email } = req.body;

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.json({ ok: true });
    }

    const token = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const enlace = `${process.env.APP_URL}/reset.html?token=${token}`;

    await resend.emails.send({
      from: 'HomeClick24 <contacto@homeclick24.com>',
      to: email,
      subject: "Recupera tu contraseña - HomeClick24",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:16px;">
          <h2 style="color:#7cc242">HomeClick24</h2>
          <p>Hola <strong>${usuario.nombre}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <a href="${enlace}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#7cc242;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;">
            Restablecer contraseña
          </a>
          <p style="color:#888;font-size:0.85rem">Este enlace caduca en 1 hora. Si no solicitaste esto, ignora este email.</p>
        </div>
      `
    });

    res.json({ ok: true });

  } catch (err) {
    console.error("❌ Error recuperar:", err);
    res.status(500).json({ error: "Error al enviar el email" });
  }
});

/* ============================
   RESET CONTRASEÑA
============================ */
router.post("/reset", async (req, res) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(password, 10);

    await Usuario.findByIdAndUpdate(decoded.id, { password: hash });

    res.json({ ok: true });

  } catch (err) {
    res.status(400).json({ error: "Token inválido o expirado" });
  }
});

/* ============================
   TEST EMAIL
============================ */
router.get("/test-email", async (req, res) => {
  try {
    await resend.emails.send({
      from: 'HomeClick24 <contacto@homeclick24.com>',
      to: process.env.GMAIL_USER,
      subject: "TEST HomeClick24",
      html: "<h1>Email funcionando ✅</h1>"
    });
    res.send("Email enviado correctamente");
  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).send("Error: " + err.message);
  }
});

export default router;