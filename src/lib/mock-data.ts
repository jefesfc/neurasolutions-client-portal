import type {
  Client,
  SubscriptionPlan,
  Invoice,
  AISystem,
  KPI,
  SystemActivity,
  Notification,
  ActivityFeedItem,
  Report,
  SupportTicket,
  FAQItem,
  TrendData,
  MetricComparison,
  UsageStats,
} from "../types";

// ── Client ──

export const mockClient: Client = {
  id: "c_001",
  companyName: "Atlas Ventures",
  logo: "",
  industry: "Financial Services",
  size: "50-200 employees",
  website: "atlasventures.com",
  memberSince: "2024-06-15",
  accountManager: {
    name: "Sarah Chen",
    email: "sarah.chen@neurasolutions.com",
    avatar: "",
    phone: "+1 (415) 555-0142",
  },
};

// ── Subscription ──

export const mockSubscription: SubscriptionPlan = {
  id: "sub_aios_001",
  name: "Professional",
  price: 850,
  currency: "GBP",
  setupFee: 14000,
  contractMonths: 12,
  billingCycle: "monthly",
  status: "active",
  renewalDate: "2026-06-28",
  features: [
    { id: "f1", name: "AI Operating System (AIOS)", description: "Full-stack AI-powered business operating system", included: true },
    { id: "f2", name: "Lead Generation & CRM", description: "AI lead capture, contacts, pipeline management", included: true },
    { id: "f3", name: "Gmail Inbox Sync", description: "Synced Gmail inbox with AI categorisation via n8n", included: true },
    { id: "f4", name: "Telegram AI Chat (Text + Voice)", description: "Business assistant via Telegram with voice support", included: true },
    { id: "f5", name: "Web AI Chat (GPT-4o)", description: "Multi-turn AI chat with live data tools", included: true },
    { id: "f6", name: "Analytics & Report Generation", description: "KPI dashboards, trend charts, PDF reports", included: true },
    { id: "f7", name: "Team & Role Management", description: "Multi-user portal with section permissions", included: true },
    { id: "f8", name: "n8n Workflow Automation", description: "Automated email/CRM sync workflows", included: true },
    { id: "f9", name: "Token Cost Tracking", description: "Real-time AI spend tracking per module in £", included: true },
    { id: "f10", name: "Platform Admin Panel", description: "Multi-tenant management console", included: true },
  ],
  limits: {
    aiSystems: 5,
    monthlyInteractions: 50000,
    storageGb: 100,
    users: 5,
    apiAccess: true,
    customReports: true,
    prioritySupport: true,
  },
};

export const mockUsageStats: UsageStats = {
  aiInteractions: { used: 3842, limit: 50000 },
  storageUsed: { used: 18, limit: 100, unit: "GB" },
  apiCalls: { used: 12450, limit: 500000 },
  activeSystems: { used: 3, limit: 5 },
};

export const mockTokenSpending = [
  { name: "Web AI Chat",        value: 12.40, color: "#6366f1", model: "gpt-4o",    company: "OpenAI"  },
  { name: "Telegram Bot",       value:  8.20, color: "#3b82f6", model: "gpt-4o",    company: "OpenAI"  },
  { name: "Telegram Voice",     value:  3.60, color: "#8b5cf6", model: "whisper-1", company: "OpenAI"  },
  { name: "Report Generation",  value:  2.80, color: "#10b981", model: "gpt-4o",    company: "OpenAI"  },
  { name: "Lead Analysis",      value:  4.10, color: "#f59e0b", model: "gpt-4o",    company: "OpenAI"  },
];

