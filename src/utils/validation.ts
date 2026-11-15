// ============================================
// Input Validation — Sanitize and validate user inputs
// ============================================

/**
 * Sanitize a string to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>\"'`]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validate pet name
 */
export function validatePetName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Pet name cannot be empty' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Pet name must be at least 2 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Pet name must be 20 characters or less' };
  }
  
  // Only allow alphanumeric, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmed)) {
    return { valid: false, error: 'Pet name contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Validate chat message
 */
export function validateChatMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length > 500) {
    return { valid: false, error: 'Message must be 500 characters or less' };
  }
  
  return { valid: true };
}

/**
 * Validate guestbook message
 */
export function validateGuestbookMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length > 140) {
    return { valid: false, error: 'Message must be 140 characters or less' };
  }
  
  return { valid: true };
}

/**
 * Validate npub or hex pubkey
 */
export function validatePubkey(input: string): { valid: boolean; error?: string } {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Pubkey cannot be empty' };
  }
  
  const trimmed = input.trim();
  
  // Check if it's a hex pubkey (64 chars)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return { valid: true };
  }
  
  // Check if it's an npub (starts with npub1)
  if (trimmed.startsWith('npub1') && trimmed.length >= 58) {
    return { valid: true };
  }
  
  return { valid: false, error: 'Invalid pubkey format' };
}

/**
 * Validate bunker URL for NIP-46
 */
export function validateBunkerUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { valid: false, error: 'Bunker URL cannot be empty' };
  }
  
  const trimmed = url.trim();
  
  if (!trimmed.startsWith('bunker://')) {
    return { valid: false, error: 'URL must start with bunker://' };
  }
  
  // Check for required components
  if (!trimmed.includes('relay=')) {
    return { valid: false, error: 'Missing relay parameter' };
  }
  
  if (!trimmed.includes('secret=')) {
    return { valid: false, error: 'Missing secret parameter' };
  }
  
  return { valid: true };
}

/**
 * Rate limiter for actions (prevents spam)
 */
export class RateLimiter {
  private lastAction: Map<string, number> = new Map();
  private cooldownMs: number;

  constructor(cooldownMs: number = 1000) {
    this.cooldownMs = cooldownMs;
  }

  canPerform(action: string): boolean {
    const now = Date.now();
    const lastTime = this.lastAction.get(action) || 0;
    
    if (now - lastTime >= this.cooldownMs) {
      this.lastAction.set(action, now);
      return true;
    }
    
    return false;
  }

  getRemainingCooldown(action: string): number {
    const now = Date.now();
    const lastTime = this.lastAction.get(action) || 0;
    const remaining = this.cooldownMs - (now - lastTime);
    return Math.max(0, remaining);
  }
}