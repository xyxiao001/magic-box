import { describe, expect, it } from 'vitest'
import {
  buildWebsocketLabHistoryLabel,
  createWebsocketLabInitialInput,
  executeWebsocketLab,
  websocketLabSamples,
} from './module'

describe('websocket lab module', () => {
  it('builds websocket config summary', () => {
    const input = createWebsocketLabInitialInput()
    input.protocols = 'json, v2'
    input.heartbeatEnabled = true

    const output = executeWebsocketLab(input)

    expect(output.protocolCount).toBe(2)
    expect(output.heartbeatLabel).toBe('15 秒')
    expect(output.payloadMode).toBe('Plain Text')
  })

  it('builds history labels and exposes samples', () => {
    const input = createWebsocketLabInitialInput()

    expect(buildWebsocketLabHistoryLabel(input)).toContain('wss://')
    expect(websocketLabSamples).toHaveLength(2)
  })
})
