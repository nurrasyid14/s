/**
 * permissions.js — role-based access control utilities
 */

export const ROLES = {
  USER: 'user',
  STAKEHOLDER: 'stakeholder',
}

/**
 * Get current user role from localStorage
 */
export function getCurrentRole() {
  try {
    const user = JSON.parse(localStorage.getItem('suaralens_user') || 'null')
    return user?.role || null
  } catch {
    return null
  }
}

/**
 * Check if current user is authenticated
 */
export function isAuthenticated() {
  return !!localStorage.getItem('suaralens_token')
}

/**
 * Check if current user is a stakeholder
 */
export function isStakeholder() {
  return getCurrentRole() === ROLES.STAKEHOLDER
}

/**
 * Check if current user is a regular user
 */
export function isUser() {
  return getCurrentRole() === ROLES.USER
}

/**
 * HOC / guard — redirect if not authenticated
 * Used in React Router loader or component
 */
export function requireAuth(redirectTo = '/signin') {
  if (!isAuthenticated()) {
    window.location.href = redirectTo
    return false
  }
  return true
}

/**
 * HOC / guard — redirect if not stakeholder
 */
export function requireStakeholder(redirectTo = '/signin') {
  if (!isAuthenticated() || !isStakeholder()) {
    window.location.href = redirectTo
    return false
  }
  return true
}

/**
 * HOC / guard — redirect if not regular user
 */
export function requireUser(redirectTo = '/signin') {
  if (!isAuthenticated() || !isUser()) {
    window.location.href = redirectTo
    return false
  }
  return true
}
