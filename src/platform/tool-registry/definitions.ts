import { colorStudioModule } from '@/modules/design/color-studio'
import { htmlFormatterModule } from '@/modules/document/html-formatter'
import { markdownStudioModule } from '@/modules/document/markdown-studio'
import { sqlFormatterModule } from '@/modules/database/sql-formatter'
import { codecLabModule } from '@/modules/encoding/codec-lab'
import { imageStudioModule } from '@/modules/media/image-studio'
import { qrcodeStudioModule } from '@/modules/media/qrcode-studio'
import { whiteNoiseStudioModule } from '@/modules/media/white-noise-studio/index'
import { jsonDiffJsonPathModule } from '@/modules/json/json-diff-jsonpath'
import { jsonToolkitModule } from '@/modules/json/json-toolkit'
import { jsonTypegenModule } from '@/modules/json/json-typegen'
import { headerCookieLabModule } from '@/modules/network/header-cookie-lab'
import { httpLabModule } from '@/modules/network/http-lab'
import { packageRadarModule } from '@/modules/network/package-radar'
import { requestConverterModule } from '@/modules/network/request-converter'
import { urlInspectorModule } from '@/modules/network/url-inspector'
import { websocketLabModule } from '@/modules/network/websocket-lab'
import { hashStudioModule } from '@/modules/security/hash-studio'
import { hmacSignerModule } from '@/modules/security/hmac-signer'
import { jwtSignVerifyModule } from '@/modules/security/jwt-sign-verify'
import { jwtStudioModule } from '@/modules/security/jwt-studio'
import { uuidStudioModule } from '@/modules/security/uuid-studio'
import { csvToolkitModule } from '@/modules/table/csv-toolkit'
import { textToolkitModule } from '@/modules/text/text-toolkit'
import { diffStudioModule } from '@/modules/text/diff-studio'
import { regexWorkbenchModule } from '@/modules/text/regex-workbench'
import { calculatorProModule } from '@/modules/utility/calculator-pro/index'
import { clipboardHistoryModule } from '@/modules/utility/clipboard-history'
import { cronPlannerModule } from '@/modules/utility/cron-planner'
import { timeLabModule } from '@/modules/utility/time-lab/index'
import { unitConverterModule } from '@/modules/utility/unit-converter'
import { weatherDeskModule } from '@/modules/utility/weather-desk'
import type { ToolRegistryModule } from './schema'


export const platformToolModules: ToolRegistryModule[] = [
  {
    meta: qrcodeStudioModule.meta,
    loader: qrcodeStudioModule.loader,
    page: qrcodeStudioModule.page,
  },
  {
    meta: clipboardHistoryModule.meta,
    loader: clipboardHistoryModule.loader,
    page: clipboardHistoryModule.page,
  },
  {
    meta: codecLabModule.meta,
    loader: codecLabModule.loader,
    page: codecLabModule.page,
  },
  {
    meta: markdownStudioModule.meta,
    loader: markdownStudioModule.loader,
    page: markdownStudioModule.page,
  },
  {
    meta: htmlFormatterModule.meta,
    loader: htmlFormatterModule.loader,
    page: htmlFormatterModule.page,
  },
  {
    meta: httpLabModule.meta,
    loader: httpLabModule.loader,
    page: httpLabModule.page,
  },
  {
    meta: jsonToolkitModule.meta,
    loader: jsonToolkitModule.loader,
    page: jsonToolkitModule.page,
  },
  {
    meta: jsonDiffJsonPathModule.meta,
    loader: jsonDiffJsonPathModule.loader,
    page: jsonDiffJsonPathModule.page,
  },
  {
    meta: jsonTypegenModule.meta,
    loader: jsonTypegenModule.loader,
    page: jsonTypegenModule.page,
  },
  {
    meta: textToolkitModule.meta,
    loader: textToolkitModule.loader,
    page: textToolkitModule.page,
  },
  {
    meta: diffStudioModule.meta,
    loader: diffStudioModule.loader,
    page: diffStudioModule.page,
  },
  {
    meta: regexWorkbenchModule.meta,
    loader: regexWorkbenchModule.loader,
    page: regexWorkbenchModule.page,
  },
  {
    meta: csvToolkitModule.meta,
    loader: csvToolkitModule.loader,
    page: csvToolkitModule.page,
  },
  {
    meta: sqlFormatterModule.meta,
    loader: sqlFormatterModule.loader,
    page: sqlFormatterModule.page,
  },
  {
    meta: requestConverterModule.meta,
    loader: requestConverterModule.loader,
    page: requestConverterModule.page,
  },
  {
    meta: headerCookieLabModule.meta,
    loader: headerCookieLabModule.loader,
    page: headerCookieLabModule.page,
  },
  {
    meta: jwtStudioModule.meta,
    loader: jwtStudioModule.loader,
    page: jwtStudioModule.page,
  },
  {
    meta: websocketLabModule.meta,
    loader: websocketLabModule.loader,
    page: websocketLabModule.page,
  },
  {
    meta: packageRadarModule.meta,
    loader: packageRadarModule.loader,
    page: packageRadarModule.page,
  },
  {
    meta: jwtSignVerifyModule.meta,
    loader: jwtSignVerifyModule.loader,
    page: jwtSignVerifyModule.page,
  },
  {
    meta: hashStudioModule.meta,
    loader: hashStudioModule.loader,
    page: hashStudioModule.page,
  },
  {
    meta: hmacSignerModule.meta,
    loader: hmacSignerModule.loader,
    page: hmacSignerModule.page,
  },
  {
    meta: urlInspectorModule.meta,
    loader: urlInspectorModule.loader,
    page: urlInspectorModule.page,
  },
  {
    meta: uuidStudioModule.meta,
    loader: uuidStudioModule.loader,
    page: uuidStudioModule.page,
  },
  {
    meta: timeLabModule.meta,
    loader: timeLabModule.loader,
    page: timeLabModule.page,
  },
  {
    meta: imageStudioModule.meta,
    loader: imageStudioModule.loader,
    page: imageStudioModule.page,
  },
  {
    meta: colorStudioModule.meta,
    loader: colorStudioModule.loader,
    page: colorStudioModule.page,
  },
  {
    meta: cronPlannerModule.meta,
    loader: cronPlannerModule.loader,
    page: cronPlannerModule.page,
  },
  {
    meta: calculatorProModule.meta,
    loader: calculatorProModule.loader,
    page: calculatorProModule.page,
  },
  {
    meta: unitConverterModule.meta,
    loader: unitConverterModule.loader,
    page: unitConverterModule.page,
  },
  {
    meta: whiteNoiseStudioModule.meta,
    loader: whiteNoiseStudioModule.loader,
    page: whiteNoiseStudioModule.page,
  },
  {
    meta: weatherDeskModule.meta,
    loader: weatherDeskModule.loader,
    page: weatherDeskModule.page,
  },
]
