import type { CSSProperties } from 'react'

interface Colors {
  input: string
  inputBorder: string
  text: string
  textMuted: string
}

export function getInputStyle(colors: Colors): CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: `1px solid ${colors.inputBorder}`,
    backgroundColor: colors.input,
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }
}

export function getLabelStyle(colors: Colors): CSSProperties {
  return {
    display: 'block',
    fontSize: '13px',
    color: colors.textMuted,
    marginBottom: '6px',
  }
}
