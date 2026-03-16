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
const fillColor    = ref('#6366f1')
const borderColor  = ref('#818cf8')
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

// ─── Generar datos automáticamente ───────────────────────────────────────────

const generateData = () => {
  const params = { mu: mu.value, sigma: sigma.value, lambda: lambda.value,
                   uMin: mu.value - sigma.value * Math.sqrt(3),
                   uMax: mu.value + sigma.value * Math.sqrt(3) }
  const d      = generateDistribution(distribution.value, n.value, params)
  data.value   = d
  stats.value  = calcStats(d)
}

// ─── Renderizar gráfico ───────────────────────────────────────────────────────

const renderChart = async () => {
  if (!data.value.length) {
    showToast('No hay datos. Genera o carga datos primero.', 'error')
    return
  }
  await nextTick()
  const config = buildChartConfig({
    type:        chartType.value,
    data:        data.value,
    stats:       stats.value,
    bins:        bins.value,
    fillColor:   fillColor.value,
    borderColor: borderColor.value,
    isPage2:     false,
  })
  createChart(CHART_ID, config)
}

// ─── Computed: tarjetas de stats ──────────────────────────────────────────────

const statsCards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { icon: 'x̄',  label: 'Media',               value: fmt(s.mean,    3) },
    { icon: 'M',   label: 'Mediana',              value: fmt(s.median,  3) },
    { icon: 'σP',  label: 'Desv. Estándar Pobl.', value: fmt(s.stdDevP, 3) },
    { icon: 's',   label: 'Desv. Estándar Mues.', value: fmt(s.stdDevS, 3) },
    { icon: 'σ²',  label: 'Varianza Pobl.',        value: fmt(s.varianceP, 3) },
    { icon: 's²',  label: 'Varianza Muestral',     value: fmt(s.varianceS, 3) },
    { icon: '↕',   label: 'Rango',                value: fmt(s.range,   3) },
    { icon: '▼',   label: 'Mínimo',               value: fmt(s.min,     3) },
    { icon: '▲',   label: 'Máximo',               value: fmt(s.max,     3) },
    { icon: 'n',   label: 'Tamaño',               value: s.n             },
  ]
})

const chartTypes = [
  { value: 'histogram', label: 'Histograma', icon: '📊' },
  { value: 'bell',      label: 'Campana',    icon: '🔔' },
  { value: 'radar',     label: 'Radar',      icon: '🕸️' },
  { value: 'scatter',   label: 'Dispersión', icon: '✦'  },
]

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  generateData()
  nextTick(() => renderChart())
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
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-white">Generador de Histogramas</h2>
      <p class="text-slate-400 text-sm mt-1">Ingresa datos manualmente o genera distribuciones automáticamente</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- ── LEFT PANEL ──────────────────────────────────────────────────── -->
      <div class="space-y-5">

        <!-- Ingreso manual -->
        <div class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-indigo-400">✏️</span> Ingreso Manual de Datos
          </h3>
          <textarea
            v-model="manualInput"
            rows="4"
            placeholder="Ejemplo: 12.5, 8.3, 15.7, 9.1&#10;O uno por línea..."
            class="font-mono text-sm resize-none w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
          />
          <div class="flex items-center justify-between mt-3">
            <button @click="loadManualData" class="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white">
              Cargar datos
            </button>
            <span
              v-if="data.length"
              class="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs px-3 py-1 rounded-full"
            >
              {{ data.length }} datos
            </span>
          </div>
        </div>

        <!-- Generación automática -->
        <div class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-violet-400">⚡</span> Generación Automática
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-400 mb-1 block">Distribución</label>
              <select v-model="distribution" class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500">
                <option value="normal">Normal</option>
                <option value="uniform">Uniforme</option>
                <option value="exponential">Exponencial</option>
                <option value="skewed">Sesgada</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">Cantidad de datos (n = {{ n }})</label>
              <input type="range" v-model.number="n" min="10" max="1000" class="w-full" />
              <div class="flex justify-between text-xs text-slate-600 mt-0.5"><span>10</span><span>1000</span></div>
            </div>
            <div v-if="distribution !== 'exponential'" class="grid grid-cols-2 gap-3">
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
            <div v-else>
              <label class="text-xs text-slate-400 mb-1 block">Tasa (λ)</label>
              <input type="number" v-model.number="lambda" min="0.01" step="0.1"
                class="rounded-lg bg-slate-800 border border-slate-700 text-white w-full px-3 py-2 focus:outline-none focus:border-indigo-500" />
            </div>
            <button @click="generateData(); renderChart()" class="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white">
              ⚡ Generar datos automáticamente
            </button>
          </div>
        </div>

        <!-- Config del gráfico -->
        <div class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-emerald-400">🎨</span> Configuración del Gráfico
          </h3>
          <div class="space-y-3">
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
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Color principal</label>
                <input type="color" v-model="fillColor"
                  class="h-10 w-full rounded-lg border border-slate-600 cursor-pointer bg-transparent" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">Color de borde</label>
                <input type="color" v-model="borderColor"
                  class="h-10 w-full rounded-lg border border-slate-600 cursor-pointer bg-transparent" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">Número de bins ({{ bins }})</label>
              <input type="range" v-model.number="bins" min="3" max="50" class="w-full" />
              <div class="flex justify-between text-xs text-slate-600 mt-0.5"><span>3</span><span>50</span></div>
            </div>
            <button @click="renderChart" class="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold text-white">
              📊 Generar gráfico
            </button>
          </div>
        </div>

      </div>

      <!-- ── RIGHT PANEL ─────────────────────────────────────────────────── -->
      <div class="space-y-5">

        <!-- Stats -->
        <div v-if="stats" class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-indigo-400">📐</span> Estadísticas Calculadas
          </h3>
          <div class="grid grid-cols-2 gap-2.5">
            <div v-for="s in statsCards" :key="s.label" class="stat-card rounded-xl p-3">
              <div class="text-base font-bold text-indigo-400 mb-0.5">{{ s.icon }}</div>
              <div class="text-xs text-slate-400 leading-tight">{{ s.label }}</div>
              <div class="text-sm font-bold text-white mt-0.5">{{ s.value }}</div>
            </div>
          </div>

          <!-- Sesgo badge -->
          <div
            class="mt-3 p-3 rounded-xl border"
            :class="skewnessStyle(stats.skewness).border"
          >
            <div class="flex items-start gap-2">
              <span class="text-xl mt-0.5 font-bold" :class="skewnessStyle(stats.skewness).color">{{ skewnessStyle(stats.skewness).icon }}</span>
              <div>
                <div class="text-xs text-slate-400">Tipo de sesgo</div>
                <div class="text-sm font-semibold" :class="skewnessStyle(stats.skewness).color">
                  {{ skewnessLabel(stats.skewness) }}
                </div>
                <div class="text-xs text-slate-500 mt-0.5">
                  Coef. Pearson: {{ fmt(stats.skewness, 4) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="glass rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div class="text-6xl mb-4 opacity-30">📉</div>
          <p class="text-slate-400 font-medium">Sin datos cargados</p>
          <p class="text-slate-600 text-sm mt-1">Genera o ingresa datos para ver las estadísticas</p>
        </div>

        <!-- Gráfico -->
        <div class="glass rounded-2xl p-5">
          <h3 class="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <span class="text-violet-400">📊</span> Visualización
          </h3>
          <div style="position:relative; height:300px; width:100%">
            <canvas :id="CHART_ID" />
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
