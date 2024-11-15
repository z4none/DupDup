import { createMemoryHistory, createRouter } from 'vue-router'

import Index from './page/Index.vue'
import Config from './page/Config.vue'
import Preview from './page/Preview.vue'


const routes = [
  { path: '/', component: Index },
  { path: '/config', component: Config },
  { path: '/preview', component: Preview },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router