import "dotenv/config";
import express from "express";
import Usuario from "../models/Usuario.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// ============================
// GET favoritos
// ============================
router.get("/:id/favoritos", requireAuth, async (req, res) => {
  try {
    if (String(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const usuario = await Usuario.findById(req.params.id).populate("favoritos");
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(usuario.favoritos);
  } catch (e) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

// ============================
// POST añadir favorito
// ============================
router.post("/:id/favoritos/:propiedadId", requireAuth, async (req, res) => {
  try {
    if (String(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const ya = usuario.favoritos.map(f => f.toString()).includes(req.params.propiedadId);
    if (!ya) {
      usuario.favoritos.push(req.params.propiedadId);
      await usuario.save();
    }

    res.json({ ok: true, favorito: true });
  } catch (e) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

// ============================
// DELETE quitar favorito
// ============================
router.delete("/:id/favoritos/:propiedadId", requireAuth, async (req, res) => {
  try {
    if (String(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    usuario.favoritos = usuario.favoritos.filter(
      f => f.toString() !== req.params.propiedadId
    );
    await usuario.save();
    res.json({ ok: true, favorito: false });
  } catch (e) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

// Contar favoritos de una propiedad
router.get("/favoritos/count/:propiedadId", async (req, res) => {
  try {
    const count = await Usuario.countDocuments({ 
      favoritos: req.params.propiedadId 
    });
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: "Error en servidor" });
  }
});

export default router;
