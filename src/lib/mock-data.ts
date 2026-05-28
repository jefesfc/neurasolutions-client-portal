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
    aiSystems: 10,
    monthlyInteractions: 50000,
    storageGb: 100,
    users: 10,
    apiAccess: true,
    customReports: true,
    prioritySupport: true,
  },
};

export const mockUsageStats: UsageStats = {
  aiInteractions: { used: 3842, limit: 50000 },
  storageUsed: { used: 18, limit: 100, unit: "GB" },
  apiCalls: { used: 12450, limit: 500000 },
  activeSystems: { used: 4, limit: 10 },
};

export const mockTokenSpending = [
  { name: "Web AI Chat", value: 12.40, color: "#6366f1" },
  { name: "Telegram Bot", value: 8.20, color: "#3b82f6" },
  { name: "Telegram Voice", value: 3.60, color: "#8b5cf6" },
  { name: "Report Generation", value: 2.80, color: "#10b981" },
  { name: "Lead Analysis", value: 4.10, color: "#f59e0b" },
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
    id: "sys_001",
    name: "LeadGen Pro",
    description: "Advanced lead generation system that identifies, qualifies, and enriches potential prospects using behavioral AI and intent data analysis. Automates lead scoring and routing to your sales team.",
    shortDescription: "AI-powered lead discovery and enrichment engine",
    status: "active",
    health: "healthy",
    category: "lead-generation",
    icon: "Target",
    installedDate: "2024-08-12",
    lastActive: new Date().toISOString(),
    version: "3.2.1",
    automations: 12,
    successRate: 98.5,
    metrics: {
      totalInteractions: 145820,
      interactionsThisMonth: 12450,
      avgResponseTime: 1.2,
      tasksAutomated: 8920,
      leadsGenerated: 3450,
      hoursSaved: 1240,
      uptime: 99.98,
    },
  },
  {
    id: "sys_002",
    name: "SupportAI",
    description: "Intelligent customer support automation system handling inquiries, ticket routing, and resolution suggestions. Includes sentiment analysis and multi-language support.",
    shortDescription: "24/7 intelligent customer support automation",
    status: "active",
    health: "healthy",
    category: "customer-support",
    icon: "MessageSquare",
    installedDate: "2024-09-05",
    lastActive: new Date().toISOString(),
    version: "2.8.4",
    automations: 8,
    successRate: 96.2,
    metrics: {
      totalInteractions: 289400,
      interactionsThisMonth: 22100,
      avgResponseTime: 0.8,
      tasksAutomated: 15600,
      leadsGenerated: 0,
      hoursSaved: 2890,
      uptime: 99.95,
    },
  },
  {
    id: "sys_003",
    name: "DataInsight Engine",
    description: "Real-time data analysis platform processing millions of data points to generate actionable business insights, trend detection, and predictive forecasting.",
    shortDescription: "Real-time data analysis and predictive insights",
    status: "active",
    health: "healthy",
    category: "data-analysis",
    icon: "BarChart3",
    installedDate: "2024-10-18",
    lastActive: new Date().toISOString(),
    version: "4.1.0",
    automations: 15,
    successRate: 99.1,
    metrics: {
      totalInteractions: 567230,
      interactionsThisMonth: 45300,
      avgResponseTime: 2.4,
      tasksAutomated: 23400,
      leadsGenerated: 0,
      hoursSaved: 4200,
      uptime: 99.99,
    },
  },
  {
    id: "sys_004",
    name: "Workflow Automator",
    description: "End-to-end business process automation system. Connects your existing tools and creates intelligent workflows that reduce manual work across departments.",
    shortDescription: "End-to-end business process automation",
    status: "active",
    health: "degraded",
    category: "workflow-automation",
    icon: "Workflow",
    installedDate: "2024-11-20",
    lastActive: "2026-05-09T08:30:00Z",
    version: "2.5.1",
    automations: 20,
    successRate: 94.8,
    metrics: {
      totalInteractions: 89200,
      interactionsThisMonth: 7100,
      avgResponseTime: 3.1,
      tasksAutomated: 45200,
      leadsGenerated: 0,
      hoursSaved: 6800,
      uptime: 99.5,
    },
  },
  {
    id: "sys_005",
    name: "ContentForge AI",
    description: "AI content creation system for marketing materials, social media, email campaigns, and SEO-optimized copy. Includes brand voice customization and A/B testing.",
    shortDescription: "AI-powered content creation and optimization",
    status: "active",
    health: "healthy",
    category: "content-creation",
    icon: "PenTool",
    installedDate: "2025-01-15",
    lastActive: "2026-05-09T09:15:00Z",
    version: "1.9.3",
    automations: 6,
    successRate: 97.3,
    metrics: {
      totalInteractions: 34200,
      interactionsThisMonth: 2800,
      avgResponseTime: 1.5,
      tasksAutomated: 8900,
      leadsGenerated: 1200,
      hoursSaved: 1560,
      uptime: 99.7,
    },
  },
  {
    id: "sys_006",
    name: "Predictive Analytics",
    description: "Advanced predictive modeling system using machine learning to forecast market trends, customer behavior, and revenue projections with 94% accuracy.",
    shortDescription: "ML-powered predictive forecasting and modeling",
    status: "maintenance",
    health: "degraded",
    category: "predictive-analytics",
    icon: "TrendingUp",
    installedDate: "2025-03-08",
    lastActive: "2026-05-09T03:00:00Z",
    version: "1.4.2",
    automations: 10,
    successRate: 94.0,
    metrics: {
      totalInteractions: 56700,
      interactionsThisMonth: 4200,
      avgResponseTime: 5.2,
      tasksAutomated: 12000,
      leadsGenerated: 890,
      hoursSaved: 2100,
      uptime: 98.2,
    },
  },
];

