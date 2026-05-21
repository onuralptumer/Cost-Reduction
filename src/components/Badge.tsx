import React from 'react';
import { cn } from '../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className, ...props }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  };

  return (
    <span 
      className={cn("px-2 py-0.5 rounded text-[10px] font-bold", variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};

export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Fikir Aşamasında': return 'default';
    case 'Hesaplama Bekliyor': return 'info';
    case 'Devam Ediyor': return 'warning';
    case 'Tamamlandı': return 'success';
    case 'İptal': return 'danger';
    case 'Başarısız': return 'danger';
    default: return 'default';
  }
};

export const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'Kritik': return 'danger';
    case 'Yüksek': return 'warning';
    case 'Orta': return 'info';
    case 'Düşük': return 'success';
    default: return 'default';
  }
};
