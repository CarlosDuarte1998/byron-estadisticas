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
const fillColor  = ref('#6366f1')
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

// ─── Parámetros por distribución ─────────────────────────────────────────────

const params = computed(() => ({
  mu:      mu.value,
  sigma:   sigma.value,
  lambda:  lambda.value,
  uMin:    uMin.value,
  uMax:    uMax.value,
  bmu1:    bmu1.value,
  bsigma1: bsigma1.value,
  bmu2:    bmu2.value,
  bsigma2: bsigma2.value,
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

// ─── Cargar datos manuales ────────────────────────────────────────────────────

const loadManualData = () => {
  const raw  = manualInput.value.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
  const nums = raw.map(Number)
  if (!raw.length || nums.some(isNaN)) {
    showToast('Datos inválidos. Ingresa números separados por comas o saltos de línea.', 'error')
    return
  }
  data.value  = nums
  stats.value = calcStats(nums)
  showToast(`${nums.length} datos cargados correctamente.`, 'success')
  nextTick(() => renderChart())
}

// ─── Renderizar gráfico ───────────────────────────────────────────────────────

const renderChart = async () => {
  if (!data.value.length) return
  await nextTick()
  const config = buildChartConfig({
    type:        chartType.value,
    data:        data.value,
    stats:       stats.value,
    bins:        bins.value,
    fillColor:   fillColor.value,
    curveColor:  curveColor.value,
    overlays:    overlays.value,
    chartTitle:  `${distLabel(distribution.value)} · n = ${data.value.length}`,
    isPage2:     true,
  })
  createChart(CHART_ID, config)
}

// Re-render al cambiar opciones visuales
watch([chartType, fillColor, curveColor, bins, overlays], () => {
  if (data.value.length) renderChart()
}, { deep: true })

// ─── Stats cards ─────────────────────────────────────────────────────────────

const statsCards = computed(() => {
  const s = stats.value
  if (!s || !data.value.length) return []
  const hist    = buildHistogram(data.value, bins.value)
  const modeVal = modeFromHistogram(hist.counts, hist.labels)
  return [
    { icon: 'μ̂',  label: 'Media',            value: fmt(s.mean,      3) },
    { icon: 'M',   label: 'Mediana',           value: fmt(s.median,    3) },
    { icon: 'Mo',  label: 'Moda (bin)',         value: modeVal               },
    { icon: 's²',  label: 'Varianza Muestral',  value: fmt(s.varianceS, 3) },
    { icon: 'σ²',  label: 'Varianza Pobl.',     value: fmt(s.varianceP, 3) },
    { icon: 's',   label: 'Desv. Muestral',     value: fmt(s.stdDevS,   3) },
    { icon: 'σ',   label: 'Desv. Pobl.',        value: fmt(s.stdDevP,   3) },
    { icon: 'SE',  label: 'Error Estándar',     value: fmt(s.se,        4) },
    { icon: 'CV',  label: 'Coef. Variación',    value: fmt(s.cv,        1) + '%' },
    { icon: 'γ₁',  label: 'Asimetría',          value: fmt(s.skewness,  4) },
    { icon: 'κ',   label: 'Curtosis',           value: fmt(s.kurtosis,  4) },
    { icon: 'Q1',  label: 'P25',               value: fmt(s.p25,       3) },
    { icon: 'Q2',  label: 'P50',               value: fmt(s.p50,       3) },
    { icon: 'Q3',  label: 'P75',               value: fmt(s.p75,       3) },
    { icon: 'IQR', label: 'Rango IQR',          value: fmt(s.iqr,       3) },
    { icon: 'n',   label: 'Tamaño muestral',    value: s.n                   },
  ]
})

// ─── Interpretación automática ────────────────────────────────────────────────

const interpretation = computed(() => {
  const s = stats.value
  if (!s) return []
  const lines = []
  const sk = s.skewness
  const ku = s.kurtosis

  if (Math.abs(sk) < 0.5 && Math.abs(ku) < 0.5) {
    lines.push('Los datos siguen aproximadamente una distribución normal (simetría y curtosis dentro de rangos esperados).')
  } else {
    lines.push(`Los datos se alejan de la normal: asimetría = ${fmt(sk, 3)}, curtosis = ${fmt(ku, 3)}.`)
  }

  if (sk > 0.5)       lines.push('Sesgo positivo: la cola se extiende hacia valores altos. La media es mayor que la mediana.')
  else if (sk < -0.5) lines.push('Sesgo negativo: la cola se extiende hacia valores bajos. La media es menor que la mediana.')
  else                lines.push('Distribución aproximadamente simétrica; media y mediana son cercanas entre sí.')

  lines.push(`Curtosis: ${kurtosisLabel(ku)} (valor = ${fmt(ku, 3)}).`)

  if      (s.cv < 15) lines.push(`Dispersión baja (CV = ${fmt(s.cv, 1)}%): los datos están concentrados alrededor de la media.`)
  else if (s.cv < 35) lines.push(`Dispersión moderada (CV = ${fmt(s.cv, 1)}%): variabilidad aceptable en la muestra.`)
  else                lines.push(`Dispersión alta (CV = ${fmt(s.cv, 1)}%): alta variabilidad; la media puede no ser representativa.`)

  const relDiff = Math.abs(s.mean - s.median) / (Math.abs(s.mean) + 1e-10)
  if (relDiff < 0.05) lines.push('La media es altamente representativa del centro de los datos.')
  else                lines.push('La media puede estar influenciada por valores atípicos; considere la mediana como medida de tendencia central.')

  return lines
})

// ─── Chart types / overlay options ───────────────────────────────────────────

const chartTypes = [
  { value: 'histogram', label: 'Histograma', icon: '📊' },
  { value: 'bell',      label: 'Campana',    icon: '🔔' },
  { value: 'radar',     label: 'Radar',      icon: '🕸️' },
  { value: 'scatter',   label: 'Dispersión', icon: '✦'  },
]

const overlayOptions = [
  { key: 'curve',  label: 'Curva teórica' },
  { key: 'mean',   label: 'Línea media'   },
  { key: 'sigma1', label: '± 1σ'          },
  { key: 'sigma2', label: '± 2σ'          },
  { key: 'grid',   label: 'Grilla'        },
]

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  simulate()
})

onBeforeUnmount(() => destroyChart(CHART_ID))
</script>

<template>
  <!-- Toast -->
  <Teleport to="body">
    <div v-if="toast.show" class="fixed top-5 right-5 z-[9999] toast-enter">
      <div
        :class="toast.type === 'error' ? 'bg-red-600/90' : 'bg-emerald-600/90'"
        class="px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium text-white border border-white/10"
      >
        <span>{{ toast.type === 'error' ? '⚠️' : '✅' }}</span>
        {{ toast.message }}
      </div>
    </div>
  </Teleport>

  <div class="page-enter">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">Simulador Estadístico Avanzado</h2>
      <p class="text-slate-400 text-sm mt-1">Exploración profunda de distribuciones con análisis completo</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- ── LEFT PANEL ──────────────────────────────────────────────────── -->
      <div class="space-y-5">

        <!-- Generación de datos -->
        <div class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-indigo-400">🎲</span> Generación de Datos
          </h3>
          <div class="space-y-3">

            <div>
              <label class="text-xs text-slate-400 mb-1 block">Distribución</label>
              <select v-model="distribution"
                class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500">
                <option value="normal">Normal</option>
                <option value="uniform">Uniforme</option>
                <option value="exponential">Exponencial</option>
                <option value="skewedPos">Sesgada Positiva</option>
                <option value="skewedNeg">Sesgada Negativa</option>
                <option value="bimodal">Bimodal</option>
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-400 mb-1 block">
                Cantidad de datos:
                <span class="text-indigo-300 font-bold">n = {{ n }}</span>
              </label>
              <input type="range" v-model.number="n" min="20" max="2000" class="w-full" />
              <div class="flex justify-between text-xs text-slate-600 mt-0.5"><span>20</span><span>2000</span></div>
            </div>

            <!-- Normal / Sesgada params -->
            <div v-if="['normal','skewedPos','skewedNeg'].includes(distribution)" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Media (μ)</label>
                <input type="number" v-model.number="mu" step="0.5"
                  class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Desv. estándar (σ)</label>
                <input type="number" v-model.number="sigma" min="0.01" step="0.1"
                  class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <!-- Uniforme params -->
            <div v-if="distribution === 'uniform'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Mínimo</label>
                <input type="number" v-model.number="uMin" step="1"
                  class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Máximo</label>
                <input type="number" v-model.number="uMax" step="1"
                  class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <!-- Exponencial params -->
            <div v-if="distribution === 'exponential'">
              <label class="text-xs text-slate-400 mb-1 block">Tasa (λ)</label>
              <input type="number" v-model.number="lambda" min="0.01" step="0.1"
                class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
            </div>

            <!-- Bimodal params -->
            <div v-if="distribution === 'bimodal'" class="space-y-2">
              <p class="text-xs text-slate-500 font-medium">Componente 1</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-400 mb-1 block">μ₁</label>
                  <input type="number" v-model.number="bmu1" step="0.5"
                    class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label class="text-xs text-slate-400 mb-1 block">σ₁</label>
                  <input type="number" v-model.number="bsigma1" min="0.01" step="0.1"
                    class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <p class="text-xs text-slate-500 font-medium">Componente 2</p>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-400 mb-1 block">μ₂</label>
                  <input type="number" v-model.number="bmu2" step="0.5"
                    class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label class="text-xs text-slate-400 mb-1 block">σ₂</label>
                  <input type="number" v-model.number="bsigma2" min="0.01" step="0.1"
                    class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Semilla (seed)</label>
                <input type="number" v-model.number="seed" placeholder="Aleatoria"
                  class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Bins ({{ bins }})</label>
                <input type="range" v-model.number="bins" min="3" max="60" class="w-full mt-2.5" />
              </div>
            </div>

            <button @click="simulate" class="btn-primary w-full py-3 rounded-xl font-bold text-white text-base">
              🔬 Simular
            </button>

            <!-- Manual toggle -->
            <div class="border-t border-slate-700 pt-3">
              <button @click="showManual = !showManual"
                class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                {{ showManual ? '▼' : '▶' }} Ingresar datos manualmente
              </button>
              <div v-if="showManual" class="mt-2 space-y-2">
                <textarea
                  v-model="manualInput"
                  rows="3"
                  placeholder="Números separados por comas o saltos de línea..."
                  class="font-mono text-sm resize-none w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
                <button @click="loadManualData" class="btn-secondary w-full py-2 rounded-xl text-sm text-slate-200">
                  Cargar datos manuales
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- Personalización visual -->
        <div class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-violet-400">🎨</span> Personalización Visual
          </h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Color relleno</label>
                <input type="color" v-model="fillColor"
                  class="h-10 w-full rounded-lg border border-slate-600 cursor-pointer bg-transparent" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Color curva teórica</label>
                <input type="color" v-model="curveColor"
                  class="h-10 w-full rounded-lg border border-slate-600 cursor-pointer bg-transparent" />
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 mb-2 block">Tipo de gráfico</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="ct in chartTypes" :key="ct.value"
                  @click="chartType = ct.value"
                  :class="chartType === ct.value ? 'tab-active' : 'btn-secondary text-slate-300'"
                  class="py-2 px-3 rounded-xl text-xs font-medium"
                >
                  {{ ct.icon }} {{ ct.label }}
                </button>
              </div>
            </div>

            <div>
              <p class="text-xs text-slate-400 mb-2">Mostrar / Ocultar capas</p>
              <div class="grid grid-cols-2 gap-y-1.5 gap-x-3">
                <label
                  v-for="opt in overlayOptions" :key="opt.key"
                  class="flex items-center gap-2 cursor-pointer text-xs text-slate-300"
                >
                  <input type="checkbox" v-model="overlays[opt.key]"
                    class="accent-indigo-500 w-4 h-4 cursor-pointer" />
                  {{ opt.label }}
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── RIGHT PANEL ─────────────────────────────────────────────────── -->
      <div class="space-y-5">

        <!-- Métricas -->
        <div v-if="stats" class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-indigo-400">📊</span> Métricas Completas
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div v-for="s in statsCards" :key="s.label" class="stat-card rounded-xl p-3">
              <div class="text-sm font-bold text-indigo-400 mb-0.5">{{ s.icon }}</div>
              <div class="text-xs text-slate-400 leading-tight">{{ s.label }}</div>
              <div class="text-sm font-bold text-white mt-0.5 truncate">{{ s.value }}</div>
            </div>
          </div>
        </div>

        <!-- Interpretación automática -->
        <div v-if="stats" class="glass rounded-2xl p-5 border border-indigo-500/20">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <span class="text-amber-400">🧠</span> Interpretación Automática
          </h3>
          <div class="space-y-2">
            <div v-for="(line, i) in interpretation" :key="i"
              class="flex items-start gap-2 text-sm text-slate-300">
              <span class="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span>{{ line }}</span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!stats" class="glass rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div class="text-6xl mb-4 opacity-30">🔬</div>
          <p class="text-slate-400 font-medium">Sin simulación activa</p>
          <p class="text-slate-600 text-sm mt-1">Configura los parámetros y presiona Simular</p>
        </div>

        <!-- Gráfico -->
        <div class="glass rounded-2xl p-5">
          <div v-if="stats" class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-slate-300">
              {{ distLabel(distribution) }} · n = {{ data.length }}
            </h3>
            <span class="text-xs text-slate-500">
              μ = {{ fmt(stats?.mean, 2) }} · σ = {{ fmt(stats?.stdDevS, 2) }}
            </span>
          </div>
          <h3 v-else class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-violet-400">📈</span> Gráfico
          </h3>
          <div style="position:relative; height:320px; width:100%">
            <canvas :id="CHART_ID" />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
