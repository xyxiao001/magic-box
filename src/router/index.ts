import { createRouter, createWebHistory } from 'vue-router'
import DocsView from '@/views/DocsView.vue'
import { createToolRoutes, getToolDefinitionById, getVisibleToolDefinitions } from '@/tools/registry'

const defaultToolPath =
  getToolDefinitionById('time-lab')?.path ?? getVisibleToolDefinitions()[0]?.path ?? '/docs'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: defaultToolPath,
    },
    ...createToolRoutes(),
    {
      path: '/docs',
      name: 'docs',
      component: DocsView,
    },
  ],
})
