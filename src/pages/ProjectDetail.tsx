import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Clock, Tag } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Badge, getStatusBadgeVariant, getPriorityBadgeVariant } from '../components/Badge';
import { ProjectModal } from '../components/ProjectModal';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, fields } = useAppContext();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <h2 className="text-xl font-medium mb-4">Proje bulunamadı.</h2>
        <button onClick={() => navigate('/projects')} className="text-blue-600 hover:underline">Listeye Dön</button>
      </div>
    );
  }

  // Find standard important fields dynamically if possible, or fallback to first found logic
  const nameFieldId = fields.find(f => f.name === 'Proje Adı')?.id || '';
  const statusFieldId = fields.find(f => f.name === 'Durum')?.id || '';
  const priorityFieldId = fields.find(f => f.name === 'Öncelik')?.id || '';
  const descFieldId = fields.find(f => f.name === 'Açıklama')?.id || '';
  const notesFieldId = fields.find(f => f.name === 'Aksiyon Notları')?.id || '';

  const projectName = project[nameFieldId] || 'İsimsiz Proje';
  const status = project[statusFieldId];
  const priority = project[priorityFieldId];
  const desc = project[descFieldId];
  const notes = project[notesFieldId];

  // Other dynamic fields to show in grid
  const otherFields = fields.filter(f => 
    f.id !== nameFieldId && 
    f.id !== statusFieldId && 
    f.id !== priorityFieldId && 
    f.id !== descFieldId && 
    f.id !== notesFieldId
  );

  const formatValue = (val: any, type: string) => {
    if (!val) return '-';
    if (type === 'date') {
      try { return format(parseISO(val), 'dd MMMM yyyy', { locale: tr }); } 
      catch (e) { return val; }
    }
    if (type === 'number') return Number(val).toLocaleString('tr-TR');
    return val;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          <span>Geri Dön</span>
        </button>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm flex items-center space-x-2 transition-colors"
        >
          <Edit size={14} />
          <span>Düzenle</span>
        </button>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{projectName}</h1>
            <div className="flex items-center space-x-4 mt-3">
              {status && (
                <div className="flex items-center space-x-2">
                  <Clock size={14} className="text-slate-400" />
                  <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
                </div>
              )}
              {priority && (
                <div className="flex items-center space-x-2">
                  <Tag size={14} className="text-slate-400" />
                  <Badge variant={getPriorityBadgeVariant(priority)}>{priority}</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Details) */}
        <div className="lg:col-span-2 space-y-6">
          {(desc || fields.find(f => f.id === descFieldId)) && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3">Açıklama</h3>
              <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap text-sm">
                {desc || <span className="text-slate-400 italic">Açıklama girilmemiş.</span>}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4">Proje Detayları</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              {otherFields.map(f => (
                <div key={f.id} className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{f.name}</span>
                  <span className="text-sm text-slate-800 font-medium">{formatValue(project[f.id], f.type)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Notes) */}
        <div className="space-y-6">
           <div className="bg-slate-50 rounded-xl shadow-inner border border-slate-200 p-6 h-full flex flex-col">
            <h3 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-4">Aksiyon Notları / İlerleme</h3>
            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 shadow-sm text-sm text-slate-700 whitespace-pre-wrap overflow-y-auto">
               {notes || <span className="text-slate-400 italic text-xs">Henüz not eklenmemiş. Sağ üstten düzenle diyerek not ekleyebilirsiniz.</span>}
            </div>
          </div>
        </div>
      </div>

      <ProjectModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        projectToEdit={project} 
      />
    </div>
  );
};
