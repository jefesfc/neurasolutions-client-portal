export interface SecurityAnalysis {
  risk_score: number;
  summary: string;
  is_likely_false_positive: boolean;
  recommended_action: string;
  context: string;
}

export interface SecurityEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor_user_id: string | null;
  actor_ip: string | null;
  target_resource: string | null;
  metadata: Record<string, unknown>;
  ai_analysis: SecurityAnalysis | null;
  resolved: boolean;
  created_at: string;
}

export type SecurityTimeRange = '1w' | '1m' | '3m' | '1y';

export interface SecuritySummary {
  total_events: string;
  low_count: string;
  medium_count: string;
  high_count: string;
  critical_count: string;
  high_unresolved: string;
  resolved_count: string;
  unique_event_types: string;
  range: SecurityTimeRange;
  days: number;
}

export interface SecurityAnalysisResult {
  analysis: string;
  events_analyzed: number;
  range: SecurityTimeRange;
  scheduled: boolean;
}

export const SEVERITY_CONFIG: Record<
  SecurityEvent['severity'],
  { label: string; color: string; bg: string; dot: string }
> = {
  low:      { label: 'Low',      color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#6b7280' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', dot: '#f59e0b' },
  high:     { label: 'High',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  dot: '#ef4444' },
  critical: { label: 'Critical', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', dot: '#7c3aed' },
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  login_failed:              'Login Failed',
  brute_force:               'Brute Force',
  login_new_ip:              'New IP Login',
  login_unusual_time:        'Unusual Time Login',
  bulk_export:               'Bulk Export',
  admin_created:             'Admin Created',
  permission_escalation:     'Permission Escalation',
  settings_modified:         'Settings Modified',
  unauthorized_route:        'Unauthorized Route',
  prompt_injection_attempt:  'Prompt Injection',
  suspicious_email_content:  'Suspicious Email',
  fake_data_pattern:         'Fake Data Pattern',
};
