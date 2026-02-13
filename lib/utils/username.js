// Username validation and generation utilities

export function validateUsername(username) {
  if (!username) return { valid: false, error: 'Username is required' }
  
  const cleaned = username.toLowerCase().trim()
  
  // Check length (3-30 characters)
  if (cleaned.length < 3) return { valid: false, error: 'Username must be at least 3 characters' }
  if (cleaned.length > 30) return { valid: false, error: 'Username must be 30 characters or less' }
  
  // Only lowercase letters and numbers, no spaces or special chars
  const validPattern = /^[a-z0-9]+$/
  if (!validPattern.test(cleaned)) {
    return { valid: false, error: 'Username can only contain lowercase letters and numbers' }
  }
  
  // Reserved usernames
  const reserved = ['admin', 'support', 'help', 'system', 'null', 'undefined', 'api', 'www', 'feed', 'search', 'messages', 'events', 'settings', 'profile', 'startup', 'saved']
  if (reserved.includes(cleaned)) {
    return { valid: false, error: 'This username is reserved' }
  }
  
  return { valid: true, username: cleaned }
}

export function generateUsername(name) {
  if (!name) return ''
  
  // Convert to lowercase, remove special chars, replace spaces
  const base = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 20)
  
  // Add random numbers if base is too short
  if (base.length < 3) {
    return base + Math.random().toString(36).slice(2, 6)
  }
  
  return base
}
