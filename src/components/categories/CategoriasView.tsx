import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stamp,
  Plus,
  PencilSimple,
  Trash,
  X,
  Check,
  Tag,
  TrendDown,
  TrendUp,
  WarningCircle,
  Palette,
  MagnifyingGlass,
  Receipt,
  CreditCard,
  Money,
  PiggyBank,
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import { AVAILABLE_ICONS, ICON_MAP, getCategoryIcon } from '../../constants/iconMap';
import { parseLocalDateParts } from '../../utils/date';
import type { Category, CategoryType } from '../../types';

const MAX_CATEGORIES_PER_TYPE = 15;

// Paleta ampliada con colores vivos, llamativos y contrastantes
const COLOR_PALETTE = [
  '#2563EB', // Azul Eléctrico
  '#0284C7', // Azul Cielo Intenso
  '#06B6D4', // Cyan Vibrante
  '#0D9488', // Teal Intenso
  '#10B981', // Esmeralda Vivo
  '#059669', // Verde Intenso
  '#84CC16', // Lima Eléctrico
  '#EAB308', // Amarillo Brillante
  '#F59E0B', // Ámbar Solar
  '#F97316', // Naranja Neón
  '#EA580C', // Naranja Fuego
  '#EF4444', // Rojo Escarlata
  '#F43F5E', // Rosa Neón / Coral
  '#EC4899', // Magenta Vibrante
  '#D946EF', // Fucsia Intenso
  '#8B5CF6', // Violeta Neón
  '#6366F1', // Índigo Eléctrico
  '#4F46E5', // Azul Profundo
  '#14B8A6', // Turquesa
  '#00D26A', // Verde Neón
  '#FF5722', // Coral Punch
  '#9333EA', // Púrpura Real
  '#64748B', // Pizarra
  '#334155', // Carbón
];

