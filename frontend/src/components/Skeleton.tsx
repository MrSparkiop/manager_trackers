import { useThemeStore } from '../store/themeStore'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { isDark } = useThemeStore()

  return (
    <div style={{
      width, height, borderRadius,
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
      backgroundImage: isDark
        ? 'linear-gradient(90deg, #1e293b 25%, #293548 50%, #1e293b 75%)'
        : 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style
    }} />
  )
}

export function StatCardSkeleton() {
  const { isDark } = useThemeStore()
  const card = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderRadius: '16px',
    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    padding: '24px',
  }
  return (
    <div style={card}>
      <Skeleton width={42} height={42} borderRadius={12} style={{ marginBottom: '16px' }} />
      <Skeleton width={60} height={28} borderRadius={6} style={{ marginBottom: '8px' }} />
      <Skeleton width={100} height={14} borderRadius={4} />
    </div>
  )
}

export function TaskRowSkeleton() {
  const { isDark } = useThemeStore()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      borderRadius: '12px'
    }}>
      <Skeleton width={18} height={18} borderRadius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height={14} borderRadius={4} style={{ marginBottom: '6px' }} />
        <Skeleton width="30%" height={11} borderRadius={4} />
      </div>
      <Skeleton width={60} height={20} borderRadius={999} />
      <Skeleton width={28} height={28} borderRadius={6} />
    </div>
  )
}

export function ProjectCardSkeleton() {
  const { isDark } = useThemeStore()
  return (
    <div style={{
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderRadius: '16px',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton width={40} height={40} borderRadius={10} />
          <div>
            <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: '6px' }} />
            <Skeleton width={60} height={11} borderRadius={999} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Skeleton width={24} height={24} borderRadius={6} />
          <Skeleton width={24} height={24} borderRadius={6} />
        </div>
      </div>
      <Skeleton width="80%" height={12} borderRadius={4} style={{ marginBottom: '6px' }} />
      <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: '16px' }} />
      <Skeleton width="100%" height={4} borderRadius={999} />
    </div>
  )
}

export function TimeEntrySkeleton() {
  const { isDark } = useThemeStore()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      borderRadius: '12px', padding: '12px 16px'
    }}>
      <Skeleton width={36} height={36} borderRadius={10} />
      <div style={{ flex: 1 }}>
        <Skeleton width="50%" height={14} borderRadius={4} style={{ marginBottom: '6px' }} />
        <Skeleton width="35%" height={11} borderRadius={4} />
      </div>
      <Skeleton width={50} height={16} borderRadius={4} />
      <Skeleton width={24} height={24} borderRadius={6} />
    </div>
  )
}