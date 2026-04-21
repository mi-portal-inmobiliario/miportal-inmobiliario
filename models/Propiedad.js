import mongoose from "mongoose";

const PropiedadSchema = new mongoose.Schema({
  titulo:        { type: String, required: true },
  direccion:     { type: String, required: true },
  precio:        { type: Number, required: true },
  descripcion:   { type: String },
  tipoOperacion: { type: String, enum: ["venta", "alquiler"], required: true },
  habitaciones:  { type: Number, default: 1 },
  imagenes:      { type: [String], default: [] },
  lat:           { type: Number },
  lng:           { type: Number },

  // NUEVOS CAMPOS
  banos:         { type: Number, default: 1 },
  superficie:    { type: Number },
  garaje:        { type: Boolean, default: false },
  piscina:       { type: Boolean, default: false },
  terraza:       { type: Boolean, default: false },
  tipoInmueble:  { type: String, enum: ["piso", "casa", "chalet", "apartamento", "local", "oficina", "terreno"], default: "piso" },
  estado:        { type: String, enum: ["obra_nueva", "segunda_mano"], default: "segunda_mano" },

  // Para saber quién publicó cada anuncio
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }
}, { timestamps: true });

export default mongoose.model("Propiedad", PropiedadSchema);