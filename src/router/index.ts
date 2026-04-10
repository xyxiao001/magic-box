import { createRouter, createWebHistory } from 'vue-router'
import DocsView from '@/views/DocsView.vue'
import CalculatorProView from '@/views/tools/CalculatorProView.vue'
import ClipboardHistoryView from '@/views/tools/ClipboardHistoryView.vue'
import CodecLabView from '@/views/tools/CodecLabView.vue'
import ColorStudioView from '@/views/tools/ColorStudioView.vue'
import CronPlannerView from '@/views/tools/CronPlannerView.vue'
import DiffStudioView from '@/views/tools/DiffStudioView.vue'
import HashStudioView from '@/views/tools/HashStudioView.vue'
import HttpLabView from '@/views/tools/HttpLabView.vue'
import ImageStudioView from '@/views/tools/ImageStudioView.vue'
import HmacSignerView from '@/views/tools/HmacSignerView.vue'
import HeaderCookieLabView from '@/views/tools/HeaderCookieLabView.vue'
import JsonToolkitView from '@/views/tools/JsonToolkitView.vue'
import JsonTypegenView from '@/views/tools/JsonTypegenView.vue'
import JwtStudioView from '@/views/tools/JwtStudioView.vue'
import PackageRadarView from '@/views/tools/PackageRadarView.vue'
import QrcodeStudioView from '@/views/tools/QrcodeStudioView.vue'
import MarkdownStudioView from '@/views/tools/MarkdownStudioView.vue'
import RegexWorkbenchView from '@/views/tools/RegexWorkbenchView.vue'
import RequestConverterView from '@/views/tools/RequestConverterView.vue'
import TimeLabView from '@/views/tools/TimeLabView.vue'
import UnitConverterView from '@/views/tools/UnitConverterView.vue'
import WeatherDeskView from '@/views/tools/WeatherDeskView.vue'
import WebSocketLabView from '@/views/tools/WebSocketLabView.vue'
import WhiteNoiseStudioView from '@/views/tools/WhiteNoiseStudioView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/tools/time-lab',
    },
    {
      path: '/tools/markdown-studio',
      name: 'markdown-studio',
      component: MarkdownStudioView,
    },
    {
      path: '/tools/jwt-studio',
      name: 'jwt-studio',
      component: JwtStudioView,
    },
    {
      path: '/tools/diff-studio',
      name: 'diff-studio',
      component: DiffStudioView,
    },
    {
      path: '/tools/image-studio',
      name: 'image-studio',
      component: ImageStudioView,
    },
    {
      path: '/tools/color-studio',
      name: 'color-studio',
      component: ColorStudioView,
    },
    {
      path: '/tools/cron-planner',
      name: 'cron-planner',
      component: CronPlannerView,
    },
    {
      path: '/tools/hash-studio',
      name: 'hash-studio',
      component: HashStudioView,
    },
    {
      path: '/tools/calculator-pro',
      name: 'calculator-pro',
      component: CalculatorProView,
    },
    {
      path: '/tools/unit-converter',
      name: 'unit-converter',
      component: UnitConverterView,
    },
    {
      path: '/tools/clipboard-history',
      name: 'clipboard-history',
      component: ClipboardHistoryView,
    },
    {
      path: '/tools/weather-desk',
      name: 'weather-desk',
      component: WeatherDeskView,
    },
    {
      path: '/tools/white-noise-studio',
      name: 'white-noise-studio',
      component: WhiteNoiseStudioView,
    },
    {
      path: '/tools/request-converter',
      name: 'request-converter',
      component: RequestConverterView,
    },
    {
      path: '/tools/header-cookie-lab',
      name: 'header-cookie-lab',
      component: HeaderCookieLabView,
    },
    {
      path: '/tools/json-typegen',
      name: 'json-typegen',
      component: JsonTypegenView,
    },
    {
      path: '/tools/websocket-lab',
      name: 'websocket-lab',
      component: WebSocketLabView,
    },
    {
      path: '/tools/hmac-signer',
      name: 'hmac-signer',
      component: HmacSignerView,
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
      path: '/tools/http-lab',
      name: 'http-lab',
      component: HttpLabView,
    },
    {
      path: '/tools/qrcode-studio',
      name: 'qrcode-studio',
      component: QrcodeStudioView,
    },
    {
      path: '/tools/package-radar',
      name: 'package-radar',
      component: PackageRadarView,
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