// ── KPIs ──

export const mockKPIs: KPI[] = [
  { id: "kpi_1", label: "Leads Generated", value: 5540, change: 12.5, changeType: "increase", icon: "Users", format: "number" },
  { id: "kpi_2", label: "Tasks Automated", value: 114020, change: 18.3, changeType: "increase", icon: "Zap", format: "number" },
  { id: "kpi_3", label: "Hours Saved", value: 18790, change: 22.1, changeType: "increase", icon: "Clock", format: "duration" },
  { id: "kpi_4", label: "Revenue Influenced", value: 2840000, change: 15.7, changeType: "increase", icon: "DollarSign", format: "currency" },
  { id: "kpi_5", label: "AI Interactions", value: 1162550, change: 8.4, changeType: "increase", icon: "MessageSquare", format: "number" },
  { id: "kpi_6", label: "Conversion Rate", value: 23.4, change: 5.2, changeType: "increase", icon: "TrendingUp", format: "percentage" },
];

// ── Activity Feed ──

export const mockActivityFeed: ActivityFeedItem[] = [
  { id: "act_01", type: "automation", title: "LeadGen Pro: New batch qualified", description: "47 new leads qualified and routed to sales", timestamp: "2026-05-09T10:30:00Z", status: "success" },
  { id: "act_02", type: "system", title: "SupportAI: Response time improved", description: "Average response time dropped to 0.8s this week", timestamp: "2026-05-09T09:45:00Z", status: "info" },
  { id: "act_03", type: "report", title: "Monthly executive report ready", description: "April 2026 performance report available for download", timestamp: "2026-05-09T09:00:00Z", status: "info" },
  { id: "act_04", type: "milestone", title: "100K tasks automated", description: "Workflow Automator reached 100,000 automated tasks milestone", timestamp: "2026-05-09T07:15:00Z", status: "success" },
  { id: "act_05", type: "automation", title: "DataInsight: Anomaly detected", description: "Unusual pattern in Q2 revenue data — review recommended", timestamp: "2026-05-08T22:30:00Z", status: "warning" },
  { id: "act_06", type: "ticket", title: "Support ticket #TK-2041 resolved", description: "Billing inquiry for March invoice resolved", timestamp: "2026-05-08T18:00:00Z", status: "success" },
  { id: "act_07", type: "automation", title: "ContentForge: Campaign launched", description: "Q2 email nurture campaign deployed — 12,400 recipients", timestamp: "2026-05-08T15:20:00Z", status: "success" },
  { id: "act_08", type: "system", title: "Predictive Analytics: Maintenance window", description: "Scheduled maintenance for v1.5.0 upgrade", timestamp: "2026-05-08T14:00:00Z", status: "warning" },
];

