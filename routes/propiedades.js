import "dotenv/config";
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import Propiedad from "../models/Propiedad.js";
import Alerta from "../models/Alerta.js";
import Notificacion from "../models/Notificacion.js";
import Usuario from "../models/Usuario.js";
import { enviarCorreo } from "../utils/email.js";
import { requireAuth } from "../middleware/auth.js";
import {
  cleanString,
  isObjectId,
  numberFromInput,
  optionalCleanString,
  optionalNumberFromInput,
  validateBody,
  validateQuery,
  z
} from "../utils/validation.js";

const router = express.Router();

const tipoOperacionSchema = z.enum(["venta", "alquiler"]);
const tipoInmuebleSchema = z.enum([
  "piso", "casa", "chalet", "apartamento",
  "local", "oficina", "terreno",
  "garaje", "plaza_aparcamiento", "trastero"
]);
const estadoSchema = z.enum(["obra_nueva", "segunda_mano"]);
const booleanInput = z
  .preprocess(value => typeof value === "boolean" ? String(value) : value, z.enum(["true", "false"]))
  .optional();

const propiedadesQuerySchema = z.object({
  tipo: tipoOperacionSchema.optional(),
  min: optionalNumberFromInput,
  max: optionalNumberFromInput,
  hab: optionalNumberFromInput,
  texto: optionalCleanString(120),
  banos: optionalNumberFromInput,
  sup_min: optionalNumberFromInput,
  sup_max: optionalNumberFromInput,
  tipoInmueble: tipoInmuebleSchema.optional(),
  estado: estadoSchema.optional(),
  garaje: z.enum(["true"]).optional(),
  piscina: z.enum(["true"]).optional(),
  terraza: z.enum(["true"]).optional()
});

const propiedadBaseSchema = {
  titulo: cleanString(160),
  direccion: cleanString(300),
  precio: numberFromInput.pipe(z.number().min(0)),
  descripcion: optionalCleanString(5000),
  tipoOperacion: tipoOperacionSchema,
  habitaciones: numberFromInput.pipe(z.number().int().min(0)),
  lat: optionalNumberFromInput,
  lng: optionalNumberFromInput,
  videoUrl: optionalCleanString(500),
  banos: optionalNumberFromInput,
  superficie: optionalNumberFromInput,
  superficieParcela: optionalNumberFromInput,
  tipoInmueble: tipoInmuebleSchema.optional(),
  estado: estadoSchema.optional(),
  garaje: booleanInput,
  piscina: booleanInput,
  terraza: booleanInput,
  escaparate: booleanInput,
  usoPermitido: optionalCleanString(200),
  plantaLocal: optionalCleanString(80),
  tipoGaraje: optionalCleanString(40),
  alturaMaxima: optionalNumberFromInput,
  accesoTrastero: optionalCleanString(80),
  imagenesExistentes: optionalCleanString(8000)
};

const propiedadCreateSchema = z.object(propiedadBaseSchema);
const propiedadUpdateSchema = z.object({
  ...propiedadBaseSchema,
  titulo: propiedadBaseSchema.titulo.optional(),
  direccion: propiedadBaseSchema.direccion.optional(),
  precio: propiedadBaseSchema.precio.optional(),
  tipoOperacion: tipoOperacionSchema.optional(),
  habitaciones: propiedadBaseSchema.habitaciones.optional()
});

// ==================================================
// CLOUDINARY CONFIG
// ==================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "miportal_inmobiliario",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1200, crop: "limit" },
      {
        overlay: "homeclick24_watermark",
        width: 400,
        crop: "scale",
        opacity: 70,
        gravity: "south_east",
        x: 30,
        y: 30,
        flags: "layer_apply" 
      }
    ]
  })
});

const upload = multer({ storage });

// ==================================================
// GET /propiedades — con filtros
// ==================================================
router.get("/", validateQuery(propiedadesQuerySchema), async (req, res) => {
  try {
    const { tipo, min, max, hab, texto } = req.query;
    const filtro = {};

    if (tipo) filtro.tipoOperacion = tipo;

    if (min || max) {
      filtro.precio = {};
      if (min) filtro.precio.$gte = Number(min);
      if (max) filtro.precio.$lte = Number(max);
    }

    if (hab) filtro.habitaciones = { $gte: Number(hab) };

    const { banos, sup_min, sup_max, tipoInmueble, estado, garaje, piscina, terraza } = req.query;

    if (banos) filtro.banos = { $gte: Number(banos) };

    if (sup_min || sup_max) {
      filtro.superficie = {};
      if (sup_min) filtro.superficie.$gte = Number(sup_min);
      if (sup_max) filtro.superficie.$lte = Number(sup_max);
    }

    if (tipoInmueble) filtro.tipoInmueble = tipoInmueble;
    if (estado)       filtro.estado = estado;
    if (garaje === "true")  filtro.garaje = true;
    if (piscina === "true") filtro.piscina = true;
    if (terraza === "true") filtro.terraza = true;

    if (texto) {
      filtro.$or = [
        { titulo: { $regex: texto, $options: "i" } },
        { direccion: { $regex: texto, $options: "i" } }
      ];
    }

    console.log("FILTRO APLICADO:", filtro);

    const propiedades = await Propiedad.find(filtro).sort({ createdAt: -1 });
    res.json(propiedades);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener propiedades" });
  }
});

// ==================================================
// TEST EMAIL
// ==================================================
router.get("/test-email", async (req, res) => {

  await enviarCorreo(
    "contacto@homeclick24.com",
    "Prueba HomeClick24",
    "<h1>Email funcionando 🚀</h1><p>Tu sistema de emails ya funciona.</p>"
  );

  res.send("Email enviado correctamente");
});

// ==================================================
// GET /propiedades/:id
// ==================================================
router.get("/:id", async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const propiedad = await Propiedad.findByIdAndUpdate(
      req.params.id,
      { $inc: { visitas: 1 } },
      { new: true }
    );
    if (!propiedad) return res.status(404).json({ message: "Propiedad no encontrada" });
    res.json(propiedad);
  } catch (err) {
    res.status(400).json({ message: "ID inválido" });
  }
});

// ==================================================
// POST /propiedades — crear propiedad con imágenes
// ==================================================
router.post("/", requireAuth, upload.array("imagenes", 10), validateBody(propiedadCreateSchema), async (req, res) => {
  try {
    const {
      titulo,
      direccion,
      precio,
      descripcion,
      tipoOperacion,
      habitaciones,
      lat,
      lng,
      videoUrl
    } = req.body;
    const usuarioId = req.user.id;

    // Comprobar límite de plan
    const LIMITES = {
      gratis: 2,
      basico: 3,
      destacado: 4,
      starter: 15,
      pro_agentes: 40,
      vip_trial: Infinity,
      vip: Infinity
    };

    const MAX_FOTOS = {
      gratis: 7,
      basico: 10,
      destacado: 15,
      starter: 20,
      pro_agentes: 30,
      vip_trial: Infinity,
      vip: Infinity
    };

    let usuario = null;
    let plan = "gratis";

    usuario = await Usuario.findById(usuarioId);

    if (usuario) {

      plan = usuario.plan || "gratis";
      if (plan === "vip_trial" && (!usuario.trialAccepted || !usuario.planActivo)) {
        plan = "gratis";
      }
      
      const limite = LIMITES[plan] ?? 2;
      // Límite de fotos
      const maxFotos = MAX_FOTOS[plan] ?? 7;
      const numFotos = req.files?.length || 0;
      if (numFotos > maxFotos) {
        return res.status(403).json({
          error: `Tu plan permite un máximo de ${maxFotos} fotos por anuncio.`
        });
      }
      const totalAnuncios = await Propiedad.countDocuments({ usuarioId });
      if (totalAnuncios >= limite) {
        return res.status(403).json({ 
          error: `Has alcanzado el límite de anuncios de tu plan ${plan}. Mejora tu plan para publicar más.` 
        });
      }
    }

    const imagenes = req.files?.map(f => f.path) || [];

    const { banos, superficie, tipoInmueble, estado, garaje, piscina, terraza } = req.body;

    // Calcular expiración
    let fechaExpiracion = null;
    if (plan === "gratis") {
      fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 15);
    }

    const propiedad = await Propiedad.create({
      titulo,
      direccion,
      precio:        Number(precio),
      descripcion,

      videoUrl: videoUrl || "",

      tipoOperacion,
      habitaciones:  Number(habitaciones),
      banos:         Number(banos) || 1,
      superficie:    superficie ? Number(superficie) : null,
      superficieParcela:  req.body.superficieParcela ? Number(req.body.superficieParcela) : null,
      tipoInmueble:  tipoInmueble || "piso",
      estado:        estado || "segunda_mano",
      garaje:        garaje === "true",
      piscina:       piscina === "true",
      terraza:       terraza === "true",
      usuarioId:     usuarioId || null,
      lat:           lat ? Number(lat) : null,
      lng:           lng ? Number(lng) : null,
      imagenes,
      fechaExpiracion
    });

    if (usuario?.email) {

  await enviarCorreo(
    usuario.email,
    "Anuncio publicado en HomeClick24",
    `
      <h1>Tu anuncio ya está publicado 🏡</h1>

      <p>Hola ${usuario.nombre || ""},</p>

      <p>
        Tu propiedad <strong>${propiedad.titulo}</strong>
        ya está activa en HomeClick24.
      </p>

      <p>
        Dirección: ${propiedad.direccion}
      </p>

      <p>
        Precio: ${propiedad.precio} €
      </p>

      <br>

      <p>Gracias por usar HomeClick24 🚀</p>
    `
  );

}

    // Buscar alertas que coincidan
    console.log("Nueva propiedad creada:", propiedad.titulo);

    const alertasCoincidentes = await Alerta.find({
      activa: true,
      tipoOperacion: propiedad.tipoOperacion,
      precioMax: { $gte: propiedad.precio },
      habitaciones: { $lte: propiedad.habitaciones }
    });

    console.log("Alertas encontradas:", alertasCoincidentes);

    if (alertasCoincidentes.length > 0) {
      console.log("Hay usuarios interesados en esta propiedad");

      for (const alerta of alertasCoincidentes) {
        await Notificacion.create({
          usuarioId: alerta.usuarioId,
          propiedadId: propiedad._id,
          mensaje: `Nueva propiedad que coincide con tu alerta: ${propiedad.titulo}`
        });

        console.log("Notificación creada para:", alerta.usuarioId);
      }

    } else {
      console.log("No hay alertas compatibles");
    }

    for (const alerta of alertasCoincidentes) {
      console.log(
        "Coincidencia:",
        alerta.usuarioId,
        "→ propiedad:",
        propiedad._id
      );
    }

    res.status(201).json(propiedad);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear propiedad" });
  }
});

