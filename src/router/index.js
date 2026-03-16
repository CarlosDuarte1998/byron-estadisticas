import { createRouter, createWebHistory } from 'vue-router'
import HistogramView  from '../views/HistogramView.vue'
import SimulatorView  from '../views/SimulatorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'histogram',
      component: HistogramView,
    },
    {
      path: '/simulator',
      name: 'simulator',
      component: SimulatorView,
    },
  ],
})

export default router
