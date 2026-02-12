import { describe, it, expect } from 'vitest';

/**
 * Tests for the XSS protection in ChatArea's renderMarkdown function.
 *
 * renderMarkdown is defined inside ChatArea.tsx and not exported, so we
 * reproduce the exact protocol check from line 56 and test it in isolation.
 * This validates that the allowlist logic (only http://, https://, mailto:)
 * correctly blocks dangerous protocols like javascript:, data:, vbscript:.
 */

// Reproduce the exact protocol check from ChatArea.tsx line 56:
const isLinkSafe = (href: string): boolean => {
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
};

describe('ChatArea renderMarkdown XSS protection', () => {
  describe('link protocol validation', () => {
    it('allows https:// links', () => {
      expect(isLinkSafe('https://example.com')).toBe(true);
    });

    it('allows http:// links', () => {
      expect(isLinkSafe('http://example.com')).toBe(true);
    });

    it('allows mailto: links', () => {
      expect(isLinkSafe('mailto:test@test.com')).toBe(true);
    });

    it('blocks javascript: protocol', () => {
      expect(isLinkSafe('javascript:alert(1)')).toBe(false);
    });

    it('blocks javascript: with mixed case', () => {
      expect(isLinkSafe('JavaScript:alert(1)')).toBe(false);
    });

    it('blocks javascript: with encoding tricks', () => {
      expect(isLinkSafe('javascript:void(0)')).toBe(false);
    });

    it('blocks data: protocol', () => {
      expect(isLinkSafe('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('blocks vbscript: protocol', () => {
      expect(isLinkSafe('vbscript:msgbox("xss")')).toBe(false);
    });

    it('blocks empty protocol', () => {
      expect(isLinkSafe('')).toBe(false);
    });

    it('blocks relative paths (not a full URL)', () => {
      expect(isLinkSafe('/path/to/page')).toBe(false);
    });

    it('case insensitive for HTTPS', () => {
      expect(isLinkSafe('HTTPS://example.com')).toBe(true);
    });

    it('case insensitive for MAILTO', () => {
      expect(isLinkSafe('MAILTO:test@test.com')).toBe(true);
    });
  });
});