// ==================================================
// PUT /propiedades/:id — editar propiedad
// ==================================================
router.put("/:id", requireAuth, upload.array("imagenes", 10), validateBody(propiedadUpdateSchema), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const {
      titulo, direccion, precio, descripcion,
      tipoOperacion, habitaciones, lat, lng
    } = req.body;

    const propiedad = await Propiedad.findById(req.params.id);
    if (!propiedad) return res.status(404).json({ message: "Propiedad no encontrada" });
    if (String(propiedad.usuarioId) !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    propiedad.titulo       = titulo || propiedad.titulo;
    propiedad.direccion    = direccion || propiedad.direccion;
    propiedad.precio       = precio ? Number(precio) : propiedad.precio;
    propiedad.descripcion  = descripcion || propiedad.descripcion;
    propiedad.tipoOperacion = tipoOperacion || propiedad.tipoOperacion;
    const { banos, superficie, tipoInmueble, estado, garaje, piscina, terraza } = req.body;

    propiedad.habitaciones = habitaciones ? Number(habitaciones) : propiedad.habitaciones;
    propiedad.banos        = banos ? Number(banos) : propiedad.banos;
    propiedad.superficieParcela = req.body.superficieParcela ? Number(req.body.superficieParcela) : propiedad.superficieParcela;
    propiedad.superficie   = superficie ? Number(superficie) : propiedad.superficie;
    propiedad.tipoInmueble = tipoInmueble || propiedad.tipoInmueble;
    propiedad.estado       = estado || propiedad.estado;
    propiedad.garaje       = garaje !== undefined ? garaje === "true" : propiedad.garaje;
    propiedad.piscina      = piscina !== undefined ? piscina === "true" : propiedad.piscina;
    propiedad.terraza      = terraza !== undefined ? terraza === "true" : propiedad.terraza;
    propiedad.lat          = lat ? Number(lat) : propiedad.lat;
    propiedad.lng          = lng ? Number(lng) : propiedad.lng;
    
    const imagenesExistentes = req.body.imagenesExistentes
      ? JSON.parse(req.body.imagenesExistentes)
      : [];

    console.log("FILES:", req.files);

    const nuevasImagenes = req.files?.map(f => f.path) || [];

    propiedad.imagenes = [
      ...imagenesExistentes,
      ...nuevasImagenes
    ];

    await propiedad.save();
    res.json(propiedad);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al editar propiedad" });
  }
});

// ==================================================
// DELETE /propiedades/:id — eliminar propiedad
// ==================================================
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const propiedad = await Propiedad.findById(req.params.id);
    if (!propiedad) return res.status(404).json({ message: "Propiedad no encontrada" });
    if (String(propiedad.usuarioId) !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    // Eliminar imágenes de Cloudinary
    if (propiedad.imagenes && propiedad.imagenes.length > 0) {
      for (const url of propiedad.imagenes) {
        try {
          // Extraer el public_id de la URL de Cloudinary
          const partes = url.split("/");
          const archivo = partes[partes.length - 1].split(".")[0];
          const carpeta = partes[partes.length - 2];
          const publicId = `${carpeta}/${archivo}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (errImg) {
          console.warn("No se pudo eliminar imagen:", errImg.message);
        }
      }
    }

    await Propiedad.findByIdAndDelete(req.params.id);
    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar propiedad" });
  }
});

export default router;
