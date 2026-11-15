// ============================================
// Validation Tests
// ============================================

import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  validatePetName,
  validateChatMessage,
  validateGuestbookMessage,
  validatePubkey,
  validateBunkerUrl,
  RateLimiter,
} from '../utils/validation';

describe('Validation', () => {
  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>Hello')).toBe('Hello');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeInput('Hello < > " \' ` world')).toBe('Hello world');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  Hello  ')).toBe('Hello');
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('validatePetName', () => {
    it('should accept valid names', () => {
      expect(validatePetName('Fluffy').valid).toBe(true);
      expect(validatePetName('My Pet').valid).toBe(true);
      expect(validatePetName("O'Brien").valid).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validatePetName('').valid).toBe(false);
      expect(validatePetName('   ').valid).toBe(false);
    });

    it('should reject short names', () => {
      expect(validatePetName('A').valid).toBe(false);
    });

    it('should reject long names', () => {
      expect(validatePetName('A'.repeat(21)).valid).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(validatePetName('Pet<script>').valid).toBe(false);
      expect(validatePetName('Pet@home').valid).toBe(false);
    });
  });

  describe('validateChatMessage', () => {
    it('should accept valid messages', () => {
      expect(validateChatMessage('Hello world').valid).toBe(true);
    });

    it('should reject empty messages', () => {
      expect(validateChatMessage('').valid).toBe(false);
    });

    it('should reject long messages', () => {
      expect(validateChatMessage('A'.repeat(501)).valid).toBe(false);
    });
  });

  describe('validateGuestbookMessage', () => {
    it('should accept valid messages', () => {
      expect(validateGuestbookMessage('Great pet!').valid).toBe(true);
    });

    it('should reject messages over 140 chars', () => {
      expect(validateGuestbookMessage('A'.repeat(141)).valid).toBe(false);
    });
  });

  describe('validatePubkey', () => {
    it('should accept hex pubkeys', () => {
      const hex = 'a'.repeat(64);
      expect(validatePubkey(hex).valid).toBe(true);
    });

    it('should accept npub', () => {
      expect(validatePubkey('npub1' + 'a'.repeat(58)).valid).toBe(true);
    });

    it('should reject invalid pubkeys', () => {
      expect(validatePubkey('invalid').valid).toBe(false);
      expect(validatePubkey('').valid).toBe(false);
    });
  });

  describe('validateBunkerUrl', () => {
    it('should accept valid bunker URLs', () => {
      const url = 'bunker://abc123?relay=wss://relay.example.com&secret=xyz';
      expect(validateBunkerUrl(url).valid).toBe(true);
    });

    it('should reject URLs without bunker:// prefix', () => {
      expect(validateBunkerUrl('https://example.com').valid).toBe(false);
    });

    it('should reject URLs without relay param', () => {
      expect(validateBunkerUrl('bunker://abc?secret=xyz').valid).toBe(false);
    });

    it('should reject URLs without secret param', () => {
      expect(validateBunkerUrl('bunker://abc?relay=wss://example.com').valid).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    it('should allow first action', () => {
      const limiter = new RateLimiter(1000);
      expect(limiter.canPerform('test')).toBe(true);
    });

    it('should block rapid repeated actions', () => {
      const limiter = new RateLimiter(1000);
      limiter.canPerform('test');
      expect(limiter.canPerform('test')).toBe(false);
    });

    it('should allow different actions independently', () => {
      const limiter = new RateLimiter(1000);
      limiter.canPerform('action1');
      expect(limiter.canPerform('action2')).toBe(true);
    });

    it('should report remaining cooldown', () => {
      const limiter = new RateLimiter(1000);
      limiter.canPerform('test');
      const remaining = limiter.getRemainingCooldown('test');
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(1000);
    });
  });
});
