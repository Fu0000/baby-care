export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (!navigator.vibrate) return
  const duration = style === 'light' ? 10 : style === 'medium' ? 25 : 50
  navigator.vibrate(duration)
}
