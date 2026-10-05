// 로그인 사용자 상태의 단일 출처 (zustand)
import { create } from "zustand";
import type { AuthUser } from "./user";

interface State {
  user: AuthUser | null;
  setStoreLogin: (user: AuthUser) => void;
  setStoreLogout: () => void;
}

export const useAuthStore = create<State>()((set) => ({
  user: null,
  setStoreLogin: (user) => set({ user }),
  setStoreLogout: () => set({ user: null }),
}));
