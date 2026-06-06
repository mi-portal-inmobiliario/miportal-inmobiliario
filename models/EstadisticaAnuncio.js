import mongoose from "mongoose";

const EstadisticaAnuncioSchema = new mongoose.Schema({
  propiedadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Propiedad",
    required: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  visitas: {
    type: Number,
    default: 0
  },
  contactos: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

EstadisticaAnuncioSchema.index({ propiedadId: 1, fecha: 1 }, { unique: true });
EstadisticaAnuncioSchema.index({ usuarioId: 1, fecha: 1 });
EstadisticaAnuncioSchema.index({ fecha: 1 });

export default mongoose.model("EstadisticaAnuncio", EstadisticaAnuncioSchema);
