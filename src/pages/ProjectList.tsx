import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Download, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
import { ProjectModal } from '../components/ProjectModal';
import { Badge, getStatusBadgeVariant, getPriorityBadgeVariant } from '../components/Badge';
import { Project } from '../types';
import { format, parseISO, differenceInDays, startOfDay, isBefore } from 'date-fns';
import { tr } from 'date-fns/locale';

export const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const { projects, fields, deleteProject, addProject } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{id: string, fieldId: string, value: string}[]>([]);
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'gecikti' | 'yaklasiyor'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[] | null>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const parsedData: any[] = [];
        
        for (const row of data as any[]) {
          const newProjectData: any = {};
          
          // Map columns to fields based on field name match
          fields.forEach(field => {
            // Find key in row that matches field name (case insensitive)
            const rowKey = Object.keys(row).find(key => 
              key.toLowerCase().trim() === field.name.toLowerCase().trim()
            );

            if (rowKey) {
              let val = row[rowKey];
              
              // Basic type handling
              if (field.type === 'number') {
                val = Number(val) || 0;
              } else if (field.type === 'date') {
                // xlsx might parse dates as numbers or strings
                if (typeof val === 'number') {
                  const date = XLSX.SSF.parse_date_code(val);
                  val = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
                } else if (val) {
                  try {
                    val = new Date(val).toISOString().split('T')[0];
                  } catch (e) {
                    val = String(val);
                  }
                }
              } else if (field.type === 'select') {
                // Check if value exists in options, else use first option or keep as is
                const option = field.options?.find(opt => 
                  opt.label.toLowerCase().trim() === String(val).toLowerCase().trim() || 
                  opt.value.toLowerCase().trim() === String(val).toLowerCase().trim()
                );
                val = option ? option.value : val;
              }
              
              newProjectData[field.id] = val;
            }
          });

          // Only add if we have some data
          if (Object.keys(newProjectData).length > 0) {
            parsedData.push(newProjectData);
          }
        }
        setImportPreviewData(parsedData);
      } catch (error) {
        console.error('Import error:', error);
        alert('Veri aktarımı sırasında bir hata oluştu.');
      } finally {
        setIsImporting(false);
        // Reset input
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    if (!importPreviewData) return;
    setIsImporting(true);
    try {
      for (const projectData of importPreviewData) {
        // Skip automatic project number assignment to use what's imported (or empty)
        await addProject(projectData, true);
      }
      setImportPreviewData(null);
      alert('Veriler başarıyla içe aktarıldı.');
    } catch (error) {
      console.error('Import error:', error);
      alert('Veri aktarımı sırasında bir hata oluştu.');
    } finally {
      setIsImporting(false);
    }
  };

  const tableFields = fields.filter(f => f.showInTable);

  const getRowStatus = (project: Project) => {
    const endDateStr = project['f_end'] as string;
    const status = project['f_status'] as string;
    
    if (status === 'Tamamlandı' || status === 'İptal' || status === 'Başarısız' || !endDateStr) return 'normal';
    
    try {
      const endDate = startOfDay(parseISO(endDateStr));
      const today = startOfDay(new Date());
      
      if (isBefore(endDate, today)) {
         return 'gecikti';
      }
      
      const daysLeft = differenceInDays(endDate, today);
      if (daysLeft >= 0 && daysLeft < 30) {
         return 'yaklasiyor';
      }
    } catch (e) {
      return 'normal';
    }
    return 'normal';
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Search logic across all string fields shown in table
      const matchesSearch = searchTerm === '' || tableFields.some(f => {
        const val = p[f.id];
        return val && String(val).toLowerCase().includes(searchTerm.toLowerCase());
      });

      // Advanced filters logic
      const matchesFilters = filters.every(filter => {
        if (!filter.fieldId || !filter.value) return true;
        const field = fields.find(f => f.id === filter.fieldId);
        const val = p[filter.fieldId];
        if (val === undefined || val === null) return false;

        if (field?.type === 'select') {
          return val === filter.value;
        } else {
          return String(val).toLowerCase().includes(filter.value.toLowerCase());
        }
      });

      // Deadline filter logic
      let matchesDeadline = true;
      if (deadlineFilter !== 'all') {
        matchesDeadline = getRowStatus(p) === deadlineFilter;
      }

      return matchesSearch && matchesFilters && matchesDeadline;
    });
  }, [projects, fields, searchTerm, filters, tableFields, deadlineFilter]);

  const handleEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // prevent row click
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProjectToDelete(id);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      setProjectToDelete(null);
    }
  };

  const addFilter = () => {
    setFilters([...filters, { id: uuidv4(), fieldId: fields[0]?.id || '', value: '' }]);
  };

  const updateFilter = (id: string, key: 'fieldId' | 'value', val: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const openNewModal = () => {
    setProjectToEdit(null);
    setIsModalOpen(true);
  };

  const formatCellValue = (val: any, type: string) => {
    if (!val) return '-';
    if (type === 'date') {
      try {
        return format(parseISO(val), 'dd MMM yyyy', { locale: tr });
      } catch (e) {
        return val;
      }
    }
    if (type === 'number') {
      return Number(val).toLocaleString('tr-TR');
    }
    return val;
  };

  const hasSavingsCol = tableFields.some(f => f.id === 'f_savings');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">Proje Listesi</h1>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            id="excel-import" 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleImport}
            disabled={isImporting}
          />
          <label 
            htmlFor="excel-import"
            className={`px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload size={14} />
            <span>{isImporting ? 'İşleniyor...' : 'İçe Aktar'}</span>
          </label>
          <Link 
            to="/export"
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-2"
          >
            <Download size={14} />
            <span>Dışa Aktar</span>
          </Link>
          <button 
            onClick={openNewModal}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm flex items-center space-x-2 transition-colors"
          >
            <Plus size={14} />
            <span>Yeni Proje Ekle</span>
          </button>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Projelerde ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <select
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value as 'all' | 'gecikti' | 'yaklasiyor')}
                className="w-full sm:w-auto px-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-600"
              >
                <option value="all">Tüm Termin Durumları</option>
                <option value="gecikti">Gecikenler</option>
                <option value="yaklasiyor">Termini Yaklaşanlar</option>
              </select>
            </div>
            
            <button 
              onClick={addFilter}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 flex items-center space-x-2 shrink-0"
            >
              <Plus size={14} />
              <span>Gelişmiş Filtre Ekle</span>
            </button>
          </div>

          {filters.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
              {filters.map(filter => {
                const fieldDoc = fields.find(f => f.id === filter.fieldId);
                return (
                  <div key={filter.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <select
                      value={filter.fieldId}
                      onChange={e => updateFilter(filter.id, 'fieldId', e.target.value)}
                      className="w-full sm:w-48 pl-2 pr-8 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    
                    {(fieldDoc?.type === 'select') ? (
                      <select
                        value={filter.value}
                        onChange={e => updateFilter(filter.id, 'value', e.target.value)}
                        className="w-full sm:w-48 pl-2 pr-8 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Seçiniz...</option>
                        {fieldDoc.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text"
                        value={filter.value}
                        onChange={e => updateFilter(filter.id, 'value', e.target.value)}
                        placeholder="Değer..."
                        className="w-full sm:w-48 px-2 py-1.5 border border-slate-200 rounded-md text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    )}
                    
                    <button 
                      onClick={() => removeFilter(filter.id)} 
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors self-end sm:self-auto"
                      title="Filtreyi Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {tableFields.map(f => (
                  <React.Fragment key={f.id}>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{f.name}</th>
                    {f.id === 'f_savings' && (
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Aylık Kazanç</th>
                    )}
                  </React.Fragment>
                ))}
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={tableFields.length + 1 + (hasSavingsCol ? 1 : 0)} className="px-4 py-8 text-center text-xs text-slate-500">
                    Proje bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredProjects.map(project => {
                  const rowStatus = getRowStatus(project);
                  let rowClassName = "cursor-pointer group transition-colors ";
                  if (rowStatus === 'gecikti') rowClassName += "bg-red-50 hover:bg-red-100";
                  else if (rowStatus === 'yaklasiyor') rowClassName += "bg-amber-50 hover:bg-amber-100";
                  else rowClassName += "bg-white hover:bg-slate-50";

                  return (
                  <tr 
                    key={project.id} 
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className={rowClassName}
                  >
                    {tableFields.map(f => {
                       const val = project[f.id];
                       return (
                         <React.Fragment key={f.id}>
                           <td className="px-4 py-3 text-xs text-slate-700 align-middle whitespace-nowrap">
                             {f.name === 'Durum' ? (
                                <Badge variant={getStatusBadgeVariant(val as string)}>{val || '-'}</Badge>
                             ) : f.name === 'Öncelik' ? (
                                <Badge variant={getPriorityBadgeVariant(val as string)}>{val || '-'}</Badge>
                             ) : f.id === 'f_name' || f.name === 'Proje Adı' ? (
                                <div className="flex items-center gap-2">
                                  <span>{formatCellValue(val, f.type)}</span>
                                  {rowStatus === 'gecikti' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Gecikti</span>}
                                  {rowStatus === 'yaklasiyor' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Termin Yaklaşıyor</span>}
                                </div>
                             ) : (
                                formatCellValue(val, f.type)
                             )}
                           </td>
                           {f.id === 'f_savings' && (
                             <td className="px-4 py-3 text-xs text-slate-700 align-middle whitespace-nowrap">
                               {val && !isNaN(Number(val)) ? formatCellValue(Number(val) / 12, 'number') : '-'}
                             </td>
                           )}
                         </React.Fragment>
                       );
                    })}
                    <td className="px-4 py-3 text-right align-middle">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleEdit(e, project)}
                          className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        >
                          Düzenle
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(e, project.id)}
                          className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projectToEdit={projectToEdit} 
      />

      {/* IMPORT PREVIEW Modal */}
      {importPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">İçe Aktarma Önizlemesi</h2>
              <p className="text-xs text-slate-500 mt-1">{importPreviewData.length} kayıt aktarılacak.</p>
            </div>
            
            <div className="p-5 overflow-auto flex-1">
              <table className="w-full text-left text-xs text-slate-700 whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 font-semibold">Proje Adı</th>
                    <th className="pb-2 font-semibold">Bölüm</th>
                    <th className="pb-2 font-semibold">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreviewData.slice(0, 10).map((p, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">{p['f_name'] || '-'}</td>
                      <td className="py-2">{p['f_dept'] || '-'}</td>
                      <td className="py-2">{p['f_status'] || '-'}</td>
                    </tr>
                  ))}
                  {importPreviewData.length > 10 && (
                    <tr>
                      <td colSpan={3} className="py-2 text-center text-slate-500 italic text-[10px]">
                        ...ve {importPreviewData.length - 10} kayıt daha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setImportPreviewData(null)} 
                className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                disabled={isImporting}
              >
                İptal
              </button>
              <button 
                type="button" 
                onClick={confirmImport}
                disabled={isImporting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[100px]"
              >
                {isImporting ? (
                   <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                   'Onayla'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Projeyi Sil</h2>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-slate-600">
                Bu projeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="p-5 pt-0 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setProjectToDelete(null)} 
                className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50"
              >
                İptal
              </button>
              <button 
                type="button" 
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 shadow-sm"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
