export interface ReportSubItem {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative';
}

export interface ReportItem {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative';
  sub?: ReportSubItem[];
}

export interface ReportSection {
  label: string;
  icon: string;
  color: string;
  items: ReportItem[];
}

export interface ReportData {
  type: 'report';
  title: string;
  subtitle?: string;
  intro?: string;
  sections: ReportSection[];
}
