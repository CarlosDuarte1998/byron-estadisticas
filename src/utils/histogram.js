import Chart from 'chart.js/auto'

// ─── Construir bins ───────────────────────────────────────────────────────────

export const buildHistogram = (data, bins) => {
  const minV = Math.min(...data)
  const maxV = Math.max(...data)
  const binWidth = (maxV - minV) / bins
  const counts = Array(bins).fill(0)
  const labels = []

  for (let i = 0; i < bins; i++) {
    labels.push(`${(minV + i * binWidth).toFixed(2)}`)
  }

  data.forEach((val) => {
    let idx = Math.floor((val - minV) / binWidth)
    if (idx >= bins) idx = bins - 1
    counts[idx]++
  })

  return { labels, counts, binWidth, min: minV, max: maxV }
}

// ─── Curva normal teórica ─────────────────────────────────────────────────────

export const normalPDF = (x, mu, sigma) =>
  (1 / (sigma * Math.sqrt(2 * Math.PI))) *
  Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2))

export const buildNormalCurve = (mu, sigma, minV, maxV, points = 150) => {
  const step = (maxV - minV) / points
  const ys = []
  for (let i = 0; i <= points; i++) {
    ys.push(normalPDF(minV + i * step, mu, sigma))
  }
  return ys
}

// ─── Helper color ─────────────────────────────────────────────────────────────

export const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Moda desde histograma ────────────────────────────────────────────────────

export const modeFromHistogram = (counts, labels) => {
  const maxIdx = counts.indexOf(Math.max(...counts))
  return labels[maxIdx]
}

// ─── Plugin de líneas verticales ─────────────────────────────────────────────

export const makeVertLinesPlugin = (lines) => ({
  id: 'vertLines',
  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart
    if (!chartArea) return
    lines.forEach(({ xValue, color, label }) => {
      const x = scales.x?.getPixelForValue(xValue)
      if (x === undefined || x < chartArea.left || x > chartArea.right) return
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x, chartArea.top)
      ctx.lineTo(x, chartArea.bottom)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.fillStyle = color
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(label, x + 3, chartArea.top + 14)
      ctx.restore()
    })
  },
})

// ─── Registro global Chart.js ─────────────────────────────────────────────────

// chart.js/auto ya registra todos los componentes
export { Chart }

// ─── Crear/destruir instancias ────────────────────────────────────────────────

const instances = {}

export const destroyChart = (id) => {
  if (instances[id]) {
    instances[id].destroy()
    instances[id] = null
  }
}

export const createChart = (id, config) => {
  destroyChart(id)
  const canvas = document.getElementById(id)
  if (!canvas) return
  instances[id] = new Chart(canvas.getContext('2d'), config)
  return instances[id]
}

// ─── Construir config de gráfico ─────────────────────────────────────────────

export const buildChartConfig = ({
  type,       // 'histogram' | 'bell' | 'radar' | 'scatter'
  data,
  stats,
  bins,
  fillColor,
  borderColor,
  curveColor,
  overlays,   // { curve, mean, sigma1, sigma2, grid } — solo page 2
  chartTitle,
  isPage2,
}) => {
  const fill   = hexToRgba(fillColor, 0.72)
  const border = borderColor ?? fillColor
  const curve  = curveColor ?? '#f59e0b'

  // ── SCATTER ──────────────────────────────────────────────────────────────
  if (type === 'scatter') {
    return {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Datos',
          data: data.map((v, i) => ({ x: i, y: v })),
          backgroundColor: hexToRgba(fillColor, 0.6),
          borderColor: fillColor,
          pointRadius: Math.max(2, Math.min(5, 500 / data.length)),
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
          title: chartTitle
            ? { display: true, text: chartTitle, color: '#94a3b8', font: { size: 12 } }
            : { display: false },
        },
        scales: scalesConfig(overlays?.grid ?? true),
      },
    }
  }

  // ── RADAR ─────────────────────────────────────────────────────────────────
  if (type === 'radar') {
    const hist = buildHistogram(data, Math.min(bins, 12))
    return {
      type: 'radar',
      data: {
        labels: hist.labels,
        datasets: [{
          label: 'Frecuencia',
          data: hist.counts,
          backgroundColor: hexToRgba(fillColor, 0.3),
          borderColor: fillColor,
          borderWidth: 2,
          pointBackgroundColor: fillColor,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { labels: { color: '#94a3b8' } },
          title: chartTitle
            ? { display: true, text: chartTitle, color: '#94a3b8', font: { size: 12 } }
            : { display: false },
        },
        scales: {
          r: {
            ticks: { color: '#64748b', backdropColor: 'transparent' },
            grid: { color: 'rgba(100,116,139,0.3)' },
            angleLines: { color: 'rgba(100,116,139,0.3)' },
          },
        },
      },
    }
  }

  // ── HISTOGRAMA / CAMPANA ──────────────────────────────────────────────────
  const hist     = buildHistogram(data, bins)
  const density  = hist.counts.map((c) => c / (data.length * hist.binWidth))
  const isBell   = type === 'bell'
  const yData    = isBell ? density : hist.counts
  const plugins  = []

  const datasets = [{
    label: isBell ? 'Densidad observada' : 'Frecuencia',
    data: yData,
    backgroundColor: fill,
    borderColor: border,
    borderWidth: 1.5,
    borderRadius: 3,
    type: 'bar',
  }]

  // Curva teórica (campana siempre; histograma solo si overlay.curve activo en page2)
  const showCurve = isBell || (isPage2 && overlays?.curve)
  if (showCurve && stats) {
    const sigma = stats.stdDevS || stats.stdDevP || 1
    const curveYs = buildNormalCurve(stats.mean, sigma, hist.min, hist.max, bins)
    const scaledYs = isBell ? curveYs : curveYs.map((y) => y * data.length * hist.binWidth)
    datasets.push({
      label: 'Distribución teórica',
      data: scaledYs,
      type: 'line',
      borderColor: curve,
      borderWidth: 2.5,
      pointRadius: 0,
      fill: false,
      tension: 0.4,
    })
  }

  // Líneas verticales (page 2)
  if (isPage2 && stats && overlays) {
    const lines = []
    const { mean: mu, stdDevS: s } = stats

    if (overlays.mean)   lines.push({ xValue: findBinIndex(mu,        hist), color: '#22d3ee', label: 'μ'  })
    if (overlays.sigma1) {
      lines.push({ xValue: findBinIndex(mu - s,     hist), color: '#a78bfa', label: '-1σ' })
      lines.push({ xValue: findBinIndex(mu + s,     hist), color: '#a78bfa', label: '+1σ' })
    }
    if (overlays.sigma2) {
      lines.push({ xValue: findBinIndex(mu - 2 * s, hist), color: '#fb923c', label: '-2σ' })
      lines.push({ xValue: findBinIndex(mu + 2 * s, hist), color: '#fb923c', label: '+2σ' })
    }
    if (lines.length) plugins.push(makeVertLinesPlugin(lines))
  }

  return {
    type: 'bar',
    data: { labels: hist.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
        title: chartTitle
          ? { display: true, text: chartTitle, color: '#94a3b8', font: { size: 12 } }
          : { display: false },
      },
      scales: scalesConfig(overlays?.grid ?? true),
    },
    plugins,
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function scalesConfig(showGrid) {
  const gridColor = showGrid ? 'rgba(100,116,139,0.2)' : 'transparent'
  return {
    x: {
      ticks: { color: '#64748b', maxRotation: 45, font: { size: 9 } },
      grid:  { color: gridColor },
    },
    y: {
      ticks: { color: '#64748b', font: { size: 10 } },
      grid:  { color: gridColor },
    },
  }
}

function findBinIndex(value, hist) {
  const idx = Math.floor((value - hist.min) / hist.binWidth)
  return Math.max(0, Math.min(hist.labels.length - 1, idx))
}
