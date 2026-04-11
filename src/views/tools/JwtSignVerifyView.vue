<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ErrorBanner from '@/components/toolkit/ErrorBanner.vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import {
  parseJwt,
  parseJwtJsonInput,
  signJwtHs256,
  verifyJwtHs256,
  type ParsedJwtResult,
} from '@/lib/jwt'
import { readStorage, writeStorage } from '@/lib/storage'

type Mode = 'sign' | 'verify'

const jwtSignVerifyDomain = 'tool-history:jwt-sign-verify:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      mode: Mode
      secret: string
      persistSecret: boolean
      headerInput: string
      payloadInput: string
      tokenInput: string
    }>
  } catch {
    return undefined
  }
}

const savedState = readStorage<
  Partial<{
    mode: Mode
    secret: string
    persistSecret: boolean
    headerInput: string
    payloadInput: string
    tokenInput: string
  }>
>(jwtSignVerifyDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const mode = ref<Mode>(savedState.mode ?? 'sign')
const persistSecret = ref(Boolean(savedState.persistSecret))
const secret = ref(persistSecret.value ? savedState.secret ?? '' : '')
const headerInput = ref(
  savedState.headerInput ?? JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2)
)
const payloadInput = ref(
  savedState.payloadInput ??
    JSON.stringify(
      {
        sub: 'user-1',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      null,
      2
    )
)
const tokenInput = ref(savedState.tokenInput ?? '')
const signError = ref('')
const verifyError = ref('')
const signedToken = ref('')
const signatureText = ref('')
const verificationStatus = ref<'idle' | 'pass' | 'fail'>('idle')
const verificationSignature = ref('')

const headerParsed = computed(() => parseJwtJsonInput(headerInput.value, { alg: 'HS256', typ: 'JWT' }))
const payloadParsed = computed(() => parseJwtJsonInput(payloadInput.value, {}))
const parsedToken = computed<ParsedJwtResult>(() => parseJwt(mode.value === 'sign' ? signedToken.value : tokenInput.value))

watch([mode, secret, persistSecret, headerInput, payloadInput, tokenInput], () => {
  writeStorage(jwtSignVerifyDomain, {
    mode: mode.value,
    persistSecret: persistSecret.value,
    secret: persistSecret.value ? secret.value : '',
    headerInput: headerInput.value,
    payloadInput: payloadInput.value,
    tokenInput: tokenInput.value,
  })
})

async function handleSign() {
  signError.value = ''

  if (!headerParsed.value.ok) {
    signError.value = headerParsed.value.error || 'Header JSON 不合法'
    return
  }

  if (!payloadParsed.value.ok) {
    signError.value = payloadParsed.value.error || 'Payload JSON 不合法'
    return
  }

  const result = await signJwtHs256(headerParsed.value.value, payloadParsed.value.value, secret.value)

  if (!result.ok) {
    signError.value = result.error || '签发失败'
    signedToken.value = ''
    signatureText.value = ''
    return
  }

  signedToken.value = result.token
  signatureText.value = result.signature
}

async function handleVerify() {
  verifyError.value = ''
  verificationStatus.value = 'idle'
  verificationSignature.value = ''

  const result = await verifyJwtHs256(tokenInput.value, secret.value)

  if (!result.ok) {
    verifyError.value = result.error || '验签失败'
    return
  }

  verificationSignature.value = result.signature
  verificationStatus.value = result.verified ? 'pass' : 'fail'
}

function applyTemplate() {
  mode.value = 'sign'
  headerInput.value = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2)
  payloadInput.value = JSON.stringify(
    {
      sub: 'demo-user',
      scope: ['read', 'write'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 1800,
    },
    null,
    2
  )
}
</script>

<template>
  <ToolPageLayout wide>
    <template #editor>
      <ToolPanel title="输入" subtitle="首版支持 HS256 的本地签发与验签，和 JWT Studio 共用解析结果。" badge="HS256">
        <div class="tab-row">
          <button type="button" class="tab-button" :data-active="mode === 'sign'" @click="mode = 'sign'">
            签发
          </button>
          <button type="button" class="tab-button" :data-active="mode === 'verify'" @click="mode = 'verify'">
            验签
          </button>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">保存 secret</span>
            <select v-model="persistSecret" class="select-input">
              <option :value="false">否</option>
              <option :value="true">是</option>
            </select>
          </label>
          <label class="field-row">
            <span class="field-label">Secret</span>
            <input v-model="secret" class="text-input" type="password" placeholder="输入 HS256 secret" />
          </label>
        </div>

        <template v-if="mode === 'sign'">
          <ToolActionBar>
            <button type="button" class="solid-button" @click="handleSign">生成 JWT</button>
            <button type="button" class="ghost-button" @click="applyTemplate">使用模板</button>
          </ToolActionBar>

          <label class="field-row">
            <span class="field-label">Header JSON</span>
            <textarea v-model="headerInput" class="text-area text-area-compact" spellcheck="false" />
          </label>

          <label class="field-row">
            <span class="field-label">Payload JSON</span>
            <textarea v-model="payloadInput" class="text-area text-area-full" spellcheck="false" />
          </label>

          <ErrorBanner
            v-if="signError"
            title="签发失败"
            :message="signError"
            hint="首版仅支持 HS256，且 header/payload 必须是合法 JSON 对象。"
          />
        </template>

        <template v-else>
          <ToolActionBar>
            <button type="button" class="solid-button" @click="handleVerify">验证签名</button>
          </ToolActionBar>

          <label class="field-row">
            <span class="field-label">JWT</span>
            <textarea
              v-model="tokenInput"
              class="text-area text-area-full"
              spellcheck="false"
              placeholder="粘贴完整 token"
            />
          </label>

          <ErrorBanner
            v-if="verifyError"
            title="验签失败"
            :message="verifyError"
            hint="请确认 token 完整，且使用的是同一个 HS256 secret。"
          />
        </template>
      </ToolPanel>
    </template>

    <template #viewer>
      <ToolPanel title="结果" subtitle="生成后可直接复制 token，验签时会同步展示解析结果与签名对比。">
        <template v-if="mode === 'sign'">
          <ResultCard
            title="Signed JWT"
            :subtitle="signedToken ? '已根据当前 header、payload 和 secret 生成 token' : '点击生成 JWT 后展示结果'"
            :copy-value="signedToken"
            copy-label="复制 Token"
          >
            <textarea :value="signedToken" class="text-area text-area-full" readonly placeholder="签发后的 token 会显示在这里" />
          </ResultCard>

          <ResultCard title="Signature" :copy-value="signatureText" copy-label="复制签名">
            <code class="package-command-code">{{ signatureText || '等待生成签名' }}</code>
          </ResultCard>
        </template>

        <template v-else>
          <ResultCard
            title="验签结果"
            :subtitle="
              verificationStatus === 'pass'
                ? '签名验证通过'
                : verificationStatus === 'fail'
                  ? '签名不匹配，请检查 secret 或 token 内容'
                  : '点击验证签名开始检查'
            "
            :tone="verificationStatus === 'pass' ? 'success' : verificationStatus === 'fail' ? 'danger' : 'neutral'"
            :copy-value="verificationSignature"
            copy-label="复制期望签名"
          >
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">状态</span>
                  <strong class="result-value">
                    {{
                      verificationStatus === 'pass'
                        ? '通过'
                        : verificationStatus === 'fail'
                          ? '失败'
                          : '未执行'
                    }}
                  </strong>
                </div>
                <div>
                  <span class="result-label">期望签名</span>
                  <strong class="result-value">{{ verificationSignature || '—' }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>
        </template>

        <ToolPanel
          v-if="parsedToken.ok || parsedToken.error"
          title="JWT 解析结果"
          :subtitle="parsedToken.error || parsedToken.summary"
        >
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">状态</span>
                <strong class="result-value">{{ parsedToken.status }}</strong>
              </div>
            </article>
          </div>

          <div class="inline-fields">
            <ResultCard title="Header" :copy-value="parsedToken.headerText" copy-label="复制 Header">
              <textarea :value="parsedToken.headerText" class="text-area text-area-compact" readonly />
            </ResultCard>
            <ResultCard title="Payload" :copy-value="parsedToken.payloadText" copy-label="复制 Payload">
              <textarea :value="parsedToken.payloadText" class="text-area text-area-full" readonly />
            </ResultCard>
          </div>
        </ToolPanel>
      </ToolPanel>
    </template>
  </ToolPageLayout>
</template>
