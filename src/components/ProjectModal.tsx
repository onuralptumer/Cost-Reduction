import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Project } from '../types';
import { cn } from '../lib/utils';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, projectToEdit }) => {
  const { fields, addProject, updateProject } = useAppContext();
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setFormData({ ...projectToEdit });
      } else {
        setFormData({});
      }
    }
  }, [isOpen, projectToEdit]);

  if (!isOpen) return null;

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Custom validation
    if (formData['f_start']) {
      const startDate = new Date(formData['f_start']);
      if (formData['f_end']) {
        const endDate = new Date(formData['f_end']);
        if (endDate < startDate) {
          alert('Termin tarihi başlangıç tarihinden önce olamaz.');
          return;
        }
      }
      if (formData['f_real']) {
        const realDate = new Date(formData['f_real']);
        if (realDate < startDate) {
          alert('Gerçekleşme tarihi başlangıç tarihinden önce olamaz.');
          return;
        }
      }
    }

    if (projectToEdit) {
      updateProject(projectToEdit.id, formData);
    } else {
      addProject(formData as Omit<Project, 'id'>);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800">
            {projectToEdit ? 'Projeyi Düzenle' : 'Yeni Proje Ekle'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(field => {
                const isStatusTamamlandi = formData['f_status'] === 'Tamamlandı';
                const isRealDate = field.id === 'f_real';
                const isRequired = field.required || (isRealDate && isStatusTamamlandi);

                return (
                <div 
                  key={field.id} 
                  className={cn("flex flex-col space-y-1", field.type === 'textarea' && "md:col-span-2")}
                >
                  <label htmlFor={field.id} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {field.name} {isRequired && <span className="text-red-500">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      id={field.id}
                      required={isRequired}
                      value={formData[field.id] || ''}
                      onChange={e => handleChange(field.id, e.target.value)}
                      disabled={field.id === 'f_no'}
                      className="px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      id={field.id}
                      required={isRequired}
                      value={formData[field.id] || ''}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50"
                    />
                  )}

                  {field.type === 'date' && (
                    <input
                      type="date"
                      id={field.id}
                      required={isRequired}
                      value={formData[field.id] || ''}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50"
                      min={(field.id === 'f_end' || field.id === 'f_real') ? formData['f_start'] || undefined : undefined}
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      id={field.id}
                      required={isRequired}
                      value={formData[field.id] || ''}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-sm"
                    >
                      <option value="">Seçiniz...</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      id={field.id}
                      required={isRequired}
                      rows={3}
                      value={formData[field.id] || ''}
                      onChange={e => handleChange(field.id, e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 resize-y"
                    />
                  )}
                </div>
              )})}
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            İptal
          </button>
          <button
            type="submit"
            form="project-form"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1"
          >
            {projectToEdit ? 'Değişiklikleri Kaydet' : 'Projeyi Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
};
