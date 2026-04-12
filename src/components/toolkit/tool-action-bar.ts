export interface ToolActionBarItem {
  id: string
  label: string
  tone?: 'primary' | 'secondary'
  disabled?: boolean
  onClick: () => void | Promise<void>
}
