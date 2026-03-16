// ─── PRNG con semilla (Mulberry32) ────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let rng = Math.random

export const setRng = (seed) => {
  rng = seed ? mulberry32(Number(seed)) : Math.random
}

// ─── Distribuciones ──────────────────────────────────────────────────────────

/** Box-Muller — distribución Normal */
export const randomNormal = (mu = 0, sigma = 1) => {
  let u1 = rng()
  let u2 = rng()
  if (u1 === 0) u1 = 1e-10
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mu + sigma * z
}

/** Distribución Uniforme */
export const randomUniform = (min, max) => rng() * (max - min) + min

/** Distribución Exponencial */
export const randomExponential = (lambda) => -Math.log(1 - rng()) / lambda

/** Distribución Sesgada (chi-cuadrado aproximada) */
export const randomSkewed = (mu, sigma, dir = 1) => {
  // Combinación de normal y exponencial para sesgo configurable
  const base = randomNormal(0, 1)
  const exp  = randomExponential(1)
  return mu + sigma * (dir * exp + base * 0.5)
}

/** Distribución Bimodal */
export const randomBimodal = (mu1, sigma1, mu2, sigma2) =>
  rng() < 0.5
    ? randomNormal(mu1, sigma1)
    : randomNormal(mu2, sigma2)

// ─── Generador por tipo ───────────────────────────────────────────────────────

export const generateDistribution = (type, n, params) => {
  const data = []
  for (let i = 0; i < n; i++) {
    switch (type) {
      case 'normal':
        data.push(randomNormal(params.mu, params.sigma))
        break
      case 'uniform':
        data.push(randomUniform(params.uMin, params.uMax))
        break
      case 'exponential':
        data.push(randomExponential(params.lambda))
        break
      case 'skewed':
      case 'skewedPos':
        data.push(randomSkewed(params.mu, params.sigma, 1))
        break
      case 'skewedNeg':
        data.push(randomSkewed(params.mu, params.sigma, -1))
        break
      case 'bimodal':
        data.push(randomBimodal(params.bmu1, params.bsigma1, params.bmu2, params.bsigma2))
        break
      default:
        data.push(randomNormal(params.mu ?? 0, params.sigma ?? 1))
    }
  }
  return data
}

// ─── Etiqueta legible ─────────────────────────────────────────────────────────

export const distLabel = (d) =>
  ({
    normal:      'Normal',
    uniform:     'Uniforme',
    exponential: 'Exponencial',
    skewed:      'Sesgada',
    skewedPos:   'Sesgada Positiva',
    skewedNeg:   'Sesgada Negativa',
    bimodal:     'Bimodal',
  }[d] ?? d)