export const mockInvoices: Invoice[] = [
  { id: "inv_005", number: "INV-2026-05", date: "2026-05-28", dueDate: "2026-06-07", amount: 850, currency: "GBP", status: "pending", pdfUrl: "#", items: [
    { description: "AIOS Professional — Monthly Maintenance (June 2026)", quantity: 1, unitPrice: 850, total: 850 },
  ]},
  { id: "inv_004", number: "INV-2026-04", date: "2026-04-28", dueDate: "2026-05-07", amount: 850, currency: "GBP", status: "paid", pdfUrl: "#", items: [
    { description: "AIOS Professional — Monthly Maintenance (May 2026)", quantity: 1, unitPrice: 850, total: 850 },
  ]},
  { id: "inv_003", number: "INV-2026-03", date: "2026-03-28", dueDate: "2026-04-07", amount: 850, currency: "GBP", status: "paid", pdfUrl: "#", items: [
    { description: "AIOS Professional — Monthly Maintenance (April 2026)", quantity: 1, unitPrice: 850, total: 850 },
  ]},
  { id: "inv_002", number: "INV-2026-02", date: "2026-02-28", dueDate: "2026-03-07", amount: 850, currency: "GBP", status: "paid", pdfUrl: "#", items: [
    { description: "AIOS Professional — Monthly Maintenance (March 2026)", quantity: 1, unitPrice: 850, total: 850 },
  ]},
  { id: "inv_001", number: "INV-2026-01", date: "2026-01-28", dueDate: "2026-02-07", amount: 14850, currency: "GBP", status: "paid", pdfUrl: "#", items: [
    { description: "AIOS Platform Setup & Development (one-time)", quantity: 1, unitPrice: 14000, total: 14000 },
    { description: "AIOS Professional — Monthly Maintenance (February 2026)", quantity: 1, unitPrice: 850, total: 850 },
  ]},
];

// ── AI Systems ──

