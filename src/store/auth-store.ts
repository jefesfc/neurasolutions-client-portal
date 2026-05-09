import { create } from "zustand";
import type { Client } from "../types";
import { mockClient } from "../lib/mock-data";

interface AuthState {
  client: Client | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  client: mockClient,
  isAuthenticated: true,
  login: () => set({ client: mockClient, isAuthenticated: true }),
  logout: () => set({ client: null, isAuthenticated: false }),
}));
