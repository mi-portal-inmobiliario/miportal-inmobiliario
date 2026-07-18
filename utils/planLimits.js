export const PLAN_LIMITS = {
  gratis: {
    anuncios: 2,
    fotos: 7
  },
  basico: {
    anuncios: 3,
    fotos: 10
  },
  destacado: {
    anuncios: 4,
    fotos: 15
  },
  starter: {
    anuncios: 15,
    fotos: 20
  },
  pro_agentes: {
    anuncios: 40,
    fotos: 30
  },
  agencia_basica: {
    anuncios: 50,
    fotos: 40
  },
  agencia_pro: {
    anuncios: Infinity,
    fotos: 50
  },
  vip_trial: {
    anuncios: Infinity,
    fotos: Infinity
  },
  vip: {
    anuncios: Infinity,
    fotos: Infinity
  }
};

export function getPlanLimits(plan = "gratis") {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.gratis;
}

export function getLimiteAnunciosPlan(plan = "gratis") {
  return getPlanLimits(plan).anuncios;
}

export function getLimiteFotosPlan(plan = "gratis") {
  return getPlanLimits(plan).fotos;
}

export function planTieneLimiteFotos(plan = "gratis") {
  return Number.isFinite(getLimiteFotosPlan(plan));
}
