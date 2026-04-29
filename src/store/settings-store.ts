import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateRandomAlias } from "@/lib/alias";

interface SettingsState {
  alias: string;
  pin: string;
  setAlias: (alias: string) => void;
  setPin: (pin: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      alias: generateRandomAlias(),
      pin: "",
      setAlias: (alias) => set({ alias }),
      setPin: (pin) => set({ pin }),
    }),
    { name: "localsend-settings" }
  )
);
