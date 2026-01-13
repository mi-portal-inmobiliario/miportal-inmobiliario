import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

const router = express.Router();

/* ============================
   REGISTRO
============================ */
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    const hash = await bcrypt.hash(password, 10);

    const usuario = new Usuario({
      nombre,
      email,
      password: hash
    });

    await usuario.save();

    res.json({ ok: true });

  } catch (err) {
    console.error("❌ Error registro:", err);
    res.status(500).json({ error: "Error en el registro" });
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

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      return res.status(400).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔴 AQUÍ ESTABA EL PROBLEMA EN TU PROYECTO
    // 🔴 DEVOLVEMOS _id, NO id
    res.json({
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });

  } catch (err) {
    console.error("❌ Error login:", err);
    res.status(500).json({ error: "Error en login" });
  }
});

export default router;
