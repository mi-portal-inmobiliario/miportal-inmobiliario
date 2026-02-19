import mongoose from "mongoose";

const PropiedadSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  direccion: { type: String, required: true },
  precio: { type: Number, required: true },
  descripcion: { type: String },
  tipoOperacion: { type: String, enum: ["venta", "alquiler"], required: true },
  habitaciones: { type: Number, default: 1 },
  imagenes: { type: [String], default: [] },
  lat: { type: Number },
  lng: { type: Number },

  // 🔥 Para saber quién publicó cada anuncio
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }
}, { timestamps: true });

export default mongoose.model("Propiedad", PropiedadSchema);