// Utilidades para conversiones HSL <-> HEX para el selector in-app
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { h: 210, s: 90, l: 55 };
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const CategoriasView: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, transactions, wallets } = useFinance();

  // Estados para modal de creación / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CategoryType>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('Tag');
  const [formColor, setFormColor] = useState('#2563EB');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para el selector de color personalizado 100% In-App
  const [customHue, setCustomHue] = useState(25);
  const [customLightness, setCustomLightness] = useState(55);
  const [customSaturation, setCustomSaturation] = useState(95);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [hexInputText, setHexInputText] = useState('#2563EB');

  const handleSelectPresetColor = (c: string) => {
    setFormColor(c);
    setHexInputText(c.toUpperCase());
    const { h, s, l } = hexToHsl(c);
    setCustomHue(h);
    setCustomSaturation(s);
    setCustomLightness(l);
  };

  const handleHueChange = (newHue: number) => {
    setCustomHue(newHue);
    const newHex = hslToHex(newHue, customSaturation, customLightness);
    setFormColor(newHex);
    setHexInputText(newHex);
  };

  const handleLightnessChange = (newL: number) => {
    setCustomLightness(newL);
    const newHex = hslToHex(customHue, customSaturation, newL);
    setFormColor(newHex);
    setHexInputText(newHex);
  };

  const handleHexInputChange = (val: string) => {
    setHexInputText(val);
    const cleaned = val.startsWith('#') ? val : `#${val}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      setFormColor(cleaned.toUpperCase());
      const { h, s, l } = hexToHsl(cleaned);
      setCustomHue(h);
      setCustomSaturation(s);
      setCustomLightness(l);
    }
  };

  const handleTonePreset = (s: number, l: number) => {
    setCustomSaturation(s);
    setCustomLightness(l);
    const newHex = hslToHex(customHue, s, l);
    setFormColor(newHex);
    setHexInputText(newHex);
  };

  // Estados para ver movimientos de una categoría al hacer clic
  const [selectedCategoryForMovements, setSelectedCategoryForMovements] = useState<Category | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');

  // Estados para Drag & Drop y Tacho de Basura
  const [isDraggingAnyStamp, setIsDraggingAnyStamp] = useState(false);
  const isDraggingRef = useRef(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const trashRef = useRef<HTMLDivElement | null>(null);

  // Estados para congelar el sello en el tacho y animación de eliminación / retorno
  const [pendingDeleteCat, setPendingDeleteCat] = useState<{
    cat: Category;
    x: number;
    y: number;
  } | null>(null);
  const [isSuckingIntoTrash, setIsSuckingIntoTrash] = useState(false);
  const [isReturningToGrid, setIsReturningToGrid] = useState(false);

  // Modal de confirmación de eliminación por arrastre
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);

  // Detección de dispositivo móvil / táctil para evitar arrastres accidentales al hacer scroll
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024);
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modal de Alerta con estilo propio (reemplazo de alert nativo)
  const [actionAlert, setActionAlert] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Filtros mitad - mitad
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );

  // Contar movimientos por categoría
  const getUsageCount = (cat: Category) => {
    const catNameLower = (cat.name || '').toLowerCase().trim();
    return transactions.filter(
      (t) =>
        t.category_id === cat.id ||
        (t.category_name && t.category_name.toLowerCase().trim() === catNameLower)
    ).length;
  };

  // Iconos disponibles según tipo y categoría en edición
  const usedIconsForModal = useMemo(() => {
    const list = modalType === 'expense' ? expenseCategories : incomeCategories;
    return new Set(
      list
        .filter((c) => !editingCategory || c.id !== editingCategory.id)
        .map((c) => c.icon_name)
    );
  }, [modalType, expenseCategories, incomeCategories, editingCategory]);

  const availableIcons = useMemo(() => {
    return AVAILABLE_ICONS.filter((icon) => !usedIconsForModal.has(icon));
  }, [usedIconsForModal]);

  const openCreateModal = (type: CategoryType) => {
    const currentList = type === 'expense' ? expenseCategories : incomeCategories;
    if (currentList.length >= MAX_CATEGORIES_PER_TYPE) {
      setActionAlert({
        title: 'Límite de categorías alcanzado',
        message: `Has alcanzado el límite máximo de ${MAX_CATEGORIES_PER_TYPE} categorías para ${type === 'expense' ? 'gastos' : 'ingresos'}. Para crear una nueva, elimina una existente.`,
      });
      return;
    }

    setEditingCategory(null);
    setModalType(type);
    setFormName('');
    const initialColor = type === 'expense' ? '#2563EB' : '#10B981';
    setFormColor(initialColor);
    setHexInputText(initialColor);
    const hsl = hexToHsl(initialColor);
    setCustomHue(hsl.h);
    setCustomSaturation(hsl.s);
    setCustomLightness(hsl.l);
    setShowCustomPicker(false);
    setFormError(null);

    const used = new Set(currentList.map((c) => c.icon_name));
    const firstAvailable = AVAILABLE_ICONS.find((icon) => !used.has(icon)) || 'Tag';
    setFormIcon(firstAvailable);

    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setModalType(cat.type);
    setFormName(cat.name);
    setFormColor(cat.color);
    setHexInputText(cat.color.toUpperCase());
    const hsl = hexToHsl(cat.color);
    setCustomHue(hsl.h);
    setCustomSaturation(hsl.s);
    setCustomLightness(hsl.l);
    setShowCustomPicker(false);
    setFormIcon(cat.icon_name);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('El nombre de la estampilla no puede estar vacío.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formName.trim(),
          color: formColor,
          icon_name: formIcon,
        });
      } else {
        await addCategory({
          name: formName.trim(),
          type: modalType,
          color: formColor,
          icon_name: formIcon,
          is_system: false,
        });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la categoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejo de drag and drop hacia el tacho de basura
  const handleDragStart = (_cat: Category) => {
    isDraggingRef.current = true;
    setIsDraggingAnyStamp(true);
  };

  const handleDrag = (_: any, info: any) => {
    if (trashRef.current) {
      const rect = trashRef.current.getBoundingClientRect();
      const pointX = info.point.x;
      const pointY = info.point.y;

      const isInside =
        pointX >= rect.left - 25 &&
        pointX <= rect.right + 25 &&
        pointY >= rect.top - 25 &&
        pointY <= rect.bottom + 25;

      setIsOverTrash(isInside);
    }
  };

  const handleDragEnd = (_: any, info: any, cat: Category) => {
    setIsDraggingAnyStamp(false);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);

    let droppedInTrash = false;
    if (trashRef.current) {
      const rect = trashRef.current.getBoundingClientRect();
      const pointX = info.point.x;
      const pointY = info.point.y;

      droppedInTrash =
        pointX >= rect.left - 30 &&
        pointX <= rect.right + 30 &&
        pointY >= rect.top - 30 &&
        pointY <= rect.bottom + 30;
    }

    setIsOverTrash(false);

    if (droppedInTrash) {
      const usage = getUsageCount(cat);
      if (usage > 0) {
        setActionAlert({
          title: 'No se puede eliminar esta estampilla',
          message: `La categoría "${cat.name}" tiene ${usage} movimiento(s) registrado(s). Para eliminarla de tu álbum, primero debes reasignar o borrar sus movimientos asociados.`,
        });
        return;
      }
      if (cat.is_system) {
        setActionAlert({
          title: 'Categoría protegida del sistema',
          message: `La categoría "${cat.name}" es una categoría predeterminada del sistema y no puede ser eliminada.`,
        });
        return;
      }

      // Congelar el sello directamente encima del tacho de basura
      const trashRect = trashRef.current?.getBoundingClientRect();
      const targetX = trashRect ? trashRect.left + trashRect.width / 2 : window.innerWidth / 2;
      const targetY = trashRect ? trashRect.top - 25 : window.innerHeight - 100;

      setPendingDeleteCat({
        cat,
        x: targetX,
        y: targetY,
      });
      setConfirmDeleteCat(cat);
    }
  };

  // Clic en estampilla para ver todos sus movimientos
  const handleStampClick = (cat: Category) => {
    if (isDraggingRef.current || pendingDeleteCat) return;
    setSelectedCategoryForMovements(cat);
    setCatSearchQuery('');
  };

  // Movimientos filtrados de la categoría seleccionada
  const categoryTransactions = useMemo(() => {
    if (!selectedCategoryForMovements) return [];
    const catNameLower = (selectedCategoryForMovements.name || '').toLowerCase().trim();
    const list = transactions.filter(
      (t) =>
        t.category_id === selectedCategoryForMovements.id ||
        (t.category_name && t.category_name.toLowerCase().trim() === catNameLower)
    );

    if (!catSearchQuery.trim()) {
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const q = catSearchQuery.toLowerCase().trim();
    return list
      .filter((t) => (t.concept && t.concept.toLowerCase().includes(q)) || (t.notes && t.notes.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCategoryForMovements, transactions, catSearchQuery]);

  // Total acumulado de la categoría
  const totalCategorySum = useMemo(() => {
    if (!selectedCategoryForMovements) return 0;
    const catNameLower = (selectedCategoryForMovements.name || '').toLowerCase().trim();
    const list = transactions.filter(
      (t) =>
        t.category_id === selectedCategoryForMovements.id ||
        (t.category_name && t.category_name.toLowerCase().trim() === catNameLower)
    );
    return list.reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);
  }, [selectedCategoryForMovements, transactions]);

  const handleConfirmDelete = () => {
    setIsSuckingIntoTrash(true);
  };

  const handleCancelDelete = () => {
    setIsReturningToGrid(true);
  };

  const executeDeleteCat = async () => {
    if (!confirmDeleteCat) return;
    try {
      await deleteCategory(confirmDeleteCat.id);
    } catch (err: any) {
      setActionAlert({
        title: 'Error al eliminar',
        message: err.message || 'Ocurrió un error inesperado al intentar eliminar la categoría.',
      });
    } finally {
      setConfirmDeleteCat(null);
      setPendingDeleteCat(null);
      setIsSuckingIntoTrash(false);
      setIsReturningToGrid(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-20 select-none relative">
      {/* CABECERA MINIMALISTA (SIN "Álbum de Categorías & Sellos") */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-md shrink-0">
            <Stamp size={22} weight="bold" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Categorías ({categories.length})
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-500 font-bold">
              Máx. {MAX_CATEGORIES_PER_TYPE} por tipo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-black">
            <TrendDown size={14} weight="bold" />
            <span>{expenseCategories.length}/{MAX_CATEGORIES_PER_TYPE} Gastos</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black">
            <TrendUp size={14} weight="bold" />
            <span>{incomeCategories.length}/{MAX_CATEGORIES_PER_TYPE} Ingresos</span>
          </div>
        </div>
      </div>

      {/* VISTA MITAD - MITAD: GASTOS (IZQUIERDA) E INGRESOS (DERECHA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ================= MITAD IZQUIERDA: GASTOS ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <TrendDown size={14} weight="bold" />
              </div>
              <h2 className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Estampillas de Gasto ({expenseCategories.length}/{MAX_CATEGORIES_PER_TYPE})
              </h2>
            </div>

            <button
              type="button"
              disabled={expenseCategories.length >= MAX_CATEGORIES_PER_TYPE}
              onClick={() => openCreateModal('expense')}
              className="px-3 py-1 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black flex items-center gap-1 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={13} weight="bold" />
              <span>{expenseCategories.length >= MAX_CATEGORIES_PER_TYPE ? 'Límite (15)' : 'Nuevo'}</span>
            </button>
          </div>

          {/* Cuadrícula de 5 columnas exactas */}
          <div className="p-3 sm:p-4 rounded-3xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-inner min-h-[380px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {expenseCategories.map((cat) => {
                const IconComponent = getCategoryIcon(cat.icon_name);
                const usage = getUsageCount(cat);

                return (
                  <motion.div
                    key={cat.id}
                    drag={!isMobile}
                    dragSnapToOrigin={true}
                    dragMomentum={false}
                    dragElastic={0}
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
                    onDragStart={() => handleDragStart(cat)}
                    onDrag={handleDrag}
                    onDragEnd={(e, info) => handleDragEnd(e, info, cat)}
                    onClick={() => handleStampClick(cat)}
                    whileHover={!isMobile ? { scale: 1.04, y: -2 } : { scale: 1.01 }}
                    whileDrag={{
                      scale: 1.1,
                      zIndex: 99999,
                      boxShadow: '0 20px 35px -8px rgba(0,0,0,0.4)',
                      cursor: 'grabbing',
                    }}
                    className={`relative group rounded-3xl p-3 border-2 border-dashed shadow-xs hover:shadow-md flex flex-col items-center justify-between text-center min-h-[140px] select-none ${
                      isMobile ? 'cursor-pointer touch-pan-y' : 'cursor-grab active:cursor-grabbing'
                    }`}
                    style={{
                      // Color de la categoría completo y más llamativo/fuerte
                      backgroundColor: `${cat.color}26`,
                      borderColor: `${cat.color}75`,
                      opacity: pendingDeleteCat?.cat.id === cat.id ? 0 : 1,
                      touchAction: isMobile ? 'pan-y' : 'none',
                    }}
                  >
                    {/* Arriba a la derecha: Cantidad de movimientos y abreviación 'mov.' */}
                    <div className="w-full flex flex-col items-end pb-1 border-b border-black/[0.08] dark:border-white/[0.08]">
                      <span className="text-[11px] font-mono font-black text-slate-700 dark:text-zinc-200">
                        {usage} mov.
                      </span>
                    </div>

                    {/* Centro: Contenedor con el icono grande y color más vivo */}
                    <div
                      className="my-2 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs"
                      style={{
                        backgroundColor: `${cat.color}35`,
                        color: cat.color,
                      }}
                    >
                      <IconComponent size={26} weight="duotone" />
                    </div>

                    {/* Texto debajo del icono */}
                    <div className="w-full mt-auto">
                      <span className="text-xs font-black text-slate-900 dark:text-white block truncate leading-tight">
                        {cat.name}
                      </span>
                    </div>

                    {/* Botón flotante para editar con un clic */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(cat);
                      }}
                      className="absolute top-1.5 left-1.5 p-1 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-900/90 text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-xs border border-slate-200 dark:border-white/10"
                      title="Editar estampilla"
                    >
                      <PencilSimple size={12} weight="bold" />
                    </button>
                  </motion.div>
                );
              })}

              {/* Botón Nuevo Sello al final si hay espacio */}
              {expenseCategories.length < MAX_CATEGORIES_PER_TYPE && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => openCreateModal('expense')}
                  className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/40 bg-white/40 dark:bg-white/[0.01] hover:bg-white dark:hover:bg-white/[0.04] p-3 flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-all cursor-pointer min-h-[140px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-200/70 dark:bg-white/10 flex items-center justify-center">
                    <Plus size={16} weight="bold" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    + Sello
                  </span>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* ================= MITAD DERECHA: INGRESOS ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <TrendUp size={14} weight="bold" />
              </div>
              <h2 className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Estampillas de Ingreso ({incomeCategories.length}/{MAX_CATEGORIES_PER_TYPE})
              </h2>
            </div>

            <button
              type="button"
              disabled={incomeCategories.length >= MAX_CATEGORIES_PER_TYPE}
              onClick={() => openCreateModal('income')}
              className="px-3 py-1 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black flex items-center gap-1 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={13} weight="bold" />
              <span>{incomeCategories.length >= MAX_CATEGORIES_PER_TYPE ? 'Límite (15)' : 'Nuevo'}</span>
            </button>
          </div>

          {/* Cuadrícula de 5 columnas exactas */}
          <div className="p-3 sm:p-4 rounded-3xl bg-slate-100/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] shadow-inner min-h-[380px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {incomeCategories.map((cat) => {
                const IconComponent = getCategoryIcon(cat.icon_name);
                const usage = getUsageCount(cat);

                return (
                  <motion.div
                    key={cat.id}
                    drag={!isMobile}
                    dragSnapToOrigin={true}
                    dragMomentum={false}
                    dragElastic={0}
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
                    onDragStart={() => handleDragStart(cat)}
                    onDrag={handleDrag}
                    onDragEnd={(e, info) => handleDragEnd(e, info, cat)}
                    onClick={() => handleStampClick(cat)}
                    whileHover={!isMobile ? { scale: 1.04, y: -2 } : { scale: 1.01 }}
                    whileDrag={{
                      scale: 1.1,
                      zIndex: 99999,
                      boxShadow: '0 20px 35px -8px rgba(0,0,0,0.4)',
                      cursor: 'grabbing',
                    }}
                    className={`relative group rounded-3xl p-3 border-2 border-dashed shadow-xs hover:shadow-md flex flex-col items-center justify-between text-center min-h-[140px] select-none ${
                      isMobile ? 'cursor-pointer touch-pan-y' : 'cursor-grab active:cursor-grabbing'
                    }`}
                    style={{
                      // Color de la categoría completo y más llamativo/fuerte
                      backgroundColor: `${cat.color}26`,
                      borderColor: `${cat.color}75`,
                      opacity: pendingDeleteCat?.cat.id === cat.id ? 0 : 1,
                      touchAction: isMobile ? 'pan-y' : 'none',
                    }}
                  >
                    {/* Arriba a la derecha: Cantidad de movimientos y abreviación 'mov.' */}
                    <div className="w-full flex flex-col items-end pb-1 border-b border-black/[0.08] dark:border-white/[0.08]">
                      <span className="text-[11px] font-mono font-black text-slate-700 dark:text-zinc-200">
                        {usage} mov.
                      </span>
                    </div>

                    {/* Centro: Contenedor con el icono grande y color más vivo */}
                    <div
                      className="my-2 w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs"
                      style={{
                        backgroundColor: `${cat.color}35`,
                        color: cat.color,
                      }}
                    >
                      <IconComponent size={26} weight="duotone" />
                    </div>

                    {/* Texto debajo del icono */}
                    <div className="w-full mt-auto">
                      <span className="text-xs font-black text-slate-900 dark:text-white block truncate leading-tight">
                        {cat.name}
                      </span>
                    </div>

                    {/* Botón flotante para editar con un clic */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(cat);
                      }}
                      className="absolute top-1.5 left-1.5 p-1 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-900/90 text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-xs border border-slate-200 dark:border-white/10"
                      title="Editar estampilla"
                    >
                      <PencilSimple size={12} weight="bold" />
                    </button>
                  </motion.div>
                );
              })}

              {/* Botón Nuevo Sello al final si hay espacio */}
              {incomeCategories.length < MAX_CATEGORIES_PER_TYPE && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => openCreateModal('income')}
                  className="rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/40 bg-white/40 dark:bg-white/[0.01] hover:bg-white dark:hover:bg-white/[0.04] p-3 flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-all cursor-pointer min-h-[140px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-200/70 dark:bg-white/10 flex items-center justify-center">
                    <Plus size={16} weight="bold" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    + Sello
                  </span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TACHO DE BASURA FLOTANTE Y SELLO CONGELADO / ANIMACIÓN (PORTAL AISLADO: CERO DESPLAZAMIENTO DEL LAYOUT) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <AnimatePresence>
              {(isDraggingAnyStamp || pendingDeleteCat) && (
                <div className="fixed bottom-10 sm:bottom-12 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none flex flex-col items-center justify-center gap-2">
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.1 }}
                    className="text-[11px] font-black tracking-wider uppercase bg-black/85 text-white dark:bg-white dark:text-black px-3 py-1 rounded-full shadow-lg border border-white/20 select-none whitespace-nowrap"
                  >
                    Soltar aquí para eliminar
                  </motion.span>

                  <motion.div
                    ref={trashRef}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{
                      opacity: 1,
                      scale: isOverTrash || isSuckingIntoTrash ? 1.18 : 1,
                      rotate: isOverTrash ? [0, -6, 6, -3, 0] : 0,
                    }}
                    exit={{ opacity: 0, scale: 0.75, transition: { duration: 0.1 } }}
                    transition={{
                      duration: 0.12,
                      ease: 'easeOut',
                      rotate: { repeat: isOverTrash ? Infinity : 0, duration: 0.35 },
                    }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center pointer-events-auto transition-colors duration-200 shadow-2xl border-2 ${
                      isOverTrash || isSuckingIntoTrash
                        ? 'bg-rose-600 text-white border-white ring-4 ring-rose-400/70 shadow-rose-600/80 scale-110'
                        : 'bg-[#7f1d1d] text-white border-white/80 shadow-black/60 ring-4 ring-rose-950/50'
                    }`}
                    title="Arrastra una estampilla aquí para eliminarla"
                  >
                    <Trash
                      size={32}
                      weight={isOverTrash || isSuckingIntoTrash ? 'fill' : 'bold'}
                      className="text-white drop-shadow-sm transition-transform duration-150"
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Sello Congelado en el Tacho de Basura esperando confirmación */}
            <AnimatePresence>
              {pendingDeleteCat && (() => {
                const IconComponent = getCategoryIcon(pendingDeleteCat.cat.icon_name);
                const targetX = pendingDeleteCat.x;
                const targetY = pendingDeleteCat.y;

                return (
                  <motion.div
                    key="frozen-stamp"
                    initial={{
                      position: 'fixed',
                      left: targetX - 40,
                      top: targetY - 40,
                      width: 80,
                      height: 80,
                      scale: 1,
                      rotate: 0,
                      opacity: 1,
                      zIndex: 1000000,
                      pointerEvents: 'none',
                    }}
                    animate={
                      isSuckingIntoTrash
                        ? {
                            top: targetY + 35,
                            scale: 0.05,
                            rotate: 360,
                            opacity: 0,
                          }
                        : isReturningToGrid
                        ? {
                            scale: 0.7,
                            opacity: 0,
                          }
                        : {
                            scale: [1, 1.05, 1],
                            y: [0, -6, 0],
                            opacity: 1,
                          }
                    }
                    transition={
                      isSuckingIntoTrash
                        ? { duration: 0.38, ease: [0.36, 0, 0.66, -0.56] }
                        : isReturningToGrid
                        ? { duration: 0.28, ease: 'easeOut' }
                        : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }
                    }
                    onAnimationComplete={() => {
                      if (isSuckingIntoTrash) {
                        executeDeleteCat();
                      } else if (isReturningToGrid) {
                        setPendingDeleteCat(null);
                        setConfirmDeleteCat(null);
                        setIsReturningToGrid(false);
                      }
                    }}
                    className="rounded-3xl flex flex-col items-center justify-center border-2 border-dashed shadow-2xl pointer-events-none p-2 text-center"
                    style={{
                      backgroundColor: `${pendingDeleteCat.cat.color}35`,
                      borderColor: pendingDeleteCat.cat.color,
                      color: pendingDeleteCat.cat.color,
                      boxShadow: `0 12px 28px -6px ${pendingDeleteCat.cat.color}60`,
                    }}
                  >
                    <IconComponent size={28} weight="duotone" />
                    <span className="text-[10px] font-black mt-1 truncate max-w-[65px] text-slate-900 dark:text-white">
                      {pendingDeleteCat.cat.name}
                    </span>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </>,
          document.body
        )}

      {/* MODAL DE VERIFICACIÓN PARA ELIMINAR SELLO ARRASTRADO (PORTAL GLOBAL Z-[99999]) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {confirmDeleteCat && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={handleCancelDelete}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 p-6 text-center space-y-4 shadow-2xl"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#7f1d1d] text-white border-2 border-white/40 shadow-lg mx-auto flex items-center justify-center">
                    <Trash size={28} weight="bold" />
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      ¿Eliminar estampilla "{confirmDeleteCat.name}"?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Esta acción eliminará el sello de tus categorías. No se puede deshacer.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/05 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/25 cursor-pointer"
                    >
                      Sí, Eliminar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* MODAL DE ALERTA IN-APP CON EL ESTILO DE LA PÁGINA (PORTAL GLOBAL Z-[99999]) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {actionAlert && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={() => setActionAlert(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200 dark:border-white/10 p-6 text-center space-y-4 shadow-2xl"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 mx-auto flex items-center justify-center shadow-lg">
                    <WarningCircle size={32} weight="fill" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {actionAlert.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {actionAlert.message}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActionAlert(null)}
                      className="btn-unified w-full py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-md cursor-pointer"
                    >
                      Entendido
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* MODAL DE CREACIÓN / EDICIÓN DE ESTAMPILLA (PORTAL GLOBAL Z-[99999]) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isModalOpen && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
                onClick={() => setIsModalOpen(false)}
              >
                <div className="w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 my-auto py-4">
                  {/* ================= LADO IZQUIERDO: EL SELLO SIN FONDO (SOLO EN MD+ PARA NO TAPAR EN MÓVIL) ================= */}
                  <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="hidden md:flex shrink-0 items-center justify-center select-none"
                  >
                <div
                  className="w-48 h-56 sm:w-52 sm:h-60 rounded-3xl p-4 border-2 border-dashed shadow-2xl flex flex-col items-center justify-between text-center transition-all duration-150"
                  style={{
                    backgroundColor: `${formColor}26`,
                    borderColor: `${formColor}80`,
                    boxShadow: `0 20px 45px -10px ${formColor}45`,
                  }}
                >
                  {/* Arriba a la derecha: Cantidad de movimientos */}
                  <div className="w-full flex justify-end border-b border-black/[0.08] dark:border-white/[0.08] pb-1.5">
                    <span className="text-xs font-mono font-black text-slate-700 dark:text-zinc-200">
                      {editingCategory ? getUsageCount(editingCategory) : 0} mov.
                    </span>
                  </div>

                  {/* Centro: Contenedor con icono duotone grande */}
                  <div
                    className="my-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center shadow-md transition-transform"
                    style={{
                      backgroundColor: `${formColor}35`,
                      color: formColor,
                    }}
                  >
                    {React.createElement(getCategoryIcon(formIcon), { size: 40, weight: 'duotone' })}
                  </div>

                  {/* Texto debajo del icono */}
                  <div className="w-full">
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block truncate leading-tight">
                      {formName.trim() || 'Nombre Sello'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* ================= LADO DERECHO: FORMULARIO AL COSTADO ================= */}
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg shrink-0 rounded-3xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-white/10 shadow-2xl p-5 sm:p-7 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden"
              >
                {/* Cabecera del Formulario */}
                <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-white/[0.08] shrink-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 border"
                      style={{
                        backgroundColor: `${formColor}25`,
                        color: formColor,
                        borderColor: `${formColor}60`,
                      }}
                    >
                      {React.createElement(getCategoryIcon(formIcon), { size: 22, weight: 'duotone' })}
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                        {editingCategory ? 'Editar Estampilla' : 'Nueva Estampilla'}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between overflow-hidden pt-3 sm:pt-4 min-h-0">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
                    {formError && (
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                        <WarningCircle size={16} weight="fill" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Nombre del Sello */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Nombre del Sello
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Cafetería, Taxi, Restaurante..."
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        maxLength={30}
                        autoFocus
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-white transition-colors"
                      />
                    </div>

                    {/* Selector de Color In-App */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Color del Sello
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-slate-700 dark:text-zinc-200">
                            {formColor.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCustomPicker(!showCustomPicker)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs select-none ${
                              showCustomPicker
                                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <Palette size={13} weight="bold" />
                            <span>{showCustomPicker ? 'Ocultar' : 'Personalizar'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Grilla de Colores Vivos */}
                      <div className="grid grid-cols-8 sm:grid-cols-12 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08]">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleSelectPresetColor(c)}
                            className={`w-6 h-6 rounded-full transition-all cursor-pointer relative ${
                              formColor.toLowerCase() === c.toLowerCase()
                                ? 'scale-125 ring-2 ring-offset-2 ring-zinc-950 dark:ring-white dark:ring-offset-[#12141c] z-10 shadow-md'
                                : 'hover:scale-115 opacity-90 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>

                      {/* Panel de Selector de Color Personalizado 100% In-App */}
                      <AnimatePresence>
                        {showCustomPicker && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -8 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -8 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="overflow-hidden mt-3"
                          >
                            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 space-y-3 shadow-xs">
                              {/* Fila: Muestra de Color + Input HEX + Presets */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-8 h-8 rounded-xl border-2 shadow-xs transition-colors shrink-0"
                                    style={{
                                      backgroundColor: formColor,
                                      borderColor: `${formColor}90`,
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={hexInputText}
                                    onChange={(e) => handleHexInputChange(e.target.value)}
                                    maxLength={7}
                                    className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#11131a] text-xs font-mono font-black uppercase text-slate-900 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-white"
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  {[
                                    { label: 'Neón', s: 100, l: 50 },
                                    { label: 'Vibrante', s: 90, l: 45 },
                                    { label: 'Pastel', s: 75, l: 75 },
                                    { label: 'Oscuro', s: 85, l: 32 },
                                  ].map((preset) => (
                                    <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() => handleTonePreset(preset.s, preset.l)}
                                      className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white dark:bg-white/10 hover:bg-slate-200/80 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/05 transition-colors cursor-pointer"
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Barra 1: Matiz Arcoíris */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  <span>Matiz (Arcoíris)</span>
                                  <span className="font-mono">{customHue}°</span>
                                </div>
                                <div className="relative h-3.5 rounded-full overflow-hidden shadow-inner border border-black/10 dark:border-white/10">
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      background:
                                        'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                                    }}
                                  />
                                  <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={customHue}
                                    onChange={(e) => handleHueChange(Number(e.target.value))}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                                  />
                                </div>
                              </div>

                              {/* Barra 2: Luminosidad */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                  <span>Brillo</span>
                                  <span className="font-mono">{customLightness}%</span>
                                </div>
                                <div className="relative h-3.5 rounded-full overflow-hidden shadow-inner border border-black/10 dark:border-white/10">
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      background: `linear-gradient(to right, #000000 0%, ${hslToHex(
                                        customHue,
                                        customSaturation,
                                        50
                                      )} 50%, #ffffff 100%)`,
                                    }}
                                  />
                                  <input
                                    type="range"
                                    min="20"
                                    max="85"
                                    value={customLightness}
                                    onChange={(e) => handleLightnessChange(Number(e.target.value))}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Selector de Icono */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Icono ({availableIcons.length} disponibles)
                      </label>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08]">
                        {availableIcons.map((iconName) => {
                          const IconComp = ICON_MAP[iconName] || Tag;
                          const isSelected = formIcon === iconName;

                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => setFormIcon(iconName)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md scale-105'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10'
                              }`}
                              title={iconName}
                            >
                              <IconComp size={18} weight={isSelected ? 'bold' : 'regular'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Botones Guardar y Eliminar (STICKY EN EL PIE: NUNCA SE OCULTAN TRAS LA BARRA) */}
                  <div className="shrink-0 flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/[0.08] mt-2 bg-white dark:bg-[#12141c]">
                    {editingCategory && !editingCategory.is_system ? (
                      <button
                        type="button"
                        onClick={() => {
                          const catToDelete = editingCategory;
                          setIsModalOpen(false);
                          const usage = getUsageCount(catToDelete);
                          if (usage > 0) {
                            setActionAlert({
                              title: 'No se puede eliminar esta estampilla',
                              message: `La categoría "${catToDelete.name}" tiene ${usage} movimiento(s) registrado(s). Para eliminarla de tu álbum, primero debes reasignar o borrar sus movimientos asociados.`,
                            });
                            return;
                          }
                          setConfirmDeleteCat(catToDelete);
                        }}
                        className="px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash size={15} weight="bold" />
                        <span>Eliminar</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-unified px-5 py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Check size={16} weight="bold" />
                        <span>{editingCategory ? 'Guardar Cambios' : 'Crear Sello'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* MODAL: MOVIMIENTOS DE LA CATEGORÍA AL HACER CLIC EN UN SELLO (PORTAL GLOBAL Z-[99999]) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedCategoryForMovements && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto"
                onClick={() => {
                  setSelectedCategoryForMovements(null);
                  setCatSearchQuery('');
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 15 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-xl bg-white dark:bg-[#12141c] border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-900 dark:text-white flex flex-col max-h-[88vh] my-auto overflow-hidden"
                >
              {/* Cabecera del Sello Seleccionado */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08] gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 border-dashed shadow-sm"
                    style={{
                      backgroundColor: `${selectedCategoryForMovements.color}28`,
                      borderColor: `${selectedCategoryForMovements.color}75`,
                      color: selectedCategoryForMovements.color,
                    }}
                  >
                    {React.createElement(getCategoryIcon(selectedCategoryForMovements.icon_name), {
                      size: 26,
                      weight: 'duotone',
                    })}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                        {selectedCategoryForMovements.name}
                      </h3>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          selectedCategoryForMovements.type === 'income'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {selectedCategoryForMovements.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      Historial completo de movimientos asociados
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryForMovements(null);
                    setCatSearchQuery('');
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Tarjeta de Resumen Estadístico de la Categoría */}
              <div
                className="mt-4 p-4 rounded-2xl border-2 border-dashed flex items-center justify-between gap-4"
                style={{
                  backgroundColor: `${selectedCategoryForMovements.color}15`,
                  borderColor: `${selectedCategoryForMovements.color}45`,
                }}
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                    {selectedCategoryForMovements.type === 'income' ? 'Total Ingresado' : 'Total Gastado'}
                  </span>
                  <span
                    className="text-xl sm:text-2xl font-mono font-black tracking-tight mt-0.5 block"
                    style={{ color: selectedCategoryForMovements.color }}
                  >
                    S/. {totalCategorySum.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                    Movimientos
                  </span>
                  <span className="text-lg font-mono font-black text-slate-800 dark:text-slate-100 block">
                    {categoryTransactions.length}
                  </span>
                </div>
              </div>

              {/* Buscador interno si hay más de 3 movimientos */}
              {categoryTransactions.length > 3 && (
                <div className="mt-3">
                  <div className="relative">
                    <MagnifyingGlass
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      weight="bold"
                    />
                    <input
                      type="text"
                      placeholder="Buscar por concepto o notas..."
                      value={catSearchQuery}
                      onChange={(e) => setCatSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-zinc-950 dark:focus:border-white"
                    />
                  </div>
                </div>
              )}

              {/* Lista de Movimientos */}
              <div className="mt-4 overflow-y-auto space-y-2 pr-1 max-h-[340px] flex-1">
                {categoryTransactions.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.05] text-slate-400 mx-auto flex items-center justify-center">
                      <Receipt size={24} weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {catSearchQuery ? 'No se encontraron coincidencias' : 'No hay movimientos registrados'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {catSearchQuery
                          ? 'Prueba con otra palabra clave.'
                          : 'Los gastos o ingresos que registres con este sello aparecerán aquí.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  categoryTransactions.map((tx) => {
                    const dateParts = parseLocalDateParts(tx.date);
                    const txWallet = wallets.find((w) => w.id === tx.wallet_id);
                    const isIncomeTx = tx.type === 'income';
                    const isSavingsTx = tx.type === 'savings_deposit' || tx.type === 'savings_withdrawal';

                    const WalletIcon = txWallet?.type === 'cash' ? Money : txWallet?.type === 'savings' ? PiggyBank : CreditCard;
                    const walletLabel = txWallet?.type === 'cash' ? 'Efectivo' : txWallet?.type === 'savings' ? 'Ahorro' : txWallet?.name || 'Digital';

                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 dark:text-white truncate">
                            {tx.concept || 'Movimiento'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                            <span className="font-medium">{dateParts.formattedDate}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                              <WalletIcon size={12} weight="bold" />
                              <span>{walletLabel}</span>
                            </span>
                          </div>
                          {tx.notes && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                              "{tx.notes}"
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-black text-sm sm:text-base tracking-tight ${
                              isIncomeTx
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isSavingsTx
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncomeTx ? '+' : '-'}S/. {Number(tx.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer con Acciones */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/[0.08] mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const catToEdit = selectedCategoryForMovements;
                    setSelectedCategoryForMovements(null);
                    setCatSearchQuery('');
                    if (catToEdit) openEditModal(catToEdit);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PencilSimple size={13} weight="bold" />
                  <span>Editar Sello</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryForMovements(null);
                    setCatSearchQuery('');
                  }}
                  className="btn-unified px-5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-md cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
};
