import React, { useState } from 'react';
import { Download, FileJson, FileText, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const DataExport: React.FC = () => {
  const { projects, financials, fields } = useAppContext();
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [success, setSuccess] = useState(false);

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const exportProjects = () => {
    if (format === 'json') {
      const content = JSON.stringify(projects, null, 2);
      downloadFile(content, `projeler_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    } else {
      // CSV Export
      const headers = ['id', ...fields.map(f => f.name)];
      const rows = projects.map(p => {
        return [
          p.id,
          ...fields.map(f => {
            const val = p[f.id];
            if (val === undefined || val === null) return '';
            // Escape commas for CSV
            return `"${String(val).replace(/"/g, '""')}"`;
          })
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csvContent, `projeler_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  const exportFinancials = () => {
    if (format === 'json') {
      const content = JSON.stringify(financials, null, 2);
      downloadFile(content, `finansal_veriler_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    } else {
      // CSV Export
      const headers = ['Yıl', 'Ay', 'COGS', 'Yıllık Hedef Kazanç', 'Hedef %', 'Not'];
      const rows = financials.map(f => [
        f.year,
        f.month,
        f.cogs,
        f.annualTarget,
        f.targetPercent,
        `"${f.note.replace(/"/g, '""')}"`
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csvContent, `finansal_veriler_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Veri Dışa Aktar</h1>
        <p className="text-slate-500 text-sm">Sistemdeki projeleri ve finansal verileri istediğiniz formatta indirin.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">1. Format Seçin</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setFormat('json')}
              className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${
                format === 'json' 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                : 'border-slate-100 hover:border-slate-200 text-slate-500'
              }`}
            >
              <FileJson size={24} />
              <div className="text-left">
                <p className="font-bold">JSON</p>
                <p className="text-[10px] opacity-70">Programatik kullanım için</p>
              </div>
            </button>
            
            <button 
              onClick={() => setFormat('csv')}
              className={`flex items-center justify-center gap-3 p-4 border-2 rounded-xl transition-all ${
                format === 'csv' 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                : 'border-slate-100 hover:border-slate-200 text-slate-500'
              }`}
            >
              <FileText size={24} />
              <div className="text-left">
                <p className="font-bold">CSV / Excel</p>
                <p className="text-[10px] opacity-70">Tablo programları için</p>
              </div>
            </button>
          </div>
        </section>

        <section className="space-y-4 pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">2. Veri Setini Seçin</h2>
          <div className="flex flex-col gap-3">
            <button 
              onClick={exportProjects}
              className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">Proje Listesi</p>
                  <p className="text-xs text-slate-500">{projects.length} proje ve tüm özel alanlar</p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-600 group-hover:underline">İndir</span>
            </button>

            <button 
              onClick={exportFinancials}
              className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">Finansal Veriler</p>
                  <p className="text-xs text-slate-500">{financials.length} aylık kayıt ve kümülatif hedefler</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 group-hover:underline">İndir</span>
            </button>
          </div>
        </section>

        {success && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold">Veri başarıyla dışa aktarıldı!</span>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
        <div className="text-amber-500">
           <Download size={20} />
        </div>
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-bold">Bilgi</p>
          <p>Dışa aktarılan veriler sistemde o an yüklü olan (localStorage üzerindeki) verilerdir. CSV formatını Excel ile açarken bazen karakter kodlaması sorunu yaşamamak için UTF-8 formatını destekleyen uygulamalar kullanın.</p>
        </div>
      </div>
    </div>
  );
};
