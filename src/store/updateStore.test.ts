import { describe, it, expect, beforeEach } from 'vitest';
import { useUpdateStore } from './updateStore';

describe('useUpdateStore', () => {
  beforeEach(() => {
    useUpdateStore.setState({ updateAvailable: false });
  });

  it('starts with no update available', () => {
    expect(useUpdateStore.getState().updateAvailable).toBe(false);
  });

  it('flags an update as available', () => {
    useUpdateStore.getState().setUpdateAvailable();

    expect(useUpdateStore.getState().updateAvailable).toBe(true);
  });
});
