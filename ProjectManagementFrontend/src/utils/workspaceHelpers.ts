const AVATAR_BG_COLORS = [
  '#16a34a', // green
  '#ca8a04', // yellow/amber
  '#2563eb', // blue
  '#9333ea', // purple
  '#e11d48', // rose
  '#0891b2', // cyan
  '#ea580c', // orange
  '#4f46e5', // indigo
]

export function avatarBgColor(entityId: string, index = -1): string {
  if (index >= 0) {
    return AVATAR_BG_COLORS[index % AVATAR_BG_COLORS.length]
  }
  let hash = 0
  for (let i = 0; i < entityId.length; i++) {
    hash = entityId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length]
}

export function workspaceBgColor(workspaceId: string, index: number): string {
  return avatarBgColor(workspaceId, index)
}

export function workspaceInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? 'S'
}
