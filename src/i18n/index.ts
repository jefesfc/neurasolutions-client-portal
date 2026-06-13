export type Lang = 'en' | 'ar';

type Translations = typeof en;

const en = {
  nav: {
    dashboard:      'Dashboard',
    leads:          'Leads',
    clients:        'Clients',
    invoicing:      'Invoicing',
    calendar:       'Calendar',
    emails:         'Emails',
    usage:          'Usage',
    aiSystems:      'AI Systems',
    analytics:      'Analytics',
    reports:        'Reports',
    support:        'Support',
    team:           'Team',
    security:       'Security',
    notifications:  'Notifications',
    billing:        'Billing',
    settings:       'Settings',
  },
  sidebar: {
    main:    'Main',
    account: 'Account',
    version: 'Noor Aesthetics v1.0',
  },
  topbar: {
    search:        'Search...',
    profile:       'Profile',
    signOut:       'Sign out',
    markAllRead:   'Mark all read',
    noNotif:       'No notifications',
    viewAll:       'View all notifications',
    notifications: 'Notifications',
  },
  time: {
    justNow: 'just now',
    mAgo:    (m: number) => `${m}m ago`,
    hAgo:    (h: number) => `${h}h ago`,
    dAgo:    (d: number) => `${d}d ago`,
  },
};

const ar: Translations = {
  nav: {
    dashboard:      'لوحة التحكم',
    leads:          'العملاء المحتملون',
    clients:        'العملاء',
    invoicing:      'الفواتير',
    calendar:       'التقويم',
    emails:         'البريد الإلكتروني',
    usage:          'الاستخدام',
    aiSystems:      'أنظمة الذكاء الاصطناعي',
    analytics:      'التحليلات',
    reports:        'التقارير',
    support:        'الدعم',
    team:           'الفريق',
    security:       'الأمان',
    notifications:  'الإشعارات',
    billing:        'الفوترة',
    settings:       'الإعدادات',
  },
  sidebar: {
    main:    'الرئيسية',
    account: 'الحساب',
    version: 'نور للجماليات v1.0',
  },
  topbar: {
    search:        'ابحث...',
    profile:       'الملف الشخصي',
    signOut:       'تسجيل الخروج',
    markAllRead:   'تعليم الكل مقروءًا',
    noNotif:       'لا توجد إشعارات',
    viewAll:       'عرض كل الإشعارات',
    notifications: 'الإشعارات',
  },
  time: {
    justNow: 'الآن',
    mAgo:    (m: number) => `منذ ${m} دقيقة`,
    hAgo:    (h: number) => `منذ ${h} ساعة`,
    dAgo:    (d: number) => `منذ ${d} يوم`,
  },
};

export const translations: Record<Lang, Translations> = { en, ar };

export function getT(lang: Lang) {
  const dict = translations[lang];
  return dict;
}