export const mockAISystems: AISystem[] = [
  {
    id: "sys_webchat",
    name: "AIOS Web Chat",
    description: "Claude Sonnet 4.6 powered clinical assistant embedded in the AIOS platform. Handles multi-turn conversations with access to live business data: patients, leads, calendar events, emails, and metrics via tool calling.",
    shortDescription: "Claude Sonnet 4.6 assistant with live data access",
    status: "active",
    health: "healthy",
    category: "ai-assistant",
    icon: "Bot",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "claude-sonnet-4-6",
    automations: 6,
    successRate: 99.1,
    metrics: {
      totalInteractions: 4820,
      interactionsThisMonth: 842,
      avgResponseTime: 2.4,
      tasksAutomated: 4820,
      leadsGenerated: 0,
      hoursSaved: 96,
      uptime: 99.9,
    },
  },
  {
    id: "sys_telegram",
    name: "AIOS Telegram Bot",
    description: "Claude Sonnet 4.6 assistant accessible via Telegram. Responds to text and voice messages, queries live clinical data using the same tool suite as the web chat, and maintains per-conversation history in the database.",
    shortDescription: "Claude Sonnet 4.6 Telegram assistant with voice support",
    status: "active",
    health: "healthy",
    category: "ai-assistant",
    icon: "MessageCircle",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "claude-sonnet-4-6",
    automations: 6,
    successRate: 98.6,
    metrics: {
      totalInteractions: 3240,
      interactionsThisMonth: 520,
      avgResponseTime: 3.1,
      tasksAutomated: 3240,
      leadsGenerated: 0,
      hoursSaved: 64,
      uptime: 99.8,
    },
  },
  {
    id: "sys_voice",
    name: "AIOS Voice Transcription",
    description: "OpenAI Whisper-1 powered voice processing layer for the Telegram bot. Transcribes OGG audio files sent as voice messages, converting them to text before passing to the Claude reasoning engine.",
    shortDescription: "Whisper-1 voice-to-text for Telegram messages",
    status: "active",
    health: "healthy",
    category: "voice-processing",
    icon: "Mic",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "whisper-1",
    automations: 1,
    successRate: 97.2,
    metrics: {
      totalInteractions: 410,
      interactionsThisMonth: 68,
      avgResponseTime: 4.2,
      tasksAutomated: 410,
      leadsGenerated: 0,
      hoursSaved: 18,
      uptime: 99.9,
    },
  },
  {
    id: "sys_security",
    name: "Security Monitor",
    description: "Real-time security event tracking and threat detection. Monitors login activity, access patterns, and anomalies across all users and tenants. Logs events to aios.security_events with severity classification (low/medium/high/critical) and notifies admins via the dashboard notification system.",
    shortDescription: "Real-time threat detection & security event tracking",
    status: "active",
    health: "healthy",
    category: "security",
    icon: "Shield",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "v1.0",
    automations: 4,
    successRate: 99.8,
    metrics: {
      totalInteractions: 2840,
      interactionsThisMonth: 312,
      avgResponseTime: 0.3,
      tasksAutomated: 2840,
      leadsGenerated: 0,
      hoursSaved: 28,
      uptime: 99.9,
    },
  },
  {
    id: "sys_gmail",
    name: "Gmail Email Sync",
    description: "Automated Gmail inbox synchronisation via n8n workflow. Polls every 5 minutes using the Gmail REST API, parses full MIME content including multi-part bodies, and stores emails in aios.emails for AI-powered search and categorisation. Auto-purges emails older than 90 days.",
    shortDescription: "n8n-powered Gmail sync — polls every 5 min",
    status: "active",
    health: "healthy",
    category: "email-automation",
    icon: "Mail",
    installedDate: "2026-02-15",
    lastActive: new Date().toISOString(),
    version: "Gmail API v1 + n8n",
    automations: 3,
    successRate: 98.4,
    metrics: {
      totalInteractions: 1640,
      interactionsThisMonth: 218,
      avgResponseTime: 1.8,
      tasksAutomated: 1640,
      leadsGenerated: 0,
      hoursSaved: 42,
      uptime: 99.7,
    },
  },
  {
    id: "sys_calendar",
    name: "Calendar & Reminders",
    description: "Intelligent calendar system with full recurring event support (rrule). Handles meeting, invoice, contract, reminder, and custom categories with entity linking (leads, clients). Sends automated daily digest notifications via Telegram and email at 08:00 UTC through n8n.",
    shortDescription: "Recurring events with Telegram/email digest at 08:00",
    status: "active",
    health: "healthy",
    category: "calendar",
    icon: "CalendarDays",
    installedDate: "2026-03-01",
    lastActive: new Date().toISOString(),
    version: "rrule v2.8",
    automations: 2,
    successRate: 99.5,
    metrics: {
      totalInteractions: 920,
      interactionsThisMonth: 84,
      avgResponseTime: 0.9,
      tasksAutomated: 920,
      leadsGenerated: 0,
      hoursSaved: 22,
      uptime: 99.8,
    },
  },
  {
    id: "sys_n8n",
    name: "n8n Workflow Automation",
    description: "No-code workflow automation engine powering all AIOS background integrations. Currently running 3 active workflows: Email Watcher (Gmail → DB, every 5 min), Calendar Notifier (daily digest → Telegram + email at 08:00 UTC), and Email Purge (90-day retention cron at 03:00 UTC).",
    shortDescription: "3 active workflows — email, calendar, purge",
    status: "active",
    health: "healthy",
    category: "workflow-automation",
    icon: "Workflow",
    installedDate: "2026-01-28",
    lastActive: new Date().toISOString(),
    version: "n8n cloud",
    automations: 3,
    successRate: 99.2,
    metrics: {
      totalInteractions: 5820,
      interactionsThisMonth: 640,
      avgResponseTime: 2.1,
      tasksAutomated: 5820,
      leadsGenerated: 0,
      hoursSaved: 56,
      uptime: 99.6,
    },
  },
];

// ── KPIs ──

export const mockKPIs: KPI[] = [
  { id: "kpi_1", label: "Leads Generated", value: 5540, change: 12.5, changeType: "increase", icon: "Users", format: "number" },
  { id: "kpi_2", label: "Tasks Automated", value: 114020, change: 18.3, changeType: "increase", icon: "Zap", format: "number" },
  { id: "kpi_3", label: "Hours Saved", value: 18790, change: 22.1, changeType: "increase", icon: "Clock", format: "duration" },
  { id: "kpi_4", label: "Revenue Influenced", value: 2840000, change: 15.7, changeType: "increase", icon: "PoundSterling", format: "currency" },
  { id: "kpi_5", label: "AI Interactions", value: 1162550, change: 8.4, changeType: "increase", icon: "MessageSquare", format: "number" },
  { id: "kpi_6", label: "Conversion Rate", value: 23.4, change: 5.2, changeType: "increase", icon: "TrendingUp", format: "percentage" },
];

// ── Activity Feed ──

