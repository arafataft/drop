import { create } from "zustand";
import type { TransferSession, FileProgress } from "@/types/transfer";

interface TransferState {
  sessions: Map<string, TransferSession>;
  addSession: (session: TransferSession) => void;
  removeSession: (id: string) => void;
  updateSessionStatus: (id: string, status: TransferSession["status"]) => void;
  updateFileProgress: (sessionId: string, progress: FileProgress) => void;
  getFileProgress: (sessionId: string) => FileProgress[];
}

export const useTransferStore = create<TransferState>()((set, get) => ({
  sessions: new Map(),
  addSession: (session) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.set(session.id, session);
      return { sessions };
    }),
  removeSession: (id) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      sessions.delete(id);
      return { sessions };
    }),
  updateSessionStatus: (id, status) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      const session = sessions.get(id);
      if (session) {
        sessions.set(id, { ...session, status });
      }
      return { sessions };
    }),
  updateFileProgress: (sessionId, progress) =>
    set((state) => {
      const sessions = new Map(state.sessions);
      const session = sessions.get(sessionId);
      if (session) {
        const fileProgress = new Map(session.fileProgress);
        fileProgress.set(progress.fileId, progress);
        sessions.set(sessionId, { ...session, fileProgress });
      }
      return { sessions };
    }),
  getFileProgress: (sessionId) => {
    const session = get().sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.fileProgress.values());
  },
}));
