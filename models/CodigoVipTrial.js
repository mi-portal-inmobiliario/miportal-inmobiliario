import mongoose from "mongoose";

const CodigoVipTrialSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  tipo: {
    type: String,
    enum: ["vip_trial"],
    default: "vip_trial",
    required: true
  },
  estado: {
    type: String,
    enum: ["disponible", "usado", "caducado", "cancelado"],
    default: "disponible",
    index: true
  },
  emailAsignado: {
    type: String,
    lowercase: true,
    trim: true
  },
  nombreAsignado: {
    type: String,
    trim: true
  },
  notaInterna: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  usedAt: {
    type: Date
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario"
  },
  creadoPorAdmin: {
    type: String,
    trim: true
  },
  usoUnico: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model("CodigoVipTrial", CodigoVipTrialSchema);
