import { useMemo } from 'react'

export function useColors(isDark: boolean) {
  return useMemo(() => ({
    bg:          isDark ? '#030712' : '#f1f5f9',
    card:        isDark ? '#0f172a' : '#ffffff',
    border:      isDark ? '#1e293b' : '#e2e8f0',
    text:        isDark ? '#ffffff' : '#0f172a',
    textMuted:   isDark ? '#64748b' : '#94a3b8',
    input:       isDark ? '#1e293b' : '#f8fafc',
    inputBorder: isDark ? '#334155' : '#e2e8f0',
    subBg:       isDark ? '#1e293b' : '#f8fafc',
    modalBg:     isDark ? '#0f172a' : '#ffffff',
    filterBg:    isDark ? '#0f172a' : '#ffffff',
    searchBg:    isDark ? '#0f172a' : '#ffffff',
    tooltip:     isDark ? '#1e293b' : '#ffffff',
  }), [isDark])
}
