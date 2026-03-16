<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { calcStats, fmt, skewnessLabel, skewnessStyle, kurtosisLabel } from '@/utils/stats'
import { generateDistribution, distLabel, setRng }                     from '@/utils/generators'
import { buildChartConfig, createChart, destroyChart, modeFromHistogram, buildHistogram } from '@/utils/histogram'

// ─── State ────────────────────────────────────────────────────────────────────

const distribution = ref('normal')
const n            = ref(500)
const mu           = ref(0)
const sigma        = ref(1)
const lambda       = ref(1)
const uMin         = ref(0)
const uMax         = ref(10)
const bmu1         = ref(-3)
const bsigma1      = ref(1)
const bmu2         = ref(3)
const bsigma2      = ref(1)
const seed         = ref(null)
const bins         = ref(25)

const chartType  = ref('histogram')
const fillColor  = ref('#0d9488')
const curveColor = ref('#f59e0b')
const overlays   = ref({ curve: true, mean: true, sigma1: true, sigma2: false, grid: true })

const manualInput = ref('')
const showManual  = ref(false)

const data  = ref([])
const stats = ref(null)

const toast = ref({ show: false, message: '', type: 'info' })

const CHART_ID = 'p2-chart'

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastTimer = null
const showToast = (message, type = 'info') => {
  clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => (toast.value.show = false), 3200)
}

// ─── Parámetros ───────────────────────────────────────────────────────────────

const params = computed(() => ({
  mu: mu.value, sigma: sigma.value, lambda: lambda.value,
  uMin: uMin.value, uMax: uMax.value,
  bmu1: bmu1.value, bsigma1: bsigma1.value,
  bmu2: bmu2.value, bsigma2: bsigma2.value,
}))

// ─── Simular ──────────────────────────────────────────────────────────────────

const simulate = async () => {
  setRng(seed.value || null)
  const d    = generateDistribution(distribution.value, n.value, params.value)
  data.value  = d
  stats.value = calcStats(d)
  await nextTick()
  renderChart()
}

// ─── Datos manuales ───────────────────────────────────────────────────────────

const loadManualData = () => {
  const raw  = manualInput.value.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
  const nums = raw.map(Number)
  if (!raw.length || nums.some(isNaN)) {
    showToast('Datos inválidos.', 'error'); return
  }
  data.value  = nums
  stats.value = calcStats(nums)
  showToast(`${nums.length} datos cargados.`, 'success')
  nextTick(() => renderChart())
}

// ─── Renderizar ───────────────────────────────────────────────────────────────

const renderChart = async () => {
  if (!data.value.length) return
  await nextTick()
  createChart(CHART_ID, buildChartConfig({
    type: chartType.value, data: data.value, stats: stats.value,
    bins: bins.value, fillColor: fillColor.value, curveColor: curveColor.value,
    overlays: overlays.value,
    chartTitle: `${distLabel(distribution.value)} · n = ${data.value.length}`,
    isPage2: true,
  }))
}

watch([chartType, fillColor, curveColor, bins, overlays], () => {
  if (data.value.length) renderChart()
}, { deep: true })

// ─── Stats cards ─────────────────────────────────────────────────────────────

const statsRows = computed(() => {
  const s = stats.value
  if (!s || !data.value.length) return []
  const hist    = buildHistogram(data.value, bins.value)
  const modeVal = modeFromHistogram(hist.counts, hist.labels)
  return [
    { icon: 'μ̂',  group: 'Tendencia', label: 'Media',              value: fmt(s.mean,      3) },
    { icon: 'M',   group: 'Tendencia', label: 'Mediana',             value: fmt(s.median,    3) },
    { icon: 'Mo',  group: 'Tendencia', label: 'Moda (bin)',           value: modeVal               },
    { icon: 's²',  group: 'Dispersión', label: 'Varianza Muestral',  value: fmt(s.varianceS, 3) },
    { icon: 'σ²',  group: 'Dispersión', label: 'Varianza Pobl.',     value: fmt(s.varianceP, 3) },
    { icon: 's',   group: 'Dispersión', label: 'Desv. Muestral',     value: fmt(s.stdDevS,   3) },
    { icon: 'σ',   group: 'Dispersión', label: 'Desv. Pobl.',        value: fmt(s.stdDevP,   3) },
    { icon: 'SE',  group: 'Dispersión', label: 'Error Estándar',     value: fmt(s.se,        4) },
    { icon: 'CV',  group: 'Dispersión', label: 'Coef. Variación',    value: fmt(s.cv, 1) + '%'  },
    { icon: 'γ₁',  group: 'Forma',      label: 'Asimetría',          value: fmt(s.skewness,  4) },
    { icon: 'κ',   group: 'Forma',      label: 'Curtosis',           value: fmt(s.kurtosis,  4) },
    { icon: 'Q1',  group: 'Posición',   label: 'Percentil 25',       value: fmt(s.p25,       3) },
    { icon: 'Q2',  group: 'Posición',   label: 'Percentil 50',       value: fmt(s.p50,       3) },
    { icon: 'Q3',  group: 'Posición',   label: 'Percentil 75',       value: fmt(s.p75,       3) },
    { icon: 'IQR', group: 'Posición',   label: 'Rango IQR',          value: fmt(s.iqr,       3) },
    { icon: 'n',   group: 'Muestra',    label: 'Tamaño muestral',    value: s.n                   },
  ]
})

// Agrupar por categoría
const statGroups = computed(() => {
  const groups = {}
  statsRows.value.forEach((r) => {
    if (!groups[r.group]) groups[r.group] = []
    groups[r.group].push(r)
  })
  return groups
})

// ─── Interpretación ───────────────────────────────────────────────────────────

const interpretation = computed(() => {
  const s = stats.value
  if (!s) return []
  const sk = s.skewness, ku = s.kurtosis
  const lines = []

  lines.push({
    label: 'Normalidad',
    text: Math.abs(sk) < 0.5 && Math.abs(ku) < 0.5
      ? 'Los datos siguen aproximadamente una distribución normal.'
      : `Se aleja de la normal (asimetría=${fmt(sk,3)}, curtosis=${fmt(ku,3)}).`,
    ok: Math.abs(sk) < 0.5 && Math.abs(ku) < 0.5,
  })
  lines.push({
    label: 'Sesgo',
    text: sk > 0.5  ? 'Sesgo positivo: cola extendida hacia valores altos. Media > Mediana.'
        : sk < -0.5 ? 'Sesgo negativo: cola extendida hacia valores bajos. Media < Mediana.'
        : 'Distribución simétrica; media y mediana son cercanas.',
    ok: Math.abs(sk) <= 0.5,
  })
  lines.push({
    label: 'Curtosis',
    text: `${kurtosisLabel(ku)} (κ = ${fmt(ku,3)}).`,
    ok: Math.abs(ku) <= 0.5,
  })
  lines.push({
    label: 'Dispersión',
    text: s.cv < 15 ? `Dispersión baja (CV=${fmt(s.cv,1)}%): datos concentrados en la media.`
        : s.cv < 35 ? `Dispersión moderada (CV=${fmt(s.cv,1)}%): variabilidad aceptable.`
        : `Dispersión alta (CV=${fmt(s.cv,1)}%): la media puede no ser representativa.`,
    ok: s.cv < 35,
  })
  lines.push({
    label: 'Representatividad',
    text: Math.abs(s.mean - s.median) / (Math.abs(s.mean) + 1e-10) < 0.05
      ? 'La media es altamente representativa del centro de la distribución.'
      : 'La media puede estar sesgada por valores atípicos; evalúe la mediana.',
    ok: Math.abs(s.mean - s.median) / (Math.abs(s.mean) + 1e-10) < 0.05,
  })
  return lines
})

// ─── Chart types / overlay options ───────────────────────────────────────────

const chartTypes = [
  { value: 'histogram', label: 'Histograma', icon: '▦' },
  { value: 'bell',      label: 'Campana',    icon: '◠' },
  { value: 'radar',     label: 'Radar',      icon: '◎' },
  { value: 'scatter',   label: 'Dispersión', icon: '⋯' },
]

const overlayOptions = [
  { key: 'curve',  label: 'Curva teórica' },
  { key: 'mean',   label: 'Línea media'   },
  { key: 'sigma1', label: '± 1σ'          },
  { key: 'sigma2', label: '± 2σ'          },
  { key: 'grid',   label: 'Grilla'        },
]

const groupColors = {
  'Tendencia':  'text-teal-400',
  'Dispersión': 'text-emerald-400',
  'Forma':      'text-amber-400',
  'Posición':   'text-sky-400',
  'Muestra':    'text-slate-400',
}

onMounted(() => simulate())
onBeforeUnmount(() => destroyChart(CHART_ID))
</script>

