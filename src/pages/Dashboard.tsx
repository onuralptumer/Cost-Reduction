import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { BarChart3, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const { projects, financials, fields } = useAppContext();

  const categorizableFields = React.useMemo(() => {
    return fields.filter(f => f.type === 'select' || f.type === 'text');
  }, [fields]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const defaultStartDate = `${currentYear}-01`;
  const defaultEndDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [groupByField, setGroupByField] = useState('f_dept');

  const parseMonth = (dStr: string) => {
    if (!dStr) return null;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() * 12 + d.getMonth();
  };

  const periodMonths = React.useMemo(() => {
    const t1 = parseMonth(startDate);
    const t2 = parseMonth(endDate);
    if (t1 === null || t2 === null) return [];
    
    const list = [];
    for (let i = t1; i <= t2; i++) {
      list.push({
        year: Math.floor(i / 12),
        monthIdx: i % 12
      });
    }
    return list;
  }, [startDate, endDate]);

  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const financialStats = React.useMemo(() => {
    let totalCogs = 0;
    let totalTargetGain = 0; // COGS * target%
    
    periodMonths.forEach(p => {
      const record = financials.find(f => f.year === p.year && f.month === MONTHS[p.monthIdx]);
      if (record) {
        totalCogs += record.cogs;
        totalTargetGain += record.cogs * (record.targetPercent / 100);
      }
    });

    return { totalCogs, totalTargetGain };
  }, [financials, periodMonths]);

  // Sync groupByField if it's no longer in the fields list
  React.useEffect(() => {
    if (categorizableFields.length > 0 && !categorizableFields.find(f => f.id === groupByField)) {
      setGroupByField(categorizableFields[0].id);
    }
  }, [categorizableFields, groupByField]);

  const { pnlValueTotal, pnlPotentialTotal, periodProjectStats, projectsByGroup } = React.useMemo(() => {
    const t1 = parseMonth(startDate);
    const t2 = parseMonth(endDate);
    
    if (t1 === null || t2 === null) return { 
      pnlValueTotal: 0, 
      pnlPotentialTotal: 0, 
      periodProjectStats: { total: 0, completed: 0, inProgress: 0 },
      projectsByGroup: []
    };

    let actual = 0;
    let potential = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    
    const groupMap: Record<string, number> = {};

    projects.forEach(p => {
      const yearlySavings = Number(p.f_savings);
      if (isNaN(yearlySavings)) return;
      const monthlySavings = yearlySavings / 12;

      const pStart = p.f_start ? parseMonth(p.f_start as string) : null;
      const pEnd = p.f_end ? parseMonth(p.f_end as string) : null;
      const pReal = p.f_real ? parseMonth(p.f_real as string) : null;

      let projectActualGain = 0;

      // ACTUAL
      if (p.f_status === 'Tamamlandı' && pReal !== null) {
        if (pReal >= t1 && pReal <= t2) {
          completedCount++;
        }

        const g = pReal;
        const savingEnd = g + 11;
        const intersectionStart = Math.max(t1, g);
        const intersectionEnd = Math.min(t2, savingEnd);
        
        if (intersectionStart <= intersectionEnd) {
          const multiplier = (intersectionEnd - intersectionStart) + 1;
          projectActualGain = (monthlySavings * multiplier);
          actual += projectActualGain;
        }
      }

      // Add to group map for chart
      if (projectActualGain > 0) {
        const groupVal = p[groupByField] || 'Belirtilmemiş';
        groupMap[groupVal] = (groupMap[groupVal] || 0) + projectActualGain;
      }

      // POTENTIAL
      if (p.f_status === 'Tamamlandı' || p.f_status === 'Devam Ediyor') {
        if (p.f_status === 'Devam Ediyor') {
          if (pStart !== null && pEnd !== null && pStart <= t2 && pEnd >= t1) {
            inProgressCount++;
          }
        }
        const dateStr = (p.f_status === 'Tamamlandı' && p.f_real) ? p.f_real : p.f_end;
        const dMonth = parseMonth(dateStr as string);
        if (dMonth !== null) {
          const savingEnd = dMonth + 11;
          const intersectionStart = Math.max(t1, dMonth);
          const intersectionEnd = Math.min(t2, savingEnd);
          if (intersectionStart <= intersectionEnd) {
            const multiplier = (intersectionEnd - intersectionStart) + 1;
            potential += (monthlySavings * multiplier);
          }
        }
      }
    });

    const chartData = Object.entries(groupMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { 
      pnlValueTotal: actual, 
      pnlPotentialTotal: potential,
      periodProjectStats: {
        total: completedCount + inProgressCount,
        completed: completedCount,
        inProgress: inProgressCount
      },
      projectsByGroup: chartData
    };
  }, [projects, startDate, endDate, groupByField]);

  const financialStatsItems = [
    { 
      title: 'COGS (Dönem)', 
      value: `${(financialStats.totalCogs / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M USD`, 
      colorClass: 'text-slate-800' 
    },
    { 
      title: 'Hedef Kazanç', 
      value: `${(financialStats.totalTargetGain / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}k USD`, 
      colorClass: 'text-blue-600',
    },
    { 
      title: 'GERÇEKLEŞEN (P&L)', 
      value: `${(pnlValueTotal / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}k USD`, 
      colorClass: 'text-emerald-600',
      badgeClass: financialStats.totalTargetGain > 0 
        ? (pnlValueTotal >= financialStats.totalTargetGain ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50')
        : 'text-slate-600 bg-slate-50',
      pct: financialStats.totalTargetGain > 0 ? Math.round((pnlValueTotal / financialStats.totalTargetGain) * 100) : 0
    },
    { 
      title: 'POTANSİYEL (P&L)', 
      value: `${(pnlPotentialTotal / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}k USD`, 
      colorClass: 'text-indigo-600',
      badgeClass: financialStats.totalTargetGain > 0 
        ? (pnlPotentialTotal >= financialStats.totalTargetGain ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 bg-slate-50')
        : 'text-slate-600 bg-slate-50',
      pct: financialStats.totalTargetGain > 0 ? Math.round((pnlPotentialTotal / financialStats.totalTargetGain) * 100) : 0
    },
    { 
      title: 'Gap / Fırsat', 
      value: `${((financialStats.totalTargetGain - pnlValueTotal) / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}k USD`, 
      colorClass: pnlValueTotal >= financialStats.totalTargetGain ? 'text-emerald-600' : 'text-red-600' 
    },
  ];

  const projectStatsItems = [
    {
      title: 'Toplam Proje',
      value: periodProjectStats.total,
      colorClass: 'text-slate-800'
    },
    {
      title: 'Tamamlanan Proje',
      value: periodProjectStats.completed,
      colorClass: 'text-emerald-600'
    },
    {
      title: 'Devam Eden Proje',
      value: periodProjectStats.inProgress,
      colorClass: 'text-blue-600'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-800 mb-4">Dashboard</h1>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">Başlangıç:</label>
              <input 
                type="month" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-slate-300 bg-white rounded-md px-3 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">Bitiş:</label>
              <input 
                type="month" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-slate-300 bg-white rounded-md px-3 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 1: Financials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {financialStatsItems.map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{stat.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className={`text-2xl font-bold ${stat.colorClass}`}>{stat.value}</p>
                {stat.badgeClass && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${stat.badgeClass}`}>
                    {stat.pct}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Row 2: Projects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {projectStatsItems.map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{stat.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className={`text-2xl font-bold ${stat.colorClass}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[400px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" />
              Proje Kazanç Kırılımı (P&L)
            </h3>
            
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <Filter size={12} className="text-slate-400 ml-1" />
              <select 
                value={groupByField}
                onChange={(e) => setGroupByField(e.target.value)}
                className="text-xs bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer"
              >
                {categorizableFields.map(field => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            {projectsByGroup.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectsByGroup}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    hide 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 500, fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{payload[0].payload.name}</p>
                            <p className="text-sm font-bold text-indigo-600">{payload[0].value.toLocaleString('tr-TR')} USD</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                  >
                    {projectsByGroup.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">
                Seçilen dönemde gerçekleşen kazanç verisi bulunamadı.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" />
            Finansal Özet (Dönemlik)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-sm text-slate-500">Toplam COGS</span>
              <span className="text-sm font-bold text-slate-800">{financialStats.totalCogs.toLocaleString('tr-TR')} USD</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-sm text-slate-500">Hesaplanan Tasarruf Hedefi</span>
              <span className="text-sm font-bold text-blue-600">{financialStats.totalTargetGain.toLocaleString('tr-TR')} USD</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-sm text-slate-500">Gerçekleşen Tasarruf (P&L)</span>
              <span className="text-sm font-bold text-emerald-600">{pnlValueTotal.toLocaleString('tr-TR')} USD</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <span className="text-sm text-slate-500">Potansiyel Tasarruf (P&L)</span>
              <span className="text-sm font-bold text-indigo-600">{pnlPotentialTotal.toLocaleString('tr-TR')} USD</span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hedef Gerçekleşme Oranı</span>
                <span className={`text-sm font-bold ${pnlValueTotal >= financialStats.totalTargetGain ? 'text-emerald-600' : 'text-red-600'}`}>
                  %{financialStats.totalTargetGain > 0 ? ((pnlValueTotal / financialStats.totalTargetGain) * 100).toFixed(1) : 0}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${pnlValueTotal >= financialStats.totalTargetGain ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, financialStats.totalTargetGain > 0 ? (pnlValueTotal / financialStats.totalTargetGain) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center flex flex-col justify-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-slate-50 border border-slate-200 mx-auto mb-4 text-slate-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Gelişmiş Analitik</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2">
            Bölüm bazlı performans kırılımları ve trend analizleri yakında bu bölümde yer alacaktır.
          </p>
        </div>
      </div>
    </div>
  );
};