export const mockNotifications: Notification[] = [
  { id: "notif_1", title: "Report Generated", description: "Your April 2026 monthly report is ready", type: "success", read: false, timestamp: "2026-05-09T10:00:00Z", category: "report", link: "/reports" },
  { id: "notif_2", title: "System Update", description: "LeadGen Pro updated to v3.2.1", type: "info", read: false, timestamp: "2026-05-09T08:00:00Z", category: "system", link: "/systems/sys_001" },
  { id: "notif_3", title: "Invoice Due", description: "Invoice INV-2026-05 due May 15", type: "warning", read: false, timestamp: "2026-05-08T12:00:00Z", category: "billing", link: "/billing" },
  { id: "notif_4", title: "Ticket Update", description: "Sarah replied to your support ticket", type: "info", read: true, timestamp: "2026-05-08T09:30:00Z", category: "ticket", link: "/support" },
  { id: "notif_5", title: "Milestone Reached", description: "500K total AI interactions processed", type: "success", read: true, timestamp: "2026-05-07T16:00:00Z", category: "general" },
];

export const mockSystemActivities: SystemActivity[] = [
  { id: "sa_1", systemId: "sys_001", systemName: "LeadGen Pro", action: "Lead batch qualification completed", timestamp: "2026-05-09T10:30:00Z", status: "success", details: "47 leads qualified, 12 marked as high-priority" },
  { id: "sa_2", systemId: "sys_002", systemName: "SupportAI", action: "Response time optimization", timestamp: "2026-05-09T09:45:00Z", status: "success", details: "Avg response time: 0.8s" },
  { id: "sa_3", systemId: "sys_003", systemName: "DataInsight Engine", action: "Weekly trend analysis completed", timestamp: "2026-05-09T09:00:00Z", status: "success", details: "3 trends identified, 1 anomaly flagged" },
  { id: "sa_4", systemId: "sys_004", systemName: "Workflow Automator", action: "Daily workflow batch processing", timestamp: "2026-05-09T08:30:00Z", status: "warning", details: "18/20 workflows completed — 2 delayed" },
  { id: "sa_5", systemId: "sys_005", systemName: "ContentForge AI", action: "Email campaign content generated", timestamp: "2026-05-09T08:00:00Z", status: "success", details: "5 email variants created for A/B testing" },
  { id: "sa_6", systemId: "sys_006", systemName: "Predictive Analytics", action: "Q3 forecast refresh", timestamp: "2026-05-09T03:00:00Z", status: "success", details: "Revenue forecast updated with 94% confidence" },
];

// ── Reports ──

