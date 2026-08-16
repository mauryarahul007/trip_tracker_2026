import { create } from 'zustand';

interface UpdateStore {
  updateAvailable: boolean;
  setUpdateAvailable: () => void;
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  updateAvailable: false,
  setUpdateAvailable: () => set({ updateAvailable: true }),
}));
