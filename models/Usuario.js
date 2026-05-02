import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
  nombre:     { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String },
  favoritos:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Propiedad" }],
  verificado: { type: Boolean, default: false },
  token:      { type: String },
  tipoDoc:    { type: String },
  numDoc:     { type: String },

  // Suscripción Stripe
  plan:                  { type: String, default: "gratis" },
  stripeCustomerId:      { type: String },
  stripeSubscriptionId:  { type: String },
  planActivo:            { type: Boolean, default: false },
  planFechaFin:          { type: Date },
});

export default mongoose.model("Usuario", UsuarioSchema);