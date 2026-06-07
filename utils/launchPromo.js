export async function aplicarCuponLaunchPromo({ stripe, usuario, metadata = {} }) {
  if (!usuario?.stripeSubscriptionId || !usuario?.launchPromoCouponId) {
    return {
      ok: false,
      reason: "missing_data",
      subscriptionId: usuario?.stripeSubscriptionId || null,
      couponId: usuario?.launchPromoCouponId || null
    };
  }

  await stripe.subscriptions.update(usuario.stripeSubscriptionId, {
    discounts: [
      { coupon: usuario.launchPromoCouponId }
    ],
    metadata: {
      ...metadata,
      launchPromoApplied: "true"
    }
  });

  usuario.launchPromoApplied = true;
  usuario.launchPromoAppliedAt = new Date();
  usuario.launchPromoAppliedSubscriptionId = usuario.stripeSubscriptionId;
  await usuario.save();

  return {
    ok: true,
    subscriptionId: usuario.launchPromoAppliedSubscriptionId,
    couponId: usuario.launchPromoCouponId
  };
}
