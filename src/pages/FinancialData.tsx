import React, { useState, useMemo } from 'react';
import { DollarSign, Save, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { FinancialRecord } from '../types';

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const FinancialData: React.FC = () => {
  const { projects, financials, upsertFinancial, deleteFinancial } = useAppContext();
  
  const dynamicYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let minYear = currentYear;
    
    // Finansal kayıtlardaki en eski yılı bul
    financials.forEach(f => {
      if (f.year < minYear) minYear = f.year;
    });

    // Projelerdeki tarih alanlarındaki en eski yılı bul
    projects.forEach(p => {
      const dates = [
        (p as Record<string, any>)['f_start'],
        (p as Record<string, any>)['f_end'],
        (p as Record<string, any>)['f_real']
      ];
      dates.forEach(d => {
        if (d) {
          try {
            const parsedYear = new Date(d).getFullYear();
            if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear < minYear) {
              minYear = parsedYear;
            }
          } catch (e) {
            // Hatalı tarihi yoksay
          }
        }
      });
    });

    const maxYear = currentYear + 10;
    const years = [];
    for (let y = minYear; y <= maxYear; y++) {
      years.push(y);
    }
    return years;
  }, [projects, financials]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<FinancialRecord, 'id'>>({
    year: selectedYear,
    month: MONTHS[0],
    cogs: 0,
    annualTarget: 0,
    targetPercent: 0,
    note: ''
  });

  const filteredFinancials = useMemo(() => {
    return financials
      .filter(f => f.year === selectedYear)
      .sort((a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
  }, [financials, selectedYear]);

  // Calculate Cumulative COGS
  const tableDataWithCumulative = useMemo(() => {
    let cumulative = 0;
    return filteredFinancials.map(item => {
      cumulative += item.cogs;
      return { ...item, cumulativeCogs: cumulative };
    });
  }, [filteredFinancials]);

  const handleEdit = (record: FinancialRecord) => {
    setIsEditing(record.id);
    setFormData({
      year: record.year,
      month: record.month,
      cogs: record.cogs,
      annualTarget: record.annualTarget,
      targetPercent: record.targetPercent,
      note: record.note
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    upsertFinancial({ ...formData, year: selectedYear });
    setIsEditing(null);
    // Reset form for next entry but keep targets if possible? 
    // Or just let user click "Ekle"
  };

  const startNewEntry = () => {
    setIsEditing('new');
    setFormData({
      year: selectedYear,
      month: MONTHS[0],
      cogs: 0,
      annualTarget: filteredFinancials.length > 0 ? filteredFinancials[filteredFinancials.length - 1].annualTarget : 0,
      targetPercent: filteredFinancials.length > 0 ? filteredFinancials[filteredFinancials.length - 1].targetPercent : 0,
      note: ''
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Finansal Veriler</h1>
          <p className="text-slate-500 text-sm">Aylık COGS ve hedef kazanç takibi.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {dynamicYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          
          <button 
            onClick={startNewEntry}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus size={16} />
            <span>Veri Ekle</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4 border-b border-slate-100">Yıl</th>
                <th className="px-6 py-4 border-b border-slate-100">Ay</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">COGS (USD)</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Kümülatif COGS</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Yıllık Hedef</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center">Hedef %</th>
                <th className="px-6 py-4 border-b border-slate-100">Not</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableDataWithCumulative.length === 0 && !isEditing && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                    Bu yıl için veri bulunmamaktadır. "Veri Ekle" butonunu kullanarak giriş yapabilirsiniz.
                  </td>
                </tr>
              )}
              
              {isEditing && (
                <tr className="bg-indigo-50/30">
                  <td className="px-6 py-3 font-medium text-slate-900">{selectedYear}</td>
                  <td className="px-6 py-3">
                    <select
                      value={formData.month}
                      onChange={e => setFormData({ ...formData, month: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                    >
                      {MONTHS.map(m => (
                        <option 
                          key={m} 
                          value={m}
                          disabled={filteredFinancials.some(f => f.month === m && f.id !== isEditing)}
                        >
                          {m}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={formData.cogs}
                      onChange={e => setFormData({ ...formData, cogs: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-right"
                      placeholder="COGS"
                    />
                  </td>
                  <td className="px-6 py-3 text-right text-slate-400 italic text-sm">
                    Kümülatif ...
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      value={formData.annualTarget}
                      onChange={e => setFormData({ ...formData, annualTarget: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-right"
                      placeholder="Hedef"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.targetPercent}
                      onChange={e => setFormData({ ...formData, targetPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-sm text-center"
                      placeholder="%"
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input
                      type="text"
                      value={formData.note}
                      onChange={e => setFormData({ ...formData, note: e.target.value })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                      placeholder="Not..."
                    />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={handleSave}
                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                        title="Kaydet"
                      >
                        <Save size={16} />
                      </button>
                      <button 
                        onClick={() => setIsEditing(null)}
                        className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                        title="İptal"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {tableDataWithCumulative.map((record) => (
                isEditing !== record.id && (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{record.year}</td>
                    <td className="px-6 py-4">{record.month}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs">{formatCurrency(record.cogs)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-indigo-600 font-semibold">{formatCurrency(record.cumulativeCogs)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs">{formatCurrency(record.annualTarget)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        %{record.targetPercent.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate">{record.note || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Düzenle"
                        >
                          <Save size={16} />
                        </button>
                        <button 
                          onClick={() => deleteFinancial(record.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <DollarSign size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Yıllık Toplam COGS</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(tableDataWithCumulative.length > 0 ? tableDataWithCumulative[tableDataWithCumulative.length - 1].cumulativeCogs : 0)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          {(() => {
            const lastRecord = tableDataWithCumulative[tableDataWithCumulative.length - 1];
            if (!lastRecord) return null;
            const targetAmount = lastRecord.annualTarget;
            return (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Yıllık Kazanç Hedefi</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">
                  {formatCurrency(targetAmount)}
                </div>
              </>
            );
          })()}
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-slate-400">
             <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
              <DollarSign size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500 font-mono italic">Excel Tarzı Giriş</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Bu bölümden girilen veriler Dashboard üzerindeki rasyoları besler.
          </p>
        </div>
      </div>
    </div>
  );
};
