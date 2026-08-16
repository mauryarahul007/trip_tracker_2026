import { describe, it, expect } from 'vitest';
import { createControllerChangeGate } from './serviceWorkerUpdates';

describe('createControllerChangeGate', () => {
  it('treats every controllerchange as a real update when the page was already controlled at load', () => {
    const shouldTreatAsUpdate = createControllerChangeGate(true);

    expect(shouldTreatAsUpdate()).toBe(true);
    expect(shouldTreatAsUpdate()).toBe(true);
  });

  it('ignores the first controllerchange when the page had no controller at load, but flags later ones', () => {
    const shouldTreatAsUpdate = createControllerChangeGate(false);

    expect(shouldTreatAsUpdate()).toBe(false);
    expect(shouldTreatAsUpdate()).toBe(true);
  });
});
