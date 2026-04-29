import mongoose from "mongoose";

const notificacionSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true
  },
  propiedadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Propiedad",
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  leida: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model("Notificacion", notificacionSchema);