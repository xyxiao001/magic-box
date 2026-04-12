export interface ToolScaffoldHistoryEntry {
  id: string
  createdAt: string
  label: string
  description?: string
}

export interface ToolScaffoldHistoryPanel {
  entries: ToolScaffoldHistoryEntry[]
  emptyText?: string
  onRestore: (entry: unknown) => void
  onRemove: (entryId: string) => void
  onClear: () => void
}

export interface ToolScaffoldSampleItem {
  id: string
  label: string
  summary?: string
}

export interface ToolScaffoldSamplePanel {
  samples: ToolScaffoldSampleItem[]
  onApply: (sampleId: string) => void
}
