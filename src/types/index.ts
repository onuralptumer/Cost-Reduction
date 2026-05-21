export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';

export interface SelectOption {
  value: string;
  label: string;
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  showInTable: boolean;
  orderIndex: number;
  options?: SelectOption[]; // For 'select' type
  isSystem?: boolean; // Protect default fields from being deleted
}

export interface Project {
  id: string;
  [fieldId: string]: any; // Dynamic fields
}

export interface FinancialRecord {
  id: string;
  year: number;
  month: string;
  cogs: number;
  annualTarget: number;
  targetPercent: number;
  note: string;
}

export const DEFAULT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Tamamlandı', label: 'Tamamlandı' },
  { value: 'Devam Ediyor', label: 'Devam Ediyor' },
  { value: 'İptal', label: 'İptal' },
  { value: 'Fikir Aşamasında', label: 'Fikir Aşamasında' },
  { value: 'Hesaplama Bekliyor', label: 'Hesaplama Bekliyor' },
  { value: 'Başarısız', label: 'Başarısız' },
];

export const DEFAULT_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'Düşük', label: 'Düşük' },
  { value: 'Orta', label: 'Orta' },
  { value: 'Yüksek', label: 'Yüksek' },
  { value: 'Kritik', label: 'Kritik' },
];