export const mockActivityFeed: ActivityFeedItem[] = [
  { id: "act_01", type: "automation", title: "AIOS Web Chat: New conversation batch processed", description: "47 new multi-turn conversations handled with live data access", timestamp: "2026-05-09T10:30:00Z", status: "success" },
  { id: "act_02", type: "system", title: "AIOS Telegram Bot: Response time improved", description: "Average response time dropped to 0.8s this week", timestamp: "2026-05-09T09:45:00Z", status: "info" },
  { id: "act_03", type: "report", title: "Monthly executive report ready", description: "April 2026 performance report available for download", timestamp: "2026-05-09T09:00:00Z", status: "info" },
  { id: "act_04", type: "milestone", title: "8K tasks automated", description: "AIOS Web Chat reached 8,000 automated tasks milestone", timestamp: "2026-05-09T07:15:00Z", status: "success" },
  { id: "act_05", type: "automation", title: "AIOS Voice Transcription: Accuracy improved", description: "Voice transcription accuracy increased to 99.2% this week", timestamp: "2026-05-08T22:30:00Z", status: "success" },
  { id: "act_06", type: "ticket", title: "Support ticket #TK-2041 resolved", description: "Telegram integration question resolved", timestamp: "2026-05-08T18:00:00Z", status: "success" },
  { id: "act_07", type: "automation", title: "AIOS Telegram Bot: Voice message batch processed", description: "1,240 voice messages transcribed and responded to — 12,400 users", timestamp: "2026-05-08T15:20:00Z", status: "success" },
  { id: "act_08", type: "system", title: "AIOS Web Chat: Maintenance window", description: "Scheduled maintenance for GPT-4o model refresh", timestamp: "2026-05-08T14:00:00Z", status: "warning" },
];

export const mockNotifications: Notification[] = [
  { id: "notif_1", title: "Report Generated", description: "Your April 2026 monthly report is ready", type: "success", read: false, timestamp: "2026-05-09T10:00:00Z", category: "report", link: "/reports" },
  { id: "notif_2", title: "System Update", description: "AIOS Web Chat updated to v1.2.1", type: "info", read: false, timestamp: "2026-05-09T08:00:00Z", category: "system", link: "/systems/sys_webchat" },
  { id: "notif_3", title: "Invoice Due", description: "Invoice INV-2026-05 due May 15", type: "warning", read: false, timestamp: "2026-05-08T12:00:00Z", category: "billing", link: "/billing" },
  { id: "notif_4", title: "Ticket Update", description: "Sarah replied to your support ticket", type: "info", read: true, timestamp: "2026-05-08T09:30:00Z", category: "ticket", link: "/support" },
  { id: "notif_5", title: "Milestone Reached", description: "1.1M total AI interactions processed", type: "success", read: true, timestamp: "2026-05-07T16:00:00Z", category: "general" },
];

export const mockSystemActivities: SystemActivity[] = [
  { id: "sa_1", systemId: "sys_webchat", systemName: "AIOS Web Chat", action: "Conversation batch processing completed", timestamp: "2026-05-09T10:30:00Z", status: "success", details: "47 multi-turn conversations handled with live data tools" },
  { id: "sa_2", systemId: "sys_telegram", systemName: "AIOS Telegram Bot", action: "Response time optimization", timestamp: "2026-05-09T09:45:00Z", status: "success", details: "Avg response time: 0.8s" },
  { id: "sa_3", systemId: "sys_voice", systemName: "AIOS Voice Transcription", action: "Voice batch transcription completed", timestamp: "2026-05-09T09:00:00Z", status: "success", details: "410 voice messages transcribed, accuracy: 99.2%" },
  { id: "sa_4", systemId: "sys_webchat", systemName: "AIOS Web Chat", action: "Daily conversation batch processing", timestamp: "2026-05-09T08:30:00Z", status: "warning", details: "18/20 conversation threads completed — 2 delayed" },
  { id: "sa_5", systemId: "sys_telegram", systemName: "AIOS Telegram Bot", action: "Message campaign processed", timestamp: "2026-05-09T08:00:00Z", status: "success", details: "1,240 messages sent to 12,400 users across channels" },
  { id: "sa_6", systemId: "sys_voice", systemName: "AIOS Voice Transcription", action: "Weekly transcription analytics refresh", timestamp: "2026-05-09T03:00:00Z", status: "success", details: "Voice accuracy metrics updated with 99.2% confidence" },
];

