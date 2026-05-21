import React, { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Field, FieldType, SelectOption } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableFieldItemProps {
  field: Field;
  openEditModal: (field: Field) => void;
  handleDeleteClick: (field: Field) => void;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({ field, openEditModal, handleDeleteClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  return (
    <li 
      ref={setNodeRef} 
      style={style}
      className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${isDragging ? 'bg-indigo-50 shadow-md ring-1 ring-indigo-200 z-10' : 'bg-white hover:bg-slate-50'}`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div 
          {...attributes} 
          {...listeners}
          className="p-2 cursor-grab active:cursor-grabbing hover:bg-slate-200 rounded transition-colors"
          title="Sürükle ve Bırak"
        >
          <GripVertical size={20} className="text-slate-400" />
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-semibold text-slate-800">{field.name}</h3>
            {field.isSystem && (
               <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">
                  <span>Sistem</span>
               </span>
            )}
            {field.required && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 uppercase tracking-wider">Zorunlu</span>
            )}
            {field.showInTable && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">Tabloda</span>
            )}
          </div>
          <div className="mt-1 flex items-center space-x-4 text-xs text-slate-500">
            <span>Tip: <strong className="font-medium text-slate-700">{field.type}</strong></span>
            {field.type === 'select' && field.options && (
               <span>Seçenek Sayısı: <strong className="font-medium text-slate-700">{field.options.length}</strong></span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={() => openEditModal(field)}
          className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100 bg-white hover:bg-indigo-50"
          title="Düzenle"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => handleDeleteClick(field)}
          disabled={field.isSystem}
          className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-red-100 bg-white hover:bg-red-50"
          title="Sil"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
};

export const FieldManagement: React.FC = () => {
  const { fields, addField, updateField, deleteField, reorderFields } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<Field | null>(null);

  const [formData, setFormData] = useState<Omit<Field, 'id' | 'isSystem' | 'orderIndex'>>({
    name: '',
    type: 'text',
    required: false,
    showInTable: true,
  });

  const [optionsStr, setOptionsStr] = useState(''); // Comma separated for simplicity

  const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over.id);
      
      const newOrderedFields = arrayMove(fields, oldIndex, newIndex);
      reorderFields(newOrderedFields);
    }
  };

  const openNewModal = () => {
    setFieldToEdit(null);
    setFormData({ name: '', type: 'text', required: false, showInTable: true });
    setOptionsStr('');
    setIsModalOpen(true);
  };

  const openEditModal = (field: Field) => {
    setFieldToEdit(field);
    setFormData({
      name: field.name,
      type: field.type,
      required: field.required,
      showInTable: field.showInTable,
    });
    setOptionsStr(field.options ? field.options.map(o => o.value).join(', ') : '');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (field: Field) => {
    if (field.isSystem) {
      return;
    }
    setFieldToDelete(field);
  };

  const confirmDelete = () => {
    if (fieldToDelete) {
      deleteField(fieldToDelete.id);
      setFieldToDelete(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let options: SelectOption[] | undefined = undefined;
    if (formData.type === 'select' && optionsStr) {
       options = optionsStr.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ value: s, label: s }));
    }

    if (fieldToEdit) {
       updateField(fieldToEdit.id, { ...formData, options });
    } else {
       addField({ ...formData, options });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">Alan Yönetimi</h1>
        </div>
        <button 
          onClick={openNewModal}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm flex items-center space-x-2 transition-colors"
        >
          <Plus size={14} />
          <span>Yeni Alan Ekle</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={fields.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-slate-100">
              {fields.map((field) => (
                <SortableFieldItem 
                  key={field.id} 
                  field={field} 
                  openEditModal={openEditModal} 
                  handleDeleteClick={handleDeleteClick} 
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{fieldToEdit ? 'Alanı Düzenle' : 'Yeni Alan Ekle'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Alan Adı *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 outline-none disabled:bg-slate-100 disabled:opacity-70"
                  disabled={fieldToEdit?.isSystem}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Alan Tipi *</label>
                <select 
                  required 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as FieldType})} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 outline-none"
                  disabled={fieldToEdit?.isSystem}
                >
                  <option value="text">Kısa Metin</option>
                  <option value="textarea">Uzun Metin</option>
                  <option value="number">Sayı</option>
                  <option value="date">Tarih</option>
                  <option value="select">Seçim Listesi</option>
                </select>
              </div>

              {formData.type === 'select' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Seçenekler (Virgülle ayırın)</label>
                  <input 
                    type="text" 
                    value={optionsStr} 
                    onChange={e => setOptionsStr(e.target.value)} 
                    disabled={fieldToEdit?.id === 'f_status'}
                    placeholder="Örn: Seçenek 1, Seçenek 2, Seçenek 3"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50 outline-none disabled:bg-slate-100 disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                  {fieldToEdit?.id === 'f_status' ? (
                    <p className="text-[10px] text-orange-500 mt-1 uppercase font-bold tracking-wider">Durum alanının seçenekleri değiştirilemez.</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Varolan projelerdeki değerler otomatik güncellenmez.</p>
                  )}
                </div>
              )}

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.required} 
                    onChange={e => setFormData({...formData, required: e.target.checked})} 
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Zorunlu Alan</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.showInTable} 
                    onChange={e => setFormData({...formData, showInTable: e.target.checked})} 
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Tabloda Göster</span>
                </label>
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50">İptal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE Modal */}
      {fieldToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Alanı Sil</h2>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-slate-600">
                <strong className="font-semibold text-slate-800">"{fieldToDelete.name}"</strong> alanını silmek istediğinize emin misiniz? 
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Bu işlem projelerdeki verileri etkilemez, ancak formda ve tabloda gizler.
              </p>
            </div>

            <div className="p-5 pt-0 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setFieldToDelete(null)} 
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
