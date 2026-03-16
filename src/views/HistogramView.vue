<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { calcStats, skewnessLabel, skewnessStyle, fmt } from '@/utils/stats'
import { generateDistribution }                          from '@/utils/generators'
import { buildChartConfig, createChart, destroyChart }   from '@/utils/histogram'

// ─── State ────────────────────────────────────────────────────────────────────

const manualInput  = ref('')
const distribution = ref('normal')
const n            = ref(200)
const mu           = ref(50)
const sigma        = ref(10)
const lambda       = ref(1)
const chartType    = ref('histogram')
const fillColor    = ref('#0d9488')
const borderColor  = ref('#2dd4bf')
const bins         = ref(15)

const data  = ref([])
const stats = ref(null)

const toast = ref({ show: false, message: '', type: 'info' })

const CHART_ID = 'p1-chart'

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastTimer = null
const showToast = (message, type = 'info') => {
  clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => (toast.value.show = false), 3200)
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
}

// ─── Generar datos ────────────────────────────────────────────────────────────

const generateData = () => {
  const params = {
    mu: mu.value, sigma: sigma.value, lambda: lambda.value,
    uMin: mu.value - sigma.value * Math.sqrt(3),
    uMax: mu.value + sigma.value * Math.sqrt(3),
  }
  const d     = generateDistribution(distribution.value, n.value, params)
  data.value  = d
  stats.value = calcStats(d)
}

// ─── Renderizar gráfico ───────────────────────────────────────────────────────

const renderChart = async () => {
  if (!data.value.length) {
    showToast('No hay datos. Genera o carga datos primero.', 'error')
    return
  }
  await nextTick()
  createChart(CHART_ID, buildChartConfig({
    type: chartType.value, data: data.value, stats: stats.value,
    bins: bins.value, fillColor: fillColor.value,
    borderColor: borderColor.value, isPage2: false,
  }))
}

// ─── Stats cards ─────────────────────────────────────────────────────────────

const statsRows = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { icon: 'x̄',  label: 'Media',                    value: fmt(s.mean,      3) },
    { icon: 'M',   label: 'Mediana',                   value: fmt(s.median,    3) },
    { icon: 'σP',  label: 'Desv. Estándar Poblacional',value: fmt(s.stdDevP,   3) },
    { icon: 's',   label: 'Desv. Estándar Muestral',   value: fmt(s.stdDevS,   3) },
    { icon: 'σ²',  label: 'Varianza Poblacional',       value: fmt(s.varianceP, 3) },
    { icon: 's²',  label: 'Varianza Muestral',          value: fmt(s.varianceS, 3) },
    { icon: '↕',   label: 'Rango',                     value: fmt(s.range,     3) },
    { icon: '▼',   label: 'Mínimo',                    value: fmt(s.min,       3) },
    { icon: '▲',   label: 'Máximo',                    value: fmt(s.max,       3) },
    { icon: 'n',   label: 'Tamaño muestral',            value: s.n                 },
  ]
})

