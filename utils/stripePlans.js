const STRIPE_PLAN_ENV = {
  basico: 'STRIPE_PRICE_BASICO',
  destacado: 'STRIPE_PRICE_DESTACADO',
  starter: 'STRIPE_PRICE_STARTER',
  pro_agentes: 'STRIPE_PRICE_PRO_AGENTES',
  agencia_basica: 'STRIPE_PRICE_AGENCIA_BASICA'
};

export function getStripePlans() {
  return Object.fromEntries(
    Object.entries(STRIPE_PLAN_ENV).map(([plan, envName]) => [
      plan,
      process.env[envName] || null
    ])
  );
}

export function getPriceIdByPlan(plan) {
  return getStripePlans()[plan] || null;
}

export function getPlanByPriceId(priceId) {
  if (!priceId) return null;

  const entry = Object.entries(getStripePlans())
    .find(([, configuredPriceId]) => configuredPriceId === priceId);

  return entry?.[0] || null;
}

export function getStripePriceEnvName(plan) {
  return STRIPE_PLAN_ENV[plan] || null;
}
