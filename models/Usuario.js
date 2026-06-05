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
  pendingPlan:           { type: String },
  pendingPriceId:        { type: String },
  pendingPlanChangeAt:   { type: Date },
  pendingPlanLabel:      { type: String },

  // Prueba gratuita VIP
  trialAccepted:         { type: Boolean, default: false },
  trialStartDate:        { type: Date },
  trialEndDate:          { type: Date },
  trialReminderSent:     { type: Boolean, default: false },
  trialReminders: {
    sevenDays:           { type: Boolean, default: false },
    threeDays:           { type: Boolean, default: false },
    lastDay:             { type: Boolean, default: false },
    expired:             { type: Boolean, default: false }
  },
}, { timestamps: true });

export default mongoose.model("Usuario", UsuarioSchema);
