// ─── Tendencia central ────────────────────────────────────────────────────────

export const mean = (d) => d.reduce((a, b) => a + b, 0) / d.length

export const median = (d) => {
  const s = [...d].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// ─── Dispersión ───────────────────────────────────────────────────────────────

export const varianceP = (d) => {
  const m = mean(d)
  return d.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / d.length
}

export const varianceS = (d) => {
  const m = mean(d)
  return d.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / (d.length - 1)
}

export const stdDevP = (d) => Math.sqrt(varianceP(d))
export const stdDevS = (d) => Math.sqrt(varianceS(d))

// ─── Forma ────────────────────────────────────────────────────────────────────

export const skewness = (d) => {
  const m = mean(d)
  const s = stdDevS(d)
  const n = d.length
  if (s === 0) return 0
  return (
    (n / ((n - 1) * (n - 2))) *
    d.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0)
  )
}

export const kurtosis = (d) => {
  const m = mean(d)
  const s = stdDevS(d)
  const n = d.length
  if (s === 0) return 0
  return (1 / n) * d.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0) - 3
}

// ─── Percentiles / IQR ────────────────────────────────────────────────────────

export const percentile = (d, p) => {
  const s = [...d].sort((a, b) => a - b)
  const idx = (p / 100) * (s.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}

// ─── Agregado completo ────────────────────────────────────────────────────────

export const calcStats = (data) => {
  if (!data || data.length < 2) return null
  const m    = mean(data)
  const med  = median(data)
  const vP   = varianceP(data)
  const vS   = varianceS(data)
  const sP   = stdDevP(data)
  const sS   = stdDevS(data)
  const sk   = skewness(data)
  const ku   = kurtosis(data)
  const p25  = percentile(data, 25)
  const p50  = percentile(data, 50)
  const p75  = percentile(data, 75)
  const minV = Math.min(...data)
  const maxV = Math.max(...data)
  return {
    mean: m,
    median: med,
    varianceP: vP,
    varianceS: vS,
    stdDevP: sP,
    stdDevS: sS,
    skewness: sk,
    kurtosis: ku,
    p25, p50, p75,
    iqr: p75 - p25,
    min: minV,
    max: maxV,
    range: maxV - minV,
    n: data.length,
    se: sS / Math.sqrt(data.length),
    cv: Math.abs(m) > 1e-10 ? (sS / m) * 100 : 0,
  }
}

// ─── Etiquetas de forma ───────────────────────────────────────────────────────

export const skewnessLabel = (sk) => {
  if (sk > 0.5)  return 'Sesgo positivo (cola derecha) →'
  if (sk < -0.5) return 'Sesgo negativo (cola izquierda) ←'
  return 'Distribución aproximadamente simétrica ≈'
}

export const skewnessStyle = (sk) => {
  if (sk > 0.5)  return { color: 'text-amber-400',   border: 'border-amber-500/30',   icon: '→' }
  if (sk < -0.5) return { color: 'text-blue-400',    border: 'border-blue-500/30',    icon: '←' }
  return               { color: 'text-emerald-400', border: 'border-emerald-500/30', icon: '≈' }
}

export const kurtosisLabel = (ku) => {
  if (ku > 0.5)  return 'Leptocúrtica (pico agudo)'
  if (ku < -0.5) return 'Platicúrtica (distribución aplanada)'
  return 'Mesocúrtica (similar a la normal)'
}

// ─── Formato numérico ─────────────────────────────────────────────────────────

export const fmt = (v, d = 4) => {
  if (v === undefined || v === null || isNaN(v)) return 'N/A'
  return Number(v).toFixed(d)
}
