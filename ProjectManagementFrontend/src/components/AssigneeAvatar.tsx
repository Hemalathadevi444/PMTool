import { initials } from '../utils/taskHelpers'
import { avatarBgColor } from '../utils/workspaceHelpers'

interface AssigneeAvatarProps {
  userId: string
  name: string
  index?: number
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-[9px] border-2',
  md: 'h-7 w-7 text-[10px] border-2',
}

export function AssigneeAvatar({
  userId,
  name,
  index,
  size = 'sm',
  className = '',
}: AssigneeAvatarProps) {
  const bgColor = avatarBgColor(userId, index ?? -1)

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white theme-border ${SIZE_CLASSES[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {initials(name)}
    </div>
  )
}
