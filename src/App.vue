<script setup>
import { RouterView, useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route  = useRoute()
const goTo   = (name) => router.push({ name })
</script>

<template>
  <!-- ── TOP NAVBAR ─────────────────────────────────────────────────────────── -->
  <header
    class="fixed top-0 left-0 right-0 z-50"
    style="background:#04111f; border-bottom:1px solid rgba(20,184,166,0.15)"
  >
    <div class="max-w-screen-xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

      <!-- Brand -->
      <div class="flex items-center gap-2.5 shrink-0">
        <div class="w-7 h-7 rounded flex items-center justify-center text-sm"
             style="background:linear-gradient(135deg,#0d9488,#059669)">
          ∑
        </div>
        <span class="text-sm font-semibold text-slate-100 tracking-tight hidden sm:block">
          Análisis Estadístico
        </span>
        <span class="hidden md:block text-slate-600 text-xs">|</span>
        <span class="hidden md:block text-xs text-slate-500">Probabilidad &amp; Estadística</span>
      </div>

      <!-- Nav tabs -->
      <nav class="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
        <button
          @click="goTo('histogram')"
          :class="route.name === 'histogram' ? 'tab-active text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'"
          class="px-3.5 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5"
        >
          <span class="text-sm">▦</span> Histogramas
        </button>
        <button
          @click="goTo('simulator')"
          :class="route.name === 'simulator' ? 'tab-active text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'"
          class="px-3.5 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5"
        >
          <span class="text-sm">◈</span> Simulador
        </button>
      </nav>

      <!-- Right side label -->
      <div class="hidden sm:flex items-center gap-2">
        <span class="badge-teal">v2.0</span>
      </div>

    </div>
  </header>

  <!-- ── MAIN ───────────────────────────────────────────────────────────────── -->
  <main class="pt-14 pb-10 min-h-screen" style="background:#04111f">
    <RouterView />
  </main>

  <!-- ── FOOTER ─────────────────────────────────────────────────────────────── -->
  <footer style="background:#02090f; border-top:1px solid rgba(20,184,166,0.1)">
    <div class="max-w-screen-xl mx-auto px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-1">
      <div class="flex items-center gap-2 text-xs text-slate-600">
        <span style="color:#0d9488">◈</span>
        Probabilidad &amp; Estadística — Herramientas de Análisis
      </div>
      <div class="text-xs text-slate-500 flex items-center gap-1.5">
        Desarrollado por
        <span class="font-semibold text-teal-400">Byron Alexander Vanegas</span>
        <span class="text-slate-700">·</span>
        <span class="text-slate-600">2025</span>
      </div>
    </div>
  </footer>
</template>