export const mockReports: Report[] = [
  { id: "rpt_001", title: "April 2026 Performance Report", type: "monthly", category: "performance", period: "April 2026", generatedAt: "2026-05-01T08:00:00Z", size: "2.4 MB", pdfUrl: "#", summary: "Comprehensive overview of all AI system performance metrics for April 2026. LeadGen Pro delivered exceptional results with 1,240 new qualified leads. SupportAI maintained 99.95% uptime.", highlights: ["1,240 new qualified leads", "99.95% SupportAI uptime", "8,900 tasks automated", "22% increase in hours saved vs March"], aiGeneratedNote: "April showed strong growth across all systems. LeadGen Pro outperformed targets by 15%. Recommend expanding content creation automation to capture additional lead generation opportunities." },
  { id: "rpt_002", title: "Q1 2026 Executive Summary", type: "quarterly", category: "executive", period: "Q1 2026", generatedAt: "2026-04-05T10:00:00Z", size: "5.1 MB", pdfUrl: "#", summary: "Executive summary covering Q1 2026 performance, ROI analysis, and strategic recommendations. Overall platform ROI reached 312%.", highlights: ["312% platform ROI", "$2.84M revenue influenced", "45,200 tasks automated", "5.2% conversion rate improvement"], aiGeneratedNote: "The platform delivered exceptional Q1 results with a 312% ROI. The integration of Predictive Analytics in March adds significant forecasting capability. Consider upgrading to Enterprise tier to unlock custom model training." },
  { id: "rpt_003", title: "March 2026 Performance Report", type: "monthly", category: "performance", period: "March 2026", generatedAt: "2026-04-01T08:00:00Z", size: "2.1 MB", pdfUrl: "#", summary: "Monthly performance overview. DataInsight Engine processed 43,000 interactions. Workflow Automator saved 1,580 hours.", highlights: ["43,000 DataInsight interactions", "1,580 hours saved", "98.7% overall system uptime"], aiGeneratedNote: "Consistent performance across all systems. Workflow Automator continues to be the highest-ROI system in terms of hours saved." },
  { id: "rpt_004", title: "February 2026 Performance Report", type: "monthly", category: "performance", period: "February 2026", generatedAt: "2026-03-01T08:00:00Z", size: "1.9 MB", pdfUrl: "#", summary: "Monthly overview. LeadGen Pro generated 1,100 leads. SupportAI handled 19,800 inquiries.", highlights: ["1,100 leads generated", "19,800 inquiries handled", "2,100 hours saved"], aiGeneratedNote: "Steady month-over-month growth. SupportAI volume increased 12% as new chat channels were integrated." },
  { id: "rpt_005", title: "Annual ROI Analysis 2025", type: "annual", category: "roi", period: "2025", generatedAt: "2026-01-15T12:00:00Z", size: "8.7 MB", pdfUrl: "#", summary: "Complete annual ROI analysis for the 2025 fiscal year. Total platform ROI of 285% with $9.2M in influenced revenue.", highlights: ["285% annual ROI", "$9.2M revenue influenced", "98,000+ tasks automated", "45,000+ hours saved"], aiGeneratedNote: "2025 was a transformative year for AI integration at Atlas Ventures. The platform exceeded expectations with 285% ROI. Key recommendation for 2026: expand AI systems to cover predictive analytics and content creation." },
];

// ── Support Tickets ──

