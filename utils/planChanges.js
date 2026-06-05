import Stripe from "stripe";
import Usuario from "../models/Usuario.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function fechaFinPeriodo(subscription) {
  const timestamp = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
  return timestamp ? new Date(timestamp * 1000) : null;
}

export async function applyPendingPlanChanges(now = new Date()) {
  const usuarios = await Usuario.find({
    pendingPlan: { $exists: true, $ne: null },
    pendingPriceId: { $exists: true, $ne: null },
    pendingPlanChangeAt: { $lte: now },
    stripeSubscriptionId: { $exists: true, $ne: null }
  });

  for (const usuario of usuarios) {
    try {
      const subscription = await stripe.subscriptions.retrieve(usuario.stripeSubscriptionId);
      const item = subscription.items?.data?.[0];
      if (!item?.id) continue;

      const subscriptionActualizada = await stripe.subscriptions.update(usuario.stripeSubscriptionId, {
        items: [{ id: item.id, price: usuario.pendingPriceId }],
        proration_behavior: "none",
        metadata: {
          userId: usuario._id.toString(),
          usuarioId: usuario._id.toString(),
          plan: usuario.pendingPlan,
          priceId: usuario.pendingPriceId
        }
      });

      const fechaFin = fechaFinPeriodo(subscriptionActualizada);
      usuario.plan = usuario.pendingPlan;
      usuario.planActivo = true;
      if (fechaFin) usuario.planFechaFin = fechaFin;
      usuario.pendingPlan = null;
      usuario.pendingPriceId = null;
      usuario.pendingPlanChangeAt = null;
      usuario.pendingPlanLabel = null;
      await usuario.save();
    } catch (err) {
      console.error("❌ Error aplicando cambio de plan programado:", {
        userId: usuario._id.toString(),
        pendingPlan: usuario.pendingPlan,
        error: err.message
      });
    }
  }

  return usuarios.length;
}

export function schedulePendingPlanChanges() {
  const intervalMs = 5 * 60 * 1000;

  applyPendingPlanChanges().catch(err => {
    console.error("❌ Error revisando cambios de plan programados:", err.message);
  });

  return setInterval(() => {
    applyPendingPlanChanges().catch(err => {
      console.error("❌ Error revisando cambios de plan programados:", err.message);
    });
  }, intervalMs);
}
