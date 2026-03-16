<script setup>
import { RouterView, useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route  = useRoute()

const goTo = (name) => router.push({ name })
</script>

<template>
  <!-- NAVBAR -->
  <nav
    class="fixed top-0 left-0 right-0 z-50 border-b border-slate-800"
    style="background: rgba(2,6,23,0.96); backdrop-filter: blur(14px)"
  >
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="text-2xl">📊</span>
        <div>
          <h1
            class="text-lg font-bold leading-tight"
            style="background:linear-gradient(135deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent"
          >
            Estadística &amp; Probabilidad
          </h1>
          <p class="text-xs text-slate-500 hidden sm:block">Herramientas de Análisis Universitario</p>
        </div>
      </div>

      <div class="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
        <button
          @click="goTo('histogram')"
          :class="route.name === 'histogram' ? 'tab-active' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        >
          📈 Histogramas
        </button>
        <button
          @click="goTo('simulator')"
          :class="route.name === 'simulator' ? 'tab-active' : 'text-slate-400 hover:text-white hover:bg-slate-800'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        >
          🔬 Simulador Avanzado
        </button>
      </div>
    </div>
  </nav>

  <main class="pt-24 pb-20 min-h-screen" style="background:#020617">
    <div class="max-w-7xl mx-auto px-4">
      <RouterView />
    </div>
  </main>

  <footer class="fixed bottom-0 left-0 right-0 border-t border-slate-800" style="background:#020617">
    <div class="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-slate-500">
      <span>Probabilidad &amp; Estadística — Herramientas de Análisis</span>
      <span class="flex items-center gap-1.5">
        📊 Desarrollado por
        <span class="text-slate-300 font-semibold">Byron Alexander Vanegas</span>
        &nbsp;·&nbsp; 2025
      </span>
    </div>
  </footer>
</template>
