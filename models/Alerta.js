import mongoose from "mongoose";

const alertaSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true
  },
  tipoOperacion: String,
  ciudad: String,
  precioMin: Number,
  precioMax: Number,
  habitaciones: Number,
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model("Alerta", alertaSchema);