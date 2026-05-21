import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Field, Project, FinancialRecord, DEFAULT_STATUS_OPTIONS, DEFAULT_PRIORITY_OPTIONS } from '../types';

interface AppContextType {
  fields: Field[];
  projects: Project[];
  financials: FinancialRecord[];
  addField: (field: Omit<Field, 'id'>) => void;
  updateField: (id: string, field: Partial<Field>) => void;
  deleteField: (id: string) => void;
  addProject: (project: Omit<Project, 'id'>, skipAutoNo?: boolean) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  upsertFinancial: (record: Omit<FinancialRecord, 'id'>) => void;
  deleteFinancial: (id: string) => void;
  reorderFields: (orderedFields: Field[]) => Promise<void>;
}

const defaultFields: Field[] = [
  { id: 'f_no', name: 'Proje No', type: 'text', required: true, showInTable: true, isSystem: true, orderIndex: -1 },
  { id: 'f_name', name: 'Proje Adı', type: 'text', required: true, showInTable: true, isSystem: true, orderIndex: 0 },
  { id: 'f_dept', name: 'Bölüm', type: 'text', required: true, showInTable: true, orderIndex: 1 },
  { id: 'f_champ', name: 'Proje Şampiyonu', type: 'text', required: false, showInTable: true, isSystem: true, orderIndex: 2 },
  { id: 'f_leader', name: 'Proje Lideri', type: 'text', required: false, showInTable: true, isSystem: true, orderIndex: 3 },
  { id: 'f_savings', name: 'Beklenen Kazanç', type: 'number', required: false, showInTable: true, isSystem: true, orderIndex: 4 },
  { id: 'f_start', name: 'Başlangıç Tarihi', type: 'date', required: false, showInTable: true, isSystem: true, orderIndex: 5 },
  { id: 'f_end', name: 'Termin Tarihi', type: 'date', required: false, showInTable: true, isSystem: true, orderIndex: 6 },
  { id: 'f_real', name: 'Gerçekleşme Tarihi', type: 'date', required: false, showInTable: false, isSystem: true, orderIndex: 7 },
  { id: 'f_status', name: 'Durum', type: 'select', required: true, showInTable: true, options: DEFAULT_STATUS_OPTIONS, isSystem: true, orderIndex: 8 },
  { id: 'f_priority', name: 'Öncelik', type: 'select', required: true, showInTable: true, options: DEFAULT_PRIORITY_OPTIONS, orderIndex: 9 },
  { id: 'f_desc', name: 'Açıklama', type: 'textarea', required: false, showInTable: false, isSystem: true, orderIndex: 10 },
  { id: 'f_notes', name: 'Aksiyon Notları', type: 'textarea', required: false, showInTable: false, isSystem: true, orderIndex: 11 },
];

const mockProjects: Project[] = [
  { id: uuidv4(), f_no: 'P2024-01', f_name: 'Enerji tüketimi azaltma projesi', f_dept: 'Üretim', f_champ: 'Ahmet Yılmaz', f_leader: 'Canan Kaya', f_savings: 150000, f_start: '2024-01-10', f_end: '2024-06-30', f_status: 'Devam Ediyor', f_priority: 'Yüksek', f_desc: 'Fabrika genelinde enerji verimliliğini artırma çalışmaları.' },
  { id: uuidv4(), f_no: 'P2024-02', f_name: 'Hurda oranı azaltma projesi', f_dept: 'Kalite', f_champ: 'Mehmet Öz', f_leader: 'Ayşe Demir', f_savings: 80000, f_start: '2024-02-01', f_end: '2024-08-15', f_status: 'Hesaplama Bekliyor', f_priority: 'Kritik', f_desc: 'Hat 3 üzerinde çıkan hurda oranını %2 seviyesine çekme hedefi.' },
  { id: uuidv4(), f_no: 'P2024-03', f_name: 'Kompresör verimlilik projesi', f_dept: 'Bakım', f_champ: 'Hakan Şahin', f_leader: 'Emre Çelik', f_savings: 45000, f_start: '2023-11-01', f_end: '2024-02-28', f_status: 'Tamamlandı', f_real: '2024-02-25', f_priority: 'Orta', f_desc: 'Yeni hava kompresörü geçişi ve kaçak tamiratı.' },
  { id: uuidv4(), f_no: 'P2024-04', f_name: 'Setup süresi azaltma projesi', f_dept: 'Üretim', f_champ: 'Ahmet Yılmaz', f_leader: 'Murat Arslan', f_savings: 120000, f_start: '2024-03-15', f_end: '2024-09-01', f_status: 'Fikir Aşamasında', f_priority: 'Yüksek', f_desc: 'SMED uygulaması ile pres hattı setup süresini yarıya indirme.' },
  { id: uuidv4(), f_no: 'P2024-05', f_name: 'Alternatif tedarikçi maliyet azaltma projesi', f_dept: 'Satın Alma', f_champ: 'Selin Yıldız', f_leader: 'Burak Koç', f_savings: 200000, f_start: '2024-01-05', f_end: '2024-12-31', f_status: 'Devam Ediyor', f_priority: 'Kritik', f_desc: 'A ve B sınıfı hammaddeler için alternatif tedarikçilerin devreye alınması.' },
];

const mockFinancials: FinancialRecord[] = [
  { id: uuidv4(), year: 2024, month: 'Ocak', cogs: 8500000, annualTarget: 1200000, targetPercent: 3.0, note: 'Finans verisi' },
  { id: uuidv4(), year: 2024, month: 'Şubat', cogs: 9200000, annualTarget: 1200000, targetPercent: 3.0, note: 'Güncellendi' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Fetch from SQLite
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fRes, pRes, finRes] = await Promise.all([
          fetch('/api/fields'),
          fetch('/api/projects'),
          fetch('/api/financials')
        ]);
        
        const fData = await fRes.json();
        const pData = await pRes.json();
        const finData = await finRes.json();

        // If DB is empty, initialize with defaults
        if (fData.length === 0 && pData.length === 0) {
          await Promise.all([
            ...defaultFields.map(f => fetch('/api/fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(f)
              })),
            ...mockProjects.map(p => fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(p)
              })),
            ...mockFinancials.map(fin => fetch('/api/financials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fin)
              }))
          ]);
          setFields(defaultFields);
          setProjects(mockProjects);
          setFinancials(mockFinancials);
        } else {
          setFields(fData);
          setProjects(pData);
          setFinancials(finData);
        }
      } catch (error) {
        console.error('Failed to fetch data from SQLite:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addField = async (field: Omit<Field, 'id' | 'orderIndex'>) => {
    const newField = { 
      ...field, 
      id: `f_${uuidv4()}`,
      orderIndex: fields.length > 0 ? Math.max(...fields.map(f => f.orderIndex)) + 1 : 0
    };
    setFields(prev => [...prev, newField]);
    await fetch('/api/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newField)
    });
  };

  const updateField = async (id: string, updated: Partial<Field>) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;
    const newField = { ...field, ...updated };
    setFields(prev => prev.map(f => f.id === id ? newField : f));
    await fetch('/api/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newField)
    });
  };

  const deleteField = async (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    await fetch(`/api/fields/${id}`, { method: 'DELETE' });
  };

  const addProject = async (project: Omit<Project, 'id'>, skipAutoNo?: boolean) => {
    const year = new Date().getFullYear();
    const prefix = `P${year}-`;
    
    // Find all project numbers for the current year
    const yearNumbers = projects
      .map(p => {
        const no = (p as any).f_no;
        if (no && typeof no === 'string' && no.startsWith(prefix)) {
          const numPart = parseInt(no.replace(prefix, ''));
          return isNaN(numPart) ? 0 : numPart;
        }
        return 0;
      });
    
    const nextNum = yearNumbers.length > 0 ? Math.max(...yearNumbers) + 1 : 1;
    const projectNo = `${prefix}${String(nextNum).padStart(2, '0')}`;

    const newProject = { 
      ...project, 
      id: uuidv4(),
      f_no: skipAutoNo ? ((project as any)['f_no'] || '') : ((project as any)['f_no'] || projectNo)
    };
    
    setProjects(prev => [...prev, newProject]);
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject)
    });
  };

  const updateProject = async (id: string, updated: Partial<Project>) => {
    const p = projects.find(p => p.id === id);
    if (!p) return;
    const newP = { ...p, ...updated };
    setProjects(prev => prev.map(item => item.id === id ? newP : item));
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newP)
    });
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  };

  const upsertFinancial = async (record: Omit<FinancialRecord, 'id'>) => {
    let newRecord: FinancialRecord;
    const existing = financials.find(r => r.year === record.year && r.month === record.month);
    
    if (existing) {
      newRecord = { ...record, id: existing.id };
      setFinancials(prev => prev.map(r => r.id === existing.id ? newRecord : r));
    } else {
      newRecord = { ...record, id: uuidv4() };
      setFinancials(prev => [...prev, newRecord]);
    }

    await fetch('/api/financials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord)
    });
  };

  const deleteFinancial = async (id: string) => {
    setFinancials(prev => prev.filter(r => r.id !== id));
    await fetch(`/api/financials/${id}`, { method: 'DELETE' });
  };

  const reorderFields = async (orderedFields: Field[]) => {
    const updatedFields = orderedFields.map((f, index) => ({ ...f, orderIndex: index }));
    setFields(updatedFields);
    
    // Batch update fields in background
    Promise.all(updatedFields.map(f => fetch('/api/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f)
    }))).catch(err => console.error('Failed to sync field order:', err));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Veriler SQLite'dan yükleniyor...</div>;
  }

  return (
    <AppContext.Provider value={{ 
      fields, projects, financials,
      addField, updateField, deleteField, 
      addProject, updateProject, deleteProject,
      upsertFinancial, deleteFinancial, reorderFields
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
