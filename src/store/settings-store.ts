import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateRandomAlias } from "@/lib/alias";

interface SettingsState {
  alias: string;
  pin: string;
  _hasHydrated: boolean;
  setAlias: (alias: string) => void;
  setPin: (pin: string) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      alias: generateRandomAlias(),
      pin: "",
      _hasHydrated: false,
      setAlias: (alias) => set({ alias }),
      setPin: (pin) => set({ pin }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "drop-settings",
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);
