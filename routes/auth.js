// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

const router = express.Router();

/* ================================
   REGISTRO
================================ */
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe) return res.status(400).json({ error: "El email ya está registrado" });

    const hash = await bcrypt.hash(password, 10);

    const nuevo = new Usuario({
      nombre,
      email,
      password: hash,
    });

    await nuevo.save();

    res.json({ mensaje: "Usuario registrado", usuario: nuevo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

/* ================================
   LOGIN
================================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(400).json({ error: "Email incorrecto" });

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return res.status(400).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      mensaje: "Login correcto",
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

/* ================================
   OBTENER DATOS DEL USUARIO
================================ */
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization?.split(" ")[1];
    if (!auth) return res.status(401).json({ error: "Token faltante" });

    const decoded = jwt.verify(auth, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(decoded.id).select("-password");
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    res.json(usuario);
  } catch (e) {
    res.status(401).json({ error: "Token inválido" });
  }
});

export default router;
