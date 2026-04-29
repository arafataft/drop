import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateRandomAlias } from "@/lib/alias";

const DEFAULT_ALIAS = "My Device";

interface SettingsState {
  alias: string;
  aliasInitialized: boolean;
  pin: string;
  setAlias: (alias: string) => void;
  setPin: (pin: string) => void;
  initAlias: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      alias: DEFAULT_ALIAS,
      aliasInitialized: false,
      pin: "",
      setAlias: (alias) => set({ alias }),
      setPin: (pin) => set({ pin }),
      initAlias: () => {
        if (!get().aliasInitialized) {
          set({ alias: generateRandomAlias(), aliasInitialized: true });
        }
      },
    }),
    {
      name: "drop-settings",
      onRehydrateStorage: () => (state) => {
        // After rehydration, if alias was never set by user, generate a random one
        if (state && !state.aliasInitialized) {
          state.alias = generateRandomAlias();
          state.aliasInitialized = true;
        }
      },
    }
  )
);
