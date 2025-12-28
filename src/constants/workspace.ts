export const WORKSPACE_SECTIONS = [
  { key: 'planner', label: 'Планер', icon: 'calendar' },
  { key: 'supply', label: 'Поставка', icon: 'truck' },
  { key: 'drafts', label: 'Заявки', icon: 'layers' },
  { key: 'fbs', label: 'FBS', icon: 'package' },
  { key: 'ads', label: 'Реклама', icon: 'activity' },
  { key: 'settings', label: 'Настройка', icon: 'sliders' }
] as const

export type WorkspaceSectionKey = typeof WORKSPACE_SECTIONS[number]['key']

export const DEFAULT_WORKSPACE_SECTION: WorkspaceSectionKey = 'planner'

export const normalizeWorkspaceSection = (value?: string | null): WorkspaceSectionKey => {
  const match = WORKSPACE_SECTIONS.find((section) => section.key === value)
  return (match?.key ?? DEFAULT_WORKSPACE_SECTION)
}