// ── Reports ──

export const mockReports: Report[] = [
  { id: "rpt_001", title: "April 2026 Performance Report", type: "monthly", category: "performance", period: "April 2026", generatedAt: "2026-05-01T08:00:00Z", size: "2.4 MB", pdfUrl: "#", summary: "Comprehensive overview of all AI system performance metrics for April 2026. AIOS Web Chat handled 842 conversations with live data access. AIOS Telegram Bot maintained 99.95% uptime.", highlights: ["842 web chat conversations", "99.95% Telegram Bot uptime", "3,240 tasks automated", "22% increase in hours saved vs March"], aiGeneratedNote: "April showed strong growth across all systems. AIOS Web Chat outperformed targets by 15%. Recommend expanding voice transcription automation to handle more Telegram voice messages." },
  { id: "rpt_002", title: "Q1 2026 Executive Summary", type: "quarterly", category: "executive", period: "Q1 2026", generatedAt: "2026-04-05T10:00:00Z", size: "5.1 MB", pdfUrl: "#", summary: "Executive summary covering Q1 2026 performance, ROI analysis, and strategic recommendations. Overall platform ROI reached 312%.", highlights: ["312% platform ROI", "£2.24M revenue influenced", "8,470 tasks automated", "5.2% engagement rate improvement"], aiGeneratedNote: "The platform delivered exceptional Q1 results with a 312% ROI. The integration of AIOS Voice Transcription in March adds significant voice-to-text capability. Consider upgrading to Enterprise tier to unlock multi-language voice support." },
  { id: "rpt_003", title: "March 2026 Performance Report", type: "monthly", category: "performance", period: "March 2026", generatedAt: "2026-04-01T08:00:00Z", size: "2.1 MB", pdfUrl: "#", summary: "Monthly performance overview. AIOS Telegram Bot processed 520 conversations. AIOS Voice Transcription saved 18 hours.", highlights: ["520 Telegram conversations processed", "410 voice messages transcribed", "98.7% overall system uptime"], aiGeneratedNote: "Consistent performance across all systems. AIOS Voice Transcription continues to be the highest-ROI system in terms of operational efficiency." },
  { id: "rpt_004", title: "February 2026 Performance Report", type: "monthly", category: "performance", period: "February 2026", generatedAt: "2026-03-01T08:00:00Z", size: "1.9 MB", pdfUrl: "#", summary: "Monthly overview. AIOS Web Chat generated 780 conversations. AIOS Telegram Bot handled 450 messages.", highlights: ["780 web chat conversations", "450 Telegram conversations", "64 hours saved"], aiGeneratedNote: "Steady month-over-month growth. AIOS Telegram Bot volume increased 12% as new bot features were integrated." },
  { id: "rpt_005", title: "Annual ROI Analysis 2025", type: "annual", category: "roi", period: "2025", generatedAt: "2026-01-15T12:00:00Z", size: "8.7 MB", pdfUrl: "#", summary: "Complete annual ROI analysis for the 2025 fiscal year. Total platform ROI of 285% with £7.27M in influenced revenue.", highlights: ["285% annual ROI", "£7.27M revenue influenced", "7,470+ tasks automated", "178+ hours saved"], aiGeneratedNote: "2025 was a transformative year for AI integration at Atlas Ventures. The platform exceeded expectations with 285% ROI. Key recommendation for 2026: expand AIOS systems to cover multi-language voice support and advanced Telegram features." },
];

// ── Support Tickets ──