const chartTypes = [
  { value: 'histogram', label: 'Histograma', icon: '▦' },
  { value: 'bell',      label: 'Campana',    icon: '◠' },
  { value: 'radar',     label: 'Radar',      icon: '◎' },
  { value: 'scatter',   label: 'Dispersión', icon: '⋯' },
]

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => { generateData(); nextTick(() => renderChart()) })
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

    <!-- Page heading -->
    <div class="mb-5 flex items-start justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-mono text-teal-600 uppercase tracking-widest">Herramienta 01</span>
        </div>
        <h1 class="text-xl font-bold text-slate-100">Generador de Histogramas</h1>
        <p class="text-slate-500 text-xs mt-0.5">Carga o genera datos y visualiza su distribución estadística</p>
      </div>
      <span v-if="data.length" class="badge-teal self-start mt-1">
        n = {{ data.length }}
      </span>
    </div>

    <!-- ── MAIN GRID: resultado izquierda | controles derecha ──────────────── -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

      <!-- ── LEFT: chart + stats ───────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Chart panel -->
        <div class="panel p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="section-header mb-0">
              <span class="text-sm font-semibold text-slate-200">Visualización</span>
            </div>
            <span class="text-xs text-slate-600 font-mono">
              {{ chartType }} · {{ bins }} bins
            </span>
          </div>

          <!-- Empty state -->
          <div v-if="!data.length" class="flex flex-col items-center justify-center py-16 text-center">
            <div class="text-4xl opacity-20 mb-3">◈</div>
            <p class="text-slate-500 text-sm">Sin datos para visualizar</p>
          </div>

          <div v-else style="position:relative; height:320px; width:100%">
            <canvas :id="CHART_ID" />
          </div>
        </div>

        <!-- Stats table -->
        <div class="panel p-4">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Estadísticas Descriptivas</span>
          </div>

          <div v-if="!stats" class="py-8 text-center text-slate-600 text-sm">
            Genera datos para ver las métricas
          </div>

          <div v-else class="space-y-1.5">
            <!-- Stats in two columns -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div v-for="row in statsRows" :key="row.label" class="stat-row">
                <span class="text-xs font-bold text-teal-500 w-8 text-center shrink-0 font-mono">
                  {{ row.icon }}
                </span>
                <span class="text-xs text-slate-400 flex-1">{{ row.label }}</span>
                <span class="text-xs font-semibold text-slate-100 font-mono">{{ row.value }}</span>
              </div>
            </div>

            <!-- Skewness -->
            <div
              class="mt-3 p-3 rounded-lg border flex items-center gap-3"
              :class="skewnessStyle(stats.skewness).border"
            >
              <span
                class="text-lg font-bold w-6 text-center shrink-0"
                :class="skewnessStyle(stats.skewness).color"
              >
                {{ skewnessStyle(stats.skewness).icon }}
              </span>
              <div class="flex-1 min-w-0">
                <div class="text-xs text-slate-500 mb-0.5">Tipo de sesgo</div>
                <div class="text-xs font-semibold" :class="skewnessStyle(stats.skewness).color">
                  {{ skewnessLabel(stats.skewness) }}
                </div>
              </div>
              <span class="text-xs font-mono text-slate-500 shrink-0">
                {{ fmt(stats.skewness, 4) }}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- ── RIGHT: controls ───────────────────────────────────────────────── -->
      <div class="space-y-4">

        <!-- Manual input -->
        <div class="panel p-4">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Datos Manuales</span>
          </div>
          <textarea
            v-model="manualInput"
            rows="3"
            placeholder="12.5, 8.3, 15.7, 9.1 ...&#10;o uno por línea"
            class="f-input font-mono text-xs resize-none"
          />
          <button @click="loadManualData" class="btn-outline w-full py-2 text-xs font-medium mt-2.5">
            Cargar datos manuales
          </button>
        </div>

        <!-- Auto generation -->
        <div class="panel p-4">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Generación Automática</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-500 mb-1 block">Distribución</label>
              <select v-model="distribution" class="f-input text-sm">
                <option value="normal">Normal</option>
                <option value="uniform">Uniforme</option>
                <option value="exponential">Exponencial</option>
                <option value="skewed">Sesgada</option>
              </select>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <label class="text-xs text-slate-500">Cantidad de datos</label>
                <span class="text-xs font-mono text-teal-400">n = {{ n }}</span>
              </div>
              <input type="range" v-model.number="n" min="10" max="1000" class="w-full" />
              <div class="flex justify-between text-xs text-slate-700 mt-0.5"><span>10</span><span>1000</span></div>
            </div>
            <div v-if="distribution !== 'exponential'" class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Media (μ)</label>
                <input type="number" v-model.number="mu" step="0.5" class="f-input text-sm" />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Desv. est. (σ)</label>
                <input type="number" v-model.number="sigma" min="0.01" step="0.1" class="f-input text-sm" />
              </div>
            </div>
            <div v-else>
              <label class="text-xs text-slate-500 mb-1 block">Tasa (λ)</label>
              <input type="number" v-model.number="lambda" min="0.01" step="0.1" class="f-input text-sm" />
            </div>
            <button @click="generateData(); renderChart()" class="btn-primary w-full py-2.5 text-sm font-semibold">
              ◈ Generar datos
            </button>
          </div>
        </div>

        <!-- Chart config -->
        <div class="panel p-4">
          <div class="section-header">
            <span class="text-sm font-semibold text-slate-200">Configuración Visual</span>
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
                <label class="text-xs text-slate-500 mb-1 block">Relleno</label>
                <input type="color" v-model="fillColor"
                  class="h-9 w-full rounded border border-slate-700 cursor-pointer bg-transparent" />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Borde</label>
                <input type="color" v-model="borderColor"
                  class="h-9 w-full rounded border border-slate-700 cursor-pointer bg-transparent" />
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <label class="text-xs text-slate-500">Número de bins</label>
                <span class="text-xs font-mono text-teal-400">{{ bins }}</span>
              </div>
              <input type="range" v-model.number="bins" min="3" max="50" class="w-full" />
              <div class="flex justify-between text-xs text-slate-700 mt-0.5"><span>3</span><span>50</span></div>
            </div>
            <button @click="renderChart" class="btn-primary w-full py-2.5 text-sm font-semibold">
              ▦ Actualizar gráfico
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
