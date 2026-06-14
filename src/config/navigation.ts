import {
  LayoutDashboard,
  Users,
  Building2,
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
  ShieldCheck,
  Receipt,
  Bell,
  Brain,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  labelKey: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const mainNavItems: NavItem[] = [
  { label: "Dashboard",     labelKey: "nav.dashboard",     path: ROUTES.Dashboard, icon: LayoutDashboard },
  { label: "Leads",         labelKey: "nav.leads",         path: ROUTES.Leads,     icon: Users,      permission: "leads"      },
  { label: "Clients",       labelKey: "nav.clients",       path: ROUTES.Clients,   icon: Building2,  permission: "crm"        },
  { label: "Invoicing",     labelKey: "nav.invoicing",     path: ROUTES.Invoicing, icon: Receipt,    permission: "invoicing"  },
  { label: "Calendar",      labelKey: "nav.calendar",      path: ROUTES.Calendar,  icon: CalendarDays, permission: "calendar" },
  { label: "Emails",        labelKey: "nav.emails",        path: ROUTES.Emails,    icon: Mail,       permission: "emails"     },
  { label: "Usage",         labelKey: "nav.usage",         path: ROUTES.Usage,     icon: Zap,        permission: "usage"      },
  { label: "AI Systems",    labelKey: "nav.aiSystems",     path: ROUTES.AISystems, icon: Cpu,        permission: "ai_systems" },
  { label: "Knowledge Base", labelKey: "nav.knowledge",    path: ROUTES.Knowledge, icon: Brain,      permission: "knowledge"  },
  { label: "Analytics",     labelKey: "nav.analytics",     path: ROUTES.Analytics, icon: BarChart3,  permission: "analytics"  },
  { label: "Reports",       labelKey: "nav.reports",       path: ROUTES.Reports,   icon: FileText,   permission: "reports"    },
  { label: "Support",       labelKey: "nav.support",       path: ROUTES.Support,   icon: LifeBuoy,   permission: "support"    },
  { label: "Team",          labelKey: "nav.team",          path: ROUTES.Team,      icon: Users2,     permission: "team"       },
  { label: "Security",      labelKey: "nav.security",      path: ROUTES.Security,      icon: ShieldCheck, adminOnly: true },
  { label: "Notifications", labelKey: "nav.notifications", path: ROUTES.Notifications, icon: Bell, permission: "notifications" },
];

export const bottomNavItems: NavItem[] = [
  { label: "Billing",  labelKey: "nav.billing",  path: ROUTES.Billing,  icon: CreditCard, permission: "billing" },
  { label: "Settings", labelKey: "nav.settings", path: ROUTES.Settings, icon: Settings   },
];