export const mockTickets: SupportTicket[] = [
  { id: "tk_001", number: "TK-2045", subject: "AIOS Web Chat integration with Salesforce", description: "Need assistance configuring the Salesforce integration for AIOS Web Chat. Custom field mapping not syncing.", status: "open", priority: "high", category: "technical", createdAt: "2026-05-08T14:30:00Z", updatedAt: "2026-05-09T09:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Mark Davis", content: "Hi, we're having trouble with the Salesforce integration for AIOS Web Chat. Custom field mappings aren't syncing properly.", timestamp: "2026-05-08T14:30:00Z" }, { id: "msg_2", sender: "support", senderName: "Alex Rivera", content: "Hi Mark, I'd be happy to help with the Salesforce integration. Could you confirm which version of the Salesforce connector you're using?", timestamp: "2026-05-09T09:00:00Z" }] },
  { id: "tk_002", number: "TK-2044", subject: "AIOS Telegram Bot performance degradation", description: "Noticed slower execution times on Telegram message responses. Average response time increased from 0.8s to 3s.", status: "in_progress", priority: "medium", category: "technical", createdAt: "2026-05-07T11:00:00Z", updatedAt: "2026-05-08T16:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Jennifer Wu", content: "Our Telegram bot responses are running noticeably slower than usual.", timestamp: "2026-05-07T11:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Mike Torres", content: "We've identified a queue backlog on the Telegram processing node. Our team is working on rebalancing the load. ETA: 2 hours.", timestamp: "2026-05-08T16:00:00Z" }] },
  { id: "tk_003", number: "TK-2043", subject: "Billing question about March invoice", description: "Question about a line item on our March 2026 invoice.", status: "resolved", priority: "low", category: "billing", createdAt: "2026-05-05T09:00:00Z", updatedAt: "2026-05-06T14:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Robert Kim", content: "Could you clarify the additional API usage charge on our March invoice?", timestamp: "2026-05-05T09:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Lisa Patel", content: "The additional charge reflects API calls above your plan limit in March. You exceeded the 1M calls by 50,210.", timestamp: "2026-05-06T14:00:00Z" }] },
  { id: "tk_004", number: "TK-2042", subject: "Request: Custom report template", description: "Looking to create a custom executive summary template for our board meetings.", status: "open", priority: "medium", category: "feature-request", createdAt: "2026-05-04T15:00:00Z", updatedAt: "2026-05-05T10:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Amanda Cole", content: "We'd like to create a custom executive report template for our monthly board presentations.", timestamp: "2026-05-04T15:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Tom Baker", content: "I've forwarded your request to our solutions team. They can build a custom template within 3 business days.", timestamp: "2026-05-05T10:00:00Z" }] },
  { id: "tk_005", number: "TK-2041", subject: "AIOS Voice Transcription accuracy issue", description: "Voice transcription has noticeable errors in technical terminology. Need improved accuracy for specialized content.", status: "in_progress", priority: "medium", category: "technical", createdAt: "2026-05-03T13:00:00Z", updatedAt: "2026-05-04T17:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Carlos Mendez", content: "Our voice messages in Telegram contain technical terms that are being transcribed incorrectly.", timestamp: "2026-05-03T13:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Rachel Green", content: "We've identified the issue in the Whisper model's vocabulary. A patch is scheduled for deployment tomorrow.", timestamp: "2026-05-04T17:00:00Z" }] },
  { id: "tk_006", number: "TK-2040", subject: "AIOS Web Chat: Custom data access setup", description: "Need help setting up custom data feeds to extend Web Chat's live data access.", status: "resolved", priority: "low", category: "technical", createdAt: "2026-05-01T10:00:00Z", updatedAt: "2026-05-02T16:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "David Park", content: "How do I set up custom data feeds for AIOS Web Chat?", timestamp: "2026-05-01T10:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Nina Gupta", content: "I've enabled the custom data builder for your account. Follow the setup wizard at Systems > Web Chat > Data Feeds.", timestamp: "2026-05-02T16:00:00Z" }] },
  { id: "tk_007", number: "TK-2039", subject: "Account upgrade inquiry", description: "Interested in upgrading to Enterprise plan. Would like to understand pricing and features.", status: "waiting", priority: "low", category: "billing", createdAt: "2026-04-28T09:00:00Z", updatedAt: "2026-04-29T11:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Emily Watson", content: "We're interested in the Enterprise plan. Can someone walk us through the pricing and features?", timestamp: "2026-04-28T09:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Sarah Chen", content: "I'd be happy to schedule a call to discuss the Enterprise plan. Are you available Thursday at 2pm EST?", timestamp: "2026-04-29T11:00:00Z" }] },
  { id: "tk_008", number: "TK-2038", subject: "API rate limiting clarification", description: "Documentation unclear on rate limits for the Telegram bot API endpoints.", status: "closed", priority: "low", category: "general", createdAt: "2026-04-25T14:00:00Z", updatedAt: "2026-04-26T10:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "James Liu", content: "The docs mention different rate limits for Telegram endpoints. Can you clarify?", timestamp: "2026-04-25T14:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Alex Rivera", content: "Telegram bot endpoints: 30 req/min for messages, 10 req/min for voice. Full docs updated.", timestamp: "2026-04-26T10:00:00Z" }] },
];

