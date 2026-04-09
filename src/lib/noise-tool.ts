export interface NoisePreset {
  id: string
  label: string
  summary: string
  type: 'noise' | 'oscillator'
  color?: 'white' | 'pink' | 'brown'
  frequency?: number
}

export function buildNoisePresets(): NoisePreset[] {
  return [
    { id: 'white', label: '白噪音', summary: '均匀覆盖背景噪声，适合屏蔽环境杂音。', type: 'noise', color: 'white' },
    { id: 'rain', label: '雨声', summary: '更柔和，适合写作和夜间专注。', type: 'noise', color: 'pink' },
    { id: 'ocean', label: '海浪', summary: '低频更明显，适合放松和长时间专注。', type: 'noise', color: 'brown' },
    { id: 'cafe', label: '咖啡馆', summary: '用轻微高频感模拟环境声氛围。', type: 'oscillator', frequency: 180 },
  ]
}

export function formatTimerLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
