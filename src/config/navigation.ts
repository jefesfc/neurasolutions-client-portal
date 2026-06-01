import {
  LayoutDashboard,
  Users,
  BookUser,
  CalendarDays,
  Mail,
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
  { label: "Leads",      path: ROUTES.Leads,     icon: Users,      permission: "leads"      },
  { label: "CRM",        path: ROUTES.Contacts,  icon: BookUser,   permission: "crm"        },
  { label: "Calendar",   path: ROUTES.Calendar,  icon: CalendarDays, permission: "calendar" },
  { label: "Emails",     path: ROUTES.Emails,    icon: Mail,       permission: "emails"     },
  { label: "Usage",      path: ROUTES.Usage,     icon: Zap,        permission: "usage"      },
  { label: "AI Systems", path: ROUTES.AISystems, icon: Cpu,        permission: "ai_systems" },
  { label: "Analytics",  path: ROUTES.Analytics, icon: BarChart3,  permission: "analytics"  },
  { label: "Reports",    path: ROUTES.Reports,   icon: FileText,   permission: "reports"    },
  { label: "Support",    path: ROUTES.Support,   icon: LifeBuoy,   permission: "support"    },
  { label: "Team",       path: ROUTES.Team,      icon: Users2,     permission: "team"       },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing",  path: ROUTES.Billing,  icon: CreditCard, permission: "billing" },
  { label: "Settings", path: ROUTES.Settings, icon: Settings   },
];
