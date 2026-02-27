import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, #1e293b 25%, #2d3f55 50%, #1e293b 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style
    }} />
  )
}

// Card skeleton
export function CardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderRadius: '16px',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skeleton width={40} height={40} borderRadius={10} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </div>
      </div>
      <Skeleton width="100%" height={11} />
      <Skeleton width="80%" height={11} />
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Skeleton width={60} height={22} borderRadius={999} />
        <Skeleton width={80} height={22} borderRadius={999} />
      </div>
    </div>
  )
}

// Table row skeleton
export function TableRowSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 18px',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    }}>
      <Skeleton width={36} height={36} borderRadius="50%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Skeleton width="40%" height={13} />
        <Skeleton width="25%" height={11} />
      </div>
      <Skeleton width={60} height={22} borderRadius={999} />
      <Skeleton width={80} height={22} borderRadius={999} />
    </div>
  )
}

// Stat card skeleton
export function StatCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderRadius: '16px',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={40} height={40} borderRadius={10} />
        <Skeleton width={60} height={22} borderRadius={8} />
      </div>
      <Skeleton width="50%" height={28} borderRadius={8} />
      <Skeleton width="70%" height={11} />
    </div>
  )
}

// Task row skeleton
export function TaskRowSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px',
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderRadius: '14px',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    }}>
      <Skeleton width={60} height={26} borderRadius={7} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="30%" height={10} />
      </div>
      <Skeleton width={50} height={20} borderRadius={999} />
      <Skeleton width={40} height={11} />
    </div>
  )
}

// Kanban card skeleton
export function KanbanCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      backgroundColor: isDark ? '#0f172a' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
      padding: '12px', marginBottom: '8px',
      display: 'flex', flexDirection: 'column', gap: '10px'
    }}>
      <Skeleton width="75%" height={13} />
      <Skeleton width="90%" height={10} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={20} height={20} borderRadius="50%" />
        <Skeleton width={45} height={18} borderRadius={999} />
      </div>
    </div>
  )
}

// Time entry row skeleton
export function TimeEntrySkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px',
      borderRadius: '12px',
      border: '1px solid #1e293b',
      backgroundColor: '#0f172a',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <Skeleton width="45%" height={13} />
        <Skeleton width="30%" height={10} />
      </div>
      <Skeleton width={64} height={22} borderRadius={999} />
      <Skeleton width={28} height={28} borderRadius={7} />
    </div>
  )
}

// Notification skeleton
export function NotificationSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div style={{
      display: 'flex', gap: '12px', padding: '12px 16px',
      borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
    }}>
      <Skeleton width={34} height={34} borderRadius={10} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Skeleton width="60%" height={12} />
        <Skeleton width="85%" height={10} />
        <Skeleton width="30%" height={9} />
      </div>
    </div>
  )
}