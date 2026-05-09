import { create } from "zustand";

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  setMobileOpen: (open) => set({ isMobileOpen: open }),
  close: () => set({ isMobileOpen: false }),
}));