<template>
  <!-- Toast -->
  <Teleport to="body">
    <div v-if="toast.show" class="fixed top-16 right-4 z-[9999] toast-enter">
      <div
        :class="toast.type === 'error' ? 'border-red-500/40 bg-red-950/80' : 'border-teal-500/40 bg-teal-950/80'"
        class="px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2 text-xs font-medium text-slate-200"
      >
        <span>{{ toast.type === 'error' ? '✕' : '✓' }}</span>
        {{ toast.message }}
      </div>
    </div>
  </Teleport>

  <div class="page-enter max-w-screen-xl mx-auto px-5 py-6">

    <!-- Heading -->
    <div class="mb-5 flex items-start justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-mono text-teal-600 uppercase tracking-widest">Herramienta 02</span>
        </div>
        <h1 class="text-xl font-bold text-slate-100">Simulador Estadístico Avanzado</h1>
        <p class="text-slate-500 text-xs mt-0.5">Exploración profunda de distribuciones con análisis automático</p>
      </div>
      <span v-if="data.length" class="badge-teal self-start mt-1 font-mono">
        n = {{ data.length }}
      </span>
    </div>

    <!-- ── GRID: resultado izquierda | controles derecha ──────────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

      <!-- ── LEFT ─────────────────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Chart -->
        <div class="panel p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="section-header mb-0">
              <span class="text-sm font-semibold text-slate-200">
                {{ data.length ? distLabel(distribution) : 'Gráfico' }}
              </span>
            </div>
            <span v-if="stats" class="text-xs font-mono text-slate-500">
              μ={{ fmt(stats.mean,2) }} · σ={{ fmt(stats.stdDevS,2) }}
            </span>
          </div>

          <div v-if="!data.length" class="flex flex-col items-center justify-center py-16 text-center">
            <div class="text-4xl opacity-20 mb-3">◈</div>
            <p class="text-slate-500 text-sm">Sin simulación activa</p>
            <p class="text-slate-700 text-xs mt-1">Configura los parámetros y presiona Simular</p>
          </div>

          <div v-else style="position:relative; height:340px; width:100%">
            <canvas :id="CHART_ID" />
          </div>
        </div>

        <!-- Interpretation -->
        <div v-if="stats" class="panel p-4 fade-in">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Interpretación Automática</span>
          </div>
          <div class="space-y-2">
            <div
              v-for="line in interpretation" :key="line.label"
              class="interp-line flex items-start gap-3"
              :style="line.ok ? '' : 'border-left-color:#f59e0b; background:rgba(245,158,11,0.05)'"
            >
              <span
                class="text-xs font-semibold shrink-0 mt-0.5 w-20"
                :style="line.ok ? 'color:#0d9488' : 'color:#f59e0b'"
              >
                {{ line.label }}
              </span>
              <span>{{ line.text }}</span>
            </div>
          </div>
        </div>

        <!-- Metrics grouped -->
        <div v-if="stats" class="panel p-4 fade-in">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Métricas Completas</span>
          </div>
          <div class="space-y-3">
            <div v-for="(rows, group) in statGroups" :key="group">
              <div class="text-xs font-semibold mb-1.5 pb-1 border-b border-slate-800"
                   :class="groupColors[group] ?? 'text-slate-500'">
                {{ group }}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <div v-for="row in rows" :key="row.label" class="stat-row">
                  <span class="text-xs font-bold w-8 text-center shrink-0 font-mono"
                        :class="groupColors[group] ?? 'text-slate-500'">
                    {{ row.icon }}
                  </span>
                  <span class="text-xs text-slate-400 flex-1">{{ row.label }}</span>
                  <span class="text-xs font-semibold text-slate-100 font-mono">{{ row.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── RIGHT: controls ───────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Distribution -->
        <div class="panel p-4">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Distribución</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-500 mb-1 block">Tipo</label>
              <select v-model="distribution" class="f-input text-sm">
                <option value="normal">Normal</option>
                <option value="uniform">Uniforme</option>
                <option value="exponential">Exponencial</option>
                <option value="skewedPos">Sesgada Positiva</option>
                <option value="skewedNeg">Sesgada Negativa</option>
                <option value="bimodal">Bimodal</option>
              </select>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <label class="text-xs text-slate-500">Tamaño de muestra</label>
                <span class="text-xs font-mono text-teal-400">n = {{ n }}</span>
              </div>
              <input type="range" v-model.number="n" min="20" max="2000" class="w-full" />
              <div class="flex justify-between text-xs text-slate-700 mt-0.5"><span>20</span><span>2000</span></div>
            </div>

            <!-- Normal / Sesgada -->
            <div v-if="['normal','skewedPos','skewedNeg'].includes(distribution)" class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-slate-500 mb-1 block">μ (media)</label>
                <input type="number" v-model.number="mu" step="0.5" class="f-input text-sm" />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">σ (desv. est.)</label>
                <input type="number" v-model.number="sigma" min="0.01" step="0.1" class="f-input text-sm" />
              </div>
            </div>

            <!-- Uniforme -->
            <div v-if="distribution === 'uniform'" class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Mínimo</label>
                <input type="number" v-model.number="uMin" step="1" class="f-input text-sm" />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Máximo</label>
                <input type="number" v-model.number="uMax" step="1" class="f-input text-sm" />
              </div>
            </div>

            <!-- Exponencial -->
            <div v-if="distribution === 'exponential'">
              <label class="text-xs text-slate-500 mb-1 block">Tasa (λ)</label>
              <input type="number" v-model.number="lambda" min="0.01" step="0.1" class="f-input text-sm" />
            </div>

            <!-- Bimodal -->
            <div v-if="distribution === 'bimodal'" class="space-y-2">
              <div class="text-xs text-teal-600 font-semibold">Componente 1</div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">μ₁</label>
                  <input type="number" v-model.number="bmu1" step="0.5" class="f-input text-sm" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">σ₁</label>
                  <input type="number" v-model.number="bsigma1" min="0.01" step="0.1" class="f-input text-sm" />
                </div>
              </div>
              <div class="text-xs text-emerald-600 font-semibold">Componente 2</div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">μ₂</label>
                  <input type="number" v-model.number="bmu2" step="0.5" class="f-input text-sm" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">σ₂</label>
                  <input type="number" v-model.number="bsigma2" min="0.01" step="0.1" class="f-input text-sm" />
                </div>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-500 mb-1 block">Semilla aleatoria (opcional)</label>
              <input type="number" v-model.number="seed" placeholder="Sin semilla" class="f-input text-sm" />
            </div>

            <button @click="simulate" class="btn-primary w-full py-2.5 text-sm font-semibold">
              ◈ Simular
            </button>

            <!-- Manual toggle -->
            <div class="border-t border-slate-800 pt-2.5">
              <button @click="showManual = !showManual"
                class="text-xs text-teal-600 hover:text-teal-400 transition-colors">
                {{ showManual ? '▼' : '▶' }} Ingresar datos manuales
              </button>
              <div v-if="showManual" class="mt-2 space-y-2">
                <textarea
                  v-model="manualInput" rows="3"
                  placeholder="Números separados por comas..."
                  class="f-input font-mono text-xs resize-none"
                />
                <button @click="loadManualData" class="btn-outline w-full py-2 text-xs font-medium">
                  Cargar datos
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual config -->
        <div class="panel p-4">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Visualización</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-500 mb-1.5 block">Tipo de gráfico</label>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="ct in chartTypes" :key="ct.value"
                  @click="chartType = ct.value"
                  :class="['chart-btn py-2 px-3 text-xs font-medium', chartType === ct.value ? 'active' : '']"
                >
                  <span class="mr-1">{{ ct.icon }}</span>{{ ct.label }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Color relleno</label>
                <input type="color" v-model="fillColor"
                  class="h-9 w-full rounded border border-slate-700 cursor-pointer bg-transparent" />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Curva teórica</label>
                <input type="color" v-model="curveColor"
                  class="h-9 w-full rounded border border-slate-700 cursor-pointer bg-transparent" />
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <label class="text-xs text-slate-500">Bins</label>
                <span class="text-xs font-mono text-teal-400">{{ bins }}</span>
              </div>
              <input type="range" v-model.number="bins" min="3" max="60" class="w-full" />
              <div class="flex justify-between text-xs text-slate-700 mt-0.5"><span>3</span><span>60</span></div>
            </div>

            <div>
              <p class="text-xs text-slate-500 mb-2">Capas activas</p>
              <div class="space-y-1.5">
                <label
                  v-for="opt in overlayOptions" :key="opt.key"
                  class="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300"
                >
                  <input type="checkbox" v-model="overlays[opt.key]"
                    class="w-3.5 h-3.5 cursor-pointer accent-teal-500 rounded" />
                  {{ opt.label }}
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
