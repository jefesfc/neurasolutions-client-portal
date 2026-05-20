import {
  LayoutDashboard,
  Users,
  BookUser,
  Bot,
  Cpu,
  BarChart3,
  FileText,
  LifeBuoy,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",  path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",      path: ROUTES.Leads,     icon: Users           },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser        },
  { label: "AI Chat",    path: ROUTES.AIChat,    icon: Bot             },
  { label: "AI Systems", path: ROUTES.AISystems, icon: Cpu             },
  { label: "Analytics",  path: ROUTES.Analytics, icon: BarChart3       },
  { label: "Reports",    path: ROUTES.Reports,   icon: FileText        },
  { label: "Support",    path: ROUTES.Support,   icon: LifeBuoy        },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing", path: ROUTES.Billing, icon: CreditCard },
  { label: "Profile", path: ROUTES.Profile, icon: Settings },
];
