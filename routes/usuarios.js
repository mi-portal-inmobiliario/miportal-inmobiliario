import express from "express";
import Usuario from "../models/Usuario.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// REGISTRO
router.post("/registro", async (req, res) => {
  try {
    const { nombre, email, password, telefono } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe)
      return res.status(400).json({ error: "El email ya está registrado" });

    const hash = await bcrypt.hash(password, 10);

    const nuevo = new Usuario({
      nombre,
      email,
      telefono,
      password: hash
    });

    await nuevo.save();

    res.json({ mensaje: "Usuario creado correctamente" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Error en servidor" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ email });
    if (!usuario)
      return res.status(400).json({ error: "Credenciales incorrectas" });

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok)
      return res.status(400).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        avatar: usuario.avatar
      }
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Error en servidor" });
  }
});

export default router;