// ── FAQs ──

export const mockFAQs: FAQItem[] = [
  { id: "faq_1", question: "How do I add a new user to the portal?", answer: "Navigate to Settings > Team, click 'Invite User', enter their email, select a role, and they'll receive an invitation link.", category: "general" },
  { id: "faq_2", question: "What happens when I reach my monthly interaction limit?", answer: "You'll receive a notification at 80% usage. Once the limit is reached, additional interactions are billed at the overage rate listed in your plan. You can upgrade your plan at any time to increase limits.", category: "billing" },
  { id: "faq_3", question: "How do I integrate an AI system with my CRM?", answer: "Each AI system has a dedicated Integrations tab. Select your CRM from the list, authenticate, and follow the field mapping wizard. Our support team can assist with custom integrations.", category: "technical" },
  { id: "faq_4", question: "How often are reports generated?", answer: "Monthly performance reports are auto-generated on the 1st of each month. Executive summaries are generated quarterly. You can also generate custom reports on-demand from the Reports section.", category: "general" },
  { id: "faq_5", question: "What's the difference between Professional and Enterprise plans?", answer: "Enterprise includes unlimited AI systems, 1M monthly interactions, dedicated infrastructure, custom model training, 99.99% SLA, and a dedicated solutions architect. Professional is ideal for teams up to 25 users.", category: "billing" },
  { id: "faq_6", question: "How do I train a custom AI model?", answer: "Custom model training is available on Professional and Enterprise plans. Go to AI Systems > Model Training, upload your dataset, define your objectives, and our platform handles the training pipeline. Typical turnaround is 48-72 hours.", category: "technical" },
];

// ── Analytics Data ──

function generateTrend(months: number, baseValue: number, variance: number, growthRate: number): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const trend = baseValue * (1 + (growthRate * (months - i)) / months);
    const noise = (Math.random() - 0.5) * variance * 2;
    data.push({
      date: date.toISOString().slice(0, 7),
      value: Math.max(0, Math.round(trend + noise)),
    });
  }
  return data;
}

export const mockTrends: TrendData[] = [
  { id: "trend_1", title: "Monthly AI Interactions", currentValue: 1162550, previousValue: 1072100, changePercent: 8.4, data: generateTrend(12, 850000, 50000, 300000), color: "#6366f1" },
  { id: "trend_2", title: "Leads Generated per Month", currentValue: 1240, previousValue: 1100, changePercent: 12.7, data: generateTrend(12, 900, 100, 300), color: "#10b981" },
  { id: "trend_3", title: "Hours Saved", currentValue: 1680, previousValue: 1380, changePercent: 21.7, data: generateTrend(12, 1100, 150, 500), color: "#f59e0b" },
  { id: "trend_4", title: "Revenue Influenced (£K)", currentValue: 284, previousValue: 245, changePercent: 15.9, data: generateTrend(12, 180, 25, 100), color: "#3b82f6" },
];

export const mockComparisons: MetricComparison[] = [
  { id: "comp_1", label: "Leads Generated", currentPeriod: 1240, previousPeriod: 1100, changePercent: 12.7, format: "number" },
  { id: "comp_2", label: "Tasks Automated", currentPeriod: 8900, previousPeriod: 7400, changePercent: 20.3, format: "number" },
  { id: "comp_3", label: "Avg Response Time", currentPeriod: 1.2, previousPeriod: 1.8, changePercent: -33.3, format: "duration" },
  { id: "comp_4", label: "Revenue Influenced", currentPeriod: 284000, previousPeriod: 245000, changePercent: 15.9, format: "currency" },
  { id: "comp_5", label: "Conversion Rate", currentPeriod: 23.4, previousPeriod: 21.8, changePercent: 7.3, format: "percentage" },
  { id: "comp_6", label: "System Uptime", currentPeriod: 99.92, previousPeriod: 99.87, changePercent: 0.05, format: "percentage" },
];
