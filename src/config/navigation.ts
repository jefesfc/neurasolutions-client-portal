import {
  LayoutDashboard,
  Users,
  BookUser,
  Mail,
  Bot,
  Cpu,
  BarChart3,
  FileText,
  LifeBuoy,
  CreditCard,
  Settings,
  Zap,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",  path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",      path: ROUTES.Leads,     icon: Users           },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser        },
  { label: "Emails",     path: ROUTES.Emails,    icon: Mail,   permission: "emails" },
  { label: "AI Chat",    path: ROUTES.AIChat,    icon: Bot             },
  { label: "Usage",      path: ROUTES.Usage,     icon: Zap             },
  { label: "AI Systems", path: ROUTES.AISystems, icon: Cpu             },
  { label: "Analytics",  path: ROUTES.Analytics, icon: BarChart3       },
  { label: "Reports",    path: ROUTES.Reports,   icon: FileText        },
  { label: "Support",    path: ROUTES.Support,   icon: LifeBuoy        },
  { label: "Team",       path: ROUTES.Team,      icon: Users2          },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing",  path: ROUTES.Billing,  icon: CreditCard },
  { label: "Settings", path: ROUTES.Settings, icon: Settings   },
];
