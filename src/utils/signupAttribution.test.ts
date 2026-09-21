import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureSignupAttribution,
  clearSignupAttribution,
  loadSignupAttribution,
  parseSignupAttribution,
} from './signupAttribution';

describe('signupAttribution', () => {
  beforeEach(() => {
    clearSignupAttribution();
  });

  it('parses utm and ref params', () => {
    const parsed = parseSignupAttribution('?utm_source=instagram&utm_medium=social&utm_campaign=splitwise-switch');
    expect(parsed?.utm_source).toBe('instagram');
    expect(parsed?.utm_medium).toBe('social');
    expect(parsed?.utm_campaign).toBe('splitwise-switch');
    expect(parseSignupAttribution('?ref=whatsapp')?.utm_source).toBe('whatsapp');
    expect(parseSignupAttribution('')).toBeNull();
  });

  it('stores and reloads attribution from sessionStorage', () => {
    captureSignupAttribution('utm_source=whatsapp');
    expect(loadSignupAttribution()?.utm_source).toBe('whatsapp');
    clearSignupAttribution();
    expect(loadSignupAttribution()).toBeNull();
  });
});
