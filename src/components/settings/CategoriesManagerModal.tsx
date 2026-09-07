import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash,
  PencilSimple,
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import { AVAILABLE_ICONS, ICON_MAP, getCategoryIcon } from '../../constants/iconMap';
import type { CategoryType, Category } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PALETTE = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const CategoriesManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { categories, addCategory, updateCategory, deleteCategory, transactions } = useFinance();

  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [selectedColor, setSelectedColor] = useState('#10B981');
  const [isCreating, setIsCreating] = useState(false);

  // Estado para edición de categoría existente
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Tag');
  const [editColor, setEditColor] = useState('#10B981');
  const [error, setError] = useState<string | null>(null);

  // Calcular movimientos asociados para evitar eliminar categorías en uso
  const getCategoryUsageCount = (cat: Category) => {
    const catNameLower = (cat.name || '').toLowerCase().trim();
    return transactions.filter(
      (t) =>
        t.category_id === cat.id ||
        (t.category_name && t.category_name.toLowerCase().trim() === catNameLower)
    ).length;
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  // Evitar duplicados de iconos dentro del mismo tipo de categoría
  const usedIconNames = useMemo(
    () => new Set(filteredCategories.map((c) => c.icon_name)),
    [filteredCategories]
  );
  const availableIconsForTab = useMemo(
    () => AVAILABLE_ICONS.filter((icon) => !usedIconNames.has(icon)),
    [usedIconNames]
  );

  // Iconos disponibles al editar (incluye el icono actual de la categoría que se está editando)
  const availableIconsForEdit = useMemo(() => {
    if (!editingCategory) return [];
    return AVAILABLE_ICONS.filter(
      (icon) => icon === editingCategory.icon_name || !usedIconNames.has(icon)
    );
  }, [editingCategory, usedIconNames]);

  useEffect(() => {
    if (availableIconsForTab.length > 0 && usedIconNames.has(selectedIcon)) {
      setSelectedIcon(availableIconsForTab[0]);
    }
  }, [activeTab, categories, availableIconsForTab, usedIconNames, selectedIcon]);

  if (!isOpen) return null;

  const handleStartEdit = (cat: Category) => {
    setError(null);
    setIsCreating(false);
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon_name);
    setEditColor(cat.color);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setError(null);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editName.trim()) {
      setError('Por favor ingresa un nombre para la categoría.');
      return;
    }

    try {
      setError(null);
      await updateCategory(editingCategory.id, {
        name: editName.trim(),
        icon_name: editIcon,
        color: editColor,
      });
      setEditingCategory(null);
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar la categoría.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa un nombre para la categoría.');
      return;
    }

    if (usedIconNames.has(selectedIcon)) {
      setError('Este icono ya está en uso en otra categoría de este tipo. Elige uno diferente.');
      return;
    }

    try {
      setError(null);
      await addCategory({
        name: name.trim(),
        type: activeTab,
        icon_name: selectedIcon,
        color: selectedColor,
      });

      setName('');
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la categoría.');
    }
  };

  const handleDelete = async (cat: Category) => {
    const usageCount = getCategoryUsageCount(cat);
    if (usageCount > 0) {
      setError(
        `No se puede eliminar la categoría "${cat.name}" porque tiene ${usageCount} ${
          usageCount === 1 ? 'movimiento registrado' : 'movimientos registrados'
        }. Para proteger tu historial financiero, primero elimina o reasigna esos movimientos.`
      );
      return;
    }

    try {
      if (editingCategory?.id === cat.id) {
        setEditingCategory(null);
      }
      await deleteCategory(cat.id);
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la categoría.');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white/95 dark:bg-[#13141c]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/[0.1] rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Gestión de Categorías
              </h3>
              <p className="text-xs text-slate-500">
                Personaliza tus categorías con iconos SVG únicos para cada concepto
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs: Gastos vs Ingresos */}
          <div className="flex items-center gap-2 mt-4 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04]">
            <button
              onClick={() => {
                setActiveTab('expense');
                setError(null);
                setEditingCategory(null);
                setIsCreating(false);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Categorías de Gasto ({categories.filter((c) => c.type === 'expense').length})
            </button>
            <button
              onClick={() => {
                setActiveTab('income');
                setError(null);
                setEditingCategory(null);
                setIsCreating(false);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Categorías de Ingreso ({categories.filter((c) => c.type === 'income').length})
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Formulario de EDICIÓN de categoría existente */}
            {editingCategory ? (
              <form onSubmit={handleUpdateCategory} className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300/80 dark:border-emerald-500/30 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PencilSimple size={16} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Editar Categoría ({activeTab === 'expense' ? 'Gasto' : 'Ingreso'})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    NOMBRE DE LA CATEGORÍA
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre de la categoría"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={30}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-black/40 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Selector de Iconos SVG para Edición */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500">
                      ICONO SVG PHOSPHOR
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {availableIconsForEdit.length} disponibles
                    </span>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-28 overflow-y-auto p-1.5 bg-white dark:bg-black/40 rounded-xl border border-slate-200 dark:border-white/[0.08]">
                    {availableIconsForEdit.map((iconName) => {
                      const IconComp = ICON_MAP[iconName];
                      const isSel = editIcon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditIcon(iconName)}
                          className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSel
                              ? 'bg-emerald-600 text-white shadow-md scale-105 ring-2 ring-emerald-400'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
                          }`}
                          title={iconName}
                        >
                          <IconComp size={18} weight={isSel ? 'bold' : 'regular'} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Paleta de Colores para Edición */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    COLOR DE IDENTIFICACIÓN
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                          editColor === c ? 'ring-2 ring-emerald-500 scale-125 shadow-md' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            ) : isCreating ? (
              /* Formulario de nueva categoría */
              <form onSubmit={handleCreateCategory} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                    Nueva Categoría de {activeTab === 'expense' ? 'Gasto' : 'Ingreso'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    NOMBRE DE LA CATEGORÍA
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Gimnasio, Mascotas, etc."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={30}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-black/20 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Selector de Iconos SVG Disponibles (Sin Repetir) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500">
                      ICONO SVG PHOSPHOR (DISPONIBLES NO REPETIDOS)
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {availableIconsForTab.length} disponibles
                    </span>
                  </div>

                  {availableIconsForTab.length === 0 ? (
                    <p className="text-xs text-amber-600 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                      Has utilizado todos los iconos del catálogo para este tipo de categoría.
                    </p>
                  ) : (
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-28 overflow-y-auto p-1.5 bg-white dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/[0.08]">
                      {availableIconsForTab.map((iconName) => {
                        const IconComp = ICON_MAP[iconName];
                        const isSel = selectedIcon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setSelectedIcon(iconName)}
                            className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                              isSel
                                ? 'bg-emerald-600 text-white shadow-md scale-105'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
                            }`}
                            title={iconName}
                          >
                            <IconComp size={18} weight={isSel ? 'bold' : 'regular'} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Paleta de Colores */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                    COLOR DE IDENTIFICACIÓN
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          selectedColor === c ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={availableIconsForTab.length === 0}
                  className="btn-unified w-full py-2.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black shadow-md shadow-black/10 dark:shadow-black/30 transition-all disabled:opacity-50"
                >
                  Guardar Categoría
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setIsCreating(true);
                  setEditingCategory(null);
                }}
                className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/[0.15] hover:border-zinc-950 dark:hover:border-white text-slate-600 dark:text-slate-300 hover:text-zinc-950 dark:hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={16} weight="bold" />
                Agregar Nueva Categoría
              </button>
            )}

            {/* Listado de Categorías Actuales */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Categorías Existentes ({filteredCategories.length})
              </span>

              {filteredCategories.map((cat) => {
                const IconComp = getCategoryIcon(cat.icon_name);
                const isBeingEdited = editingCategory?.id === cat.id;
                const usageCount = getCategoryUsageCount(cat);
                const isProtected = usageCount > 0;

                return (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isBeingEdited
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconComp size={16} weight="bold" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {cat.name}
                        </span>
                        {isProtected ? (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                            En uso ({usageCount} {usageCount === 1 ? 'movimiento' : 'movimientos'})
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 block">
                            Sin movimientos asociados
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isBeingEdited
                            ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                        title="Editar categoría (nombre, color, icono)"
                      >
                        <PencilSimple size={16} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isProtected
                            ? 'text-slate-300 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                        }`}
                        title={
                          isProtected
                            ? `Protegida: no se puede eliminar porque tiene ${usageCount} ${
                                usageCount === 1 ? 'movimiento asociado' : 'movimientos asociados'
                              }`
                            : 'Eliminar categoría'
                        }
                      >
                        <Trash size={16} weight={isProtected ? 'regular' : 'bold'} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