export const mockTickets: SupportTicket[] = [
  { id: "tk_001", number: "TK-2045", subject: "LeadGen Pro integration with Salesforce", description: "Need assistance configuring the Salesforce integration for LeadGen Pro. Custom field mapping not syncing.", status: "open", priority: "high", category: "technical", createdAt: "2026-05-08T14:30:00Z", updatedAt: "2026-05-09T09:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Mark Davis", content: "Hi, we're having trouble with the Salesforce integration for LeadGen Pro. Custom field mappings aren't syncing properly.", timestamp: "2026-05-08T14:30:00Z" }, { id: "msg_2", sender: "support", senderName: "Alex Rivera", content: "Hi Mark, I'd be happy to help with the Salesforce integration. Could you confirm which version of the Salesforce connector you're using?", timestamp: "2026-05-09T09:00:00Z" }] },
  { id: "tk_002", number: "TK-2044", subject: "Workflow Automator performance degradation", description: "Noticed slower execution times on our main workflows. Average time increased from 2s to 5s.", status: "in_progress", priority: "medium", category: "technical", createdAt: "2026-05-07T11:00:00Z", updatedAt: "2026-05-08T16:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Jennifer Wu", content: "Our main invoice processing workflow is running noticeably slower than usual.", timestamp: "2026-05-07T11:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Mike Torres", content: "We've identified a queue backlog on the US-East processing node. Our team is working on rebalancing the load. ETA: 2 hours.", timestamp: "2026-05-08T16:00:00Z" }] },
  { id: "tk_003", number: "TK-2043", subject: "Billing question about March invoice", description: "Question about a line item on our March 2026 invoice.", status: "resolved", priority: "low", category: "billing", createdAt: "2026-05-05T09:00:00Z", updatedAt: "2026-05-06T14:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Robert Kim", content: "Could you clarify the additional API usage charge on our March invoice?", timestamp: "2026-05-05T09:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Lisa Patel", content: "The additional charge reflects API calls above your plan limit in March. You exceeded the 1M calls by 50,210.", timestamp: "2026-05-06T14:00:00Z" }] },
  { id: "tk_004", number: "TK-2042", subject: "Request: Custom report template", description: "Looking to create a custom executive summary template for our board meetings.", status: "open", priority: "medium", category: "feature-request", createdAt: "2026-05-04T15:00:00Z", updatedAt: "2026-05-05T10:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Amanda Cole", content: "We'd like to create a custom executive report template for our monthly board presentations.", timestamp: "2026-05-04T15:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Tom Baker", content: "I've forwarded your request to our solutions team. They can build a custom template within 3 business days.", timestamp: "2026-05-05T10:00:00Z" }] },
  { id: "tk_005", number: "TK-2041", subject: "SupportAI Spanish language accuracy", description: "Spanish responses have noticeable grammatical errors. Need improved accuracy.", status: "in_progress", priority: "medium", category: "technical", createdAt: "2026-05-03T13:00:00Z", updatedAt: "2026-05-04T17:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Carlos Mendez", content: "Our Spanish-speaking customers are receiving responses with grammatical errors.", timestamp: "2026-05-03T13:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Rachel Green", content: "We've identified the issue in the language model. A patch is scheduled for deployment tomorrow.", timestamp: "2026-05-04T17:00:00Z" }] },
  { id: "tk_006", number: "TK-2040", subject: "DataInsight: Custom metric setup", description: "Need help setting up a custom metric to track customer lifetime value.", status: "resolved", priority: "low", category: "technical", createdAt: "2026-05-01T10:00:00Z", updatedAt: "2026-05-02T16:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "David Park", content: "How do I set up a custom CLV metric in DataInsight?", timestamp: "2026-05-01T10:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Nina Gupta", content: "I've enabled the custom metric builder for your account. Follow the setup wizard at Analytics > Custom Metrics.", timestamp: "2026-05-02T16:00:00Z" }] },
  { id: "tk_007", number: "TK-2039", subject: "Account upgrade inquiry", description: "Interested in upgrading to Enterprise plan. Would like to understand pricing and features.", status: "waiting", priority: "low", category: "billing", createdAt: "2026-04-28T09:00:00Z", updatedAt: "2026-04-29T11:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "Emily Watson", content: "We're interested in the Enterprise plan. Can someone walk us through the pricing and features?", timestamp: "2026-04-28T09:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Sarah Chen", content: "I'd be happy to schedule a call to discuss the Enterprise plan. Are you available Thursday at 2pm EST?", timestamp: "2026-04-29T11:00:00Z" }] },
  { id: "tk_008", number: "TK-2038", subject: "API rate limiting clarification", description: "Documentation unclear on rate limits for the analytics API endpoints.", status: "closed", priority: "low", category: "general", createdAt: "2026-04-25T14:00:00Z", updatedAt: "2026-04-26T10:00:00Z", messages: [{ id: "msg_1", sender: "client", senderName: "James Liu", content: "The docs mention different rate limits for analytics endpoints. Can you clarify?", timestamp: "2026-04-25T14:00:00Z" }, { id: "msg_2", sender: "support", senderName: "Alex Rivera", content: "Analytics endpoints: 100 req/min for real-time, 30 req/min for historical queries. Full docs updated.", timestamp: "2026-04-26T10:00:00Z" }] },
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
  { id: "trend_4", title: "Revenue Influenced ($K)", currentValue: 284, previousValue: 245, changePercent: 15.9, data: generateTrend(12, 180, 25, 100), color: "#3b82f6" },
];

export const mockComparisons: MetricComparison[] = [
  { id: "comp_1", label: "Leads Generated", currentPeriod: 1240, previousPeriod: 1100, changePercent: 12.7, format: "number" },
  { id: "comp_2", label: "Tasks Automated", currentPeriod: 8900, previousPeriod: 7400, changePercent: 20.3, format: "number" },
  { id: "comp_3", label: "Avg Response Time", currentPeriod: 1.2, previousPeriod: 1.8, changePercent: -33.3, format: "duration" },
  { id: "comp_4", label: "Revenue Influenced", currentPeriod: 284000, previousPeriod: 245000, changePercent: 15.9, format: "currency" },
  { id: "comp_5", label: "Conversion Rate", currentPeriod: 23.4, previousPeriod: 21.8, changePercent: 7.3, format: "percentage" },
  { id: "comp_6", label: "System Uptime", currentPeriod: 99.92, previousPeriod: 99.87, changePercent: 0.05, format: "percentage" },
];
