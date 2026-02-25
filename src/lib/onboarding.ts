const ONBOARDING_KEY = 'babycare-onboarding-completed'

export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1'
}

export function markOnboardingCompleted(): void {
  localStorage.setItem(ONBOARDING_KEY, '1')
}
