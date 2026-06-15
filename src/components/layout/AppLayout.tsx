import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { ChatBubble } from "../chat/ChatBubble";
import { OnboardingModal } from "../onboarding/OnboardingModal";
import { useLanguageStore } from "../../store/language-store";
import { cn } from "../../lib/cn";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isRTL = useLanguageStore((s) => s.lang === 'ar');

  return (
    <div className={cn("flex h-screen overflow-hidden bg-slate-100", isRTL && "flex-row-reverse")}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className={cn("p-4 lg:p-6 lg:px-8 max-w-[1400px] mx-auto", isRTL && "text-right")}>
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <ChatBubble />
      <OnboardingModal />
    </div>
  );
}
