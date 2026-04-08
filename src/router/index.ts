import { createRouter, createWebHistory } from 'vue-router'
import DocsView from '@/views/DocsView.vue'
import CodecLabView from '@/views/tools/CodecLabView.vue'
import JsonToolkitView from '@/views/tools/JsonToolkitView.vue'
import RegexWorkbenchView from '@/views/tools/RegexWorkbenchView.vue'
import TimeLabView from '@/views/tools/TimeLabView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/tools/time-lab',
    },
    {
      path: '/tools/time-lab',
      name: 'time-lab',
      component: TimeLabView,
    },
    {
      path: '/tools/regex-workbench',
      name: 'regex-workbench',
      component: RegexWorkbenchView,
    },
    {
      path: '/tools/json-toolkit',
      name: 'json-toolkit',
      component: JsonToolkitView,
    },
    {
      path: '/tools/codec-lab',
      name: 'codec-lab',
      component: CodecLabView,
    },
    {
      path: '/docs',
      name: 'docs',
      component: DocsView,
    },
  ],
})
