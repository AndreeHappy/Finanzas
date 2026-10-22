import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Microphone,
  TelegramLogo,
  Check,
  WarningCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  CheckCircle,
  PaperPlaneTilt,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  CreditCard,
  Money,
  PiggyBank,
  QrCode,
  Cube,
} from '@phosphor-icons/react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { getCategoryIcon } from '../../constants/iconMap';
import { VaultQr3D, BANKNOTE_THEMES, type BanknoteStyle } from './VaultQr3D';

export const AutomatizacionView: React.FC = () => {
  const { wallets, categories, addTransaction } = useFinance();
  const { user } = useAuth();

  // Pestañas activas: Primero "Registro por Voz" y luego "Bot de Telegram"
  const [activeTab, setActiveTab] = useState<'voice' | 'telegram'>('voice');

  // Modo de visualización 3D vs 2D y Estilo de billetes peruanos
  const [viewMode, setViewMode] = useState<'isometric' | 'topdown'>('isometric');
  const [banknoteStyle, setBanknoteStyle] = useState<BanknoteStyle>('peru_10');

  // Estados para dropdowns estilizados (Categoría y Billetera)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const walletDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(e.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // ESTADO DE REGISTRO POR VOZ OPTIMIZADO (WEB SPEECH API)
  // ==========================================
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Haz clic en el micrófono para hablar o escribe una frase abajo.');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceTextInput, setVoiceTextInput] = useState('');
  const [voiceParsed, setVoiceParsed] = useState<{
    amount: number | null;
    type: 'expense' | 'income';
    concept: string;
    category_id: string;
    wallet_id: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  const parseSentence = (sentence: string) => {
    const lower = sentence.toLowerCase().trim();
    if (!lower) return;

    // 1. Detectar monto numérico (ej. 30, 30.50, S/ 30, 30 soles)
    const numberMatch = lower.match(/\d+([.,]\d+)?/);
    const amount = numberMatch ? parseFloat(numberMatch[0].replace(',', '.')) : null;

    // 2. Detectar si es ingreso o gasto
    const incomeKeywords = /\b(gané|gane|ingreso|ingresos|cobré|cobre|pagaron|recibí|recibi|sueldo|salario|propina|depósito|deposito|abono)\b/i;
    const isIncome = incomeKeywords.test(lower);
    const type: 'expense' | 'income' = isIncome ? 'income' : 'expense';

    // 3. Aislar el concepto limpio usando límites de palabra estrictos (\b) para no recortar palabras (ej: 'enchufe' no debe perder 'en')
    const stopWords = /\b(gasté|gaste|gastado|compré|compre|comprado|pagué|pague|pagado|yapeé|yapee|yape|plinee|plineé|plin|soles|sol|pen|pesos|dolares|dólares|en|con|de|del|la|el|los|las|un|una|unos|unas|por|para|a|mi|mis|al|s\/|s\/\.)\b/gi;

    let concept = sentence
      .replace(/\b(s\/\.?\s*)?\d+([.,]\d+)?(?:\s*(?:soles|sol|pen))?\b/gi, ' ')
      .replace(stopWords, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!concept) {
      concept = isIncome ? 'Ingreso detectado por voz' : 'Gasto detectado por voz';
    }

    // 4. Búsqueda inteligente de categoría con afinidad semántica
    const targetCats = categories.filter((c) => c.type === type);

    // Coincidencia por nombre exacto de categoría
    let matchedCat = targetCats.find((c) => {
      const catName = c.name.toLowerCase().trim();
      return catName.length > 2 && lower.includes(catName);
    });

    if (!matchedCat) {
      const isFood = /\b(comida|almuerzo|cena|desayuno|menú|menu|café|cafe|pan|arroz|chifa|pollo|hamburguesa|pizza|fruta|restaurante|snack|galleta|gaseosa|agua|abarrotes|mercado|supermercado|bodega|tottus|metro|plazavea|wong|tambos?|kfc|bembos)\b/i.test(lower);
      const isTransport = /\b(taxi|pasaje|bus|metropolitano|gasolina|grifo|uber|didi|indrive|peaje|moto|micro|combi|tren|colectivo|estacionamiento|cochera|linea 1|corredor)\b/i.test(lower);
      const isEntertainment = /\b(cine|película|pelicula|juego|videojuego|steam|playstation|netflix|spotify|salida|bar|fiesta|trago|cerveza|disco|discoteca|chela|ron|whisky|vodka)\b/i.test(lower);
      const isGym = /\b(gym|gimnasio|deporte|entrenamiento|suplemento|proteina|pesas|smartfit)\b/i.test(lower);
      const isShopping = /\b(ropa|polo|pantalon|pantalón|camisa|zapatos|zapatillas|vestido|tienda|mall|saga|ripley|zara|h&m|compras?)\b/i.test(lower);
      const isHealth = /\b(farmacia|medicina|medicamento|pastilla|doctor|medico|consulta|clinica|hospital|dentista|odontologo|analisis|inkafarma|mifarma)\b/i.test(lower);
      const isHomeService = /\b(enchufe|foco|cable|luz|agua|internet|calidda|sedapal|enel|ferreteria|tornillo|herramienta|martillo|reparacion|pintura|casa|alquiler|recibo|adaptador)\b/i.test(lower);
      const isSalary = /\b(sueldo|salario|pago|quincena|mensualidad|empleo|planilla)\b/i.test(lower);
      const isBonus = /\b(bono|premio|regalo|propina|extra|sorteo)\b/i.test(lower);

      if (isFood) {
        matchedCat = targetCats.find((c) => {
          const n = c.name.toLowerCase();
          return n.includes('aliment') || n.includes('comida') || n.includes('bebida');
        });
      } else if (isTransport) {
        matchedCat = targetCats.find((c) => c.name.toLowerCase().includes('transporte'));
      } else if (isEntertainment) {
        matchedCat = targetCats.find((c) => {
          const n = c.name.toLowerCase();
          return n.includes('entreten') || n.includes('trago') || n.includes('ocio');
        });
      } else if (isGym) {
        matchedCat = targetCats.find((c) => c.name.toLowerCase().includes('gym') || c.name.toLowerCase().includes('deporte') || c.name.toLowerCase().includes('bienestar'));
      } else if (isShopping) {
        matchedCat = targetCats.find((c) => c.name.toLowerCase().includes('compra') || c.name.toLowerCase().includes('ropa'));
      } else if (isHealth) {
        matchedCat = targetCats.find((c) => {
          const n = c.name.toLowerCase();
          return n.includes('salud') || n.includes('farmacia') || n.includes('medicina');
        });
      } else if (isHomeService) {
        matchedCat = targetCats.find((c) => {
          const n = c.name.toLowerCase();
          return n.includes('servicio') || n.includes('hogar') || n.includes('mantenimiento') || n.includes('ferreteria');
        });
      } else if (isSalary) {
        matchedCat = targetCats.find((c) => c.name.toLowerCase().includes('sueldo') || c.name.toLowerCase().includes('salario'));
      } else if (isBonus) {
        matchedCat = targetCats.find((c) => c.name.toLowerCase().includes('bono') || c.name.toLowerCase().includes('regalo'));
      }
    }

    // 5. Fallback seguro: Si no encaja en ninguna categoría específica, asignar "Otros Gastos" / "Otros" (NUNCA "Alimentación")
    if (!matchedCat) {
      matchedCat = targetCats.find((c) => {
        const n = c.name.toLowerCase();
        return n.includes('otro') || n.includes('general') || n.includes('vario');
      }) || targetCats[0];
    }

    // 6. Detección inteligente de billetera
    let targetWallet = wallets.find((w) => w.type === 'digital') || wallets[0];
    if (lower.includes('efectivo') || lower.includes('mano') || lower.includes('billete') || lower.includes('moneda')) {
      const cash = wallets.find((w) => w.type === 'cash');
      if (cash) targetWallet = cash;
    } else if (lower.includes('ahorro') || lower.includes('chanchito') || lower.includes('alcancia')) {
      const sav = wallets.find((w) => w.type === 'savings');
      if (sav) targetWallet = sav;
    }

    setVoiceParsed({
      amount,
      type,
      concept: concept.charAt(0).toUpperCase() + concept.slice(1),
      category_id: matchedCat?.id || targetCats[0]?.id || '',
      wallet_id: targetWallet?.id || wallets[0]?.id || '',
    });
  };

  const startVoiceRecognition = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    setVoiceError(null);

    // Verificar permiso sin bloquear el dispositivo de audio
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Detener inmediatamente para que SpeechRecognition no quede bloqueado en Windows
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setVoiceError('Permiso de micrófono no otorgado. Actívalo en tu navegador o escribe tu frase.');
        return;
      }
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Tu navegador no cuenta con SpeechRecognition nativo. Puedes escribir la frase directamente en la caja de abajo.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'es-PE';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('🎙️ Escuchando... Habla ahora (Ej: "Gasté 30 soles en enchufe")');
      };

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setVoiceStatus(`"${text}"`);
        setVoiceTextInput(text);
        parseSentence(text);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          setVoiceStatus('⚠️ No se detectó audio. Haz clic de nuevo y habla cerca del micrófono.');
        } else if (event.error === 'not-allowed') {
          setVoiceError('Permiso de micrófono denegado en la configuración del sitio.');
        } else {
          setVoiceStatus(`Audio finalizado (${event.error}). Puedes volver a intentar o escribir tu frase.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error(err);
      setIsListening(false);
      setVoiceError('No se pudo iniciar el micrófono.');
    }
  };

  const handleConfirmVoice = async () => {
    if (!voiceParsed) return;
    if (!voiceParsed.amount || voiceParsed.amount <= 0) {
      alert('Por favor verifica o ingresa un monto válido.');
      return;
    }

    try {
      const cat = categories.find((c) => c.id === voiceParsed.category_id);
      await addTransaction({
        wallet_id: voiceParsed.wallet_id || wallets[0]?.id,
        category_id: voiceParsed.category_id,
        category_name: cat?.name || (voiceParsed.type === 'income' ? 'Ingreso por Voz' : 'Gasto por Voz'),
        type: voiceParsed.type,
        amount: voiceParsed.amount,
        concept: voiceParsed.concept,
        date: new Date().toISOString(),
      });

      alert(`¡Movimiento de S/. ${voiceParsed.amount.toFixed(2)} registrado exitosamente!`);
      setVoiceParsed(null);
      setVoiceTextInput('');
      setVoiceStatus('¡Movimiento guardado con éxito! Listo para el siguiente.');
    } catch (err: any) {
      alert(err.message || 'Error al registrar.');
    }
  };

  // Frases de prueba rápida con un solo clic
  const QUICK_PHRASES = [
    'Gasté 30 soles en enchufe',
    'Almorcé menú por 15 soles',
    'Gasté 12 soles en taxi',
    'Me pagaron 1500 soles de sueldo',
  ];

  // ==========================================
  // ESTADO DE INTEGRACIÓN CON BOT DE TELEGRAM
  // ==========================================
  const linkToken = useMemo(() => {
    if (user?.id) {
      return `FIN-${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
    }
    return 'FIN-789241';
  }, [user]);

  const [hasCopiedToken, setHasCopiedToken] = useState(false);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(linkToken);
    setHasCopiedToken(true);
    setTimeout(() => setHasCopiedToken(false), 2200);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4 py-1 select-none">
      {/* BARRA SUPERIOR LIMPIA CENTRADA CON LOS 2 BOTONES (SIN LÍNEA DIVISORIA) */}
      <div className="flex items-center justify-center pb-2 w-full max-w-4xl">
        <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'voice'
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Microphone size={17} weight="bold" />
            <span>Registro por Voz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'telegram'
                ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TelegramLogo size={17} weight="bold" />
            <span>Bot de Telegram</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: REGISTRO POR VOZ (DISTRIBUCIÓN 2 COLUMNAS SIN SCROLL VERTICAL) */}
      {/* ========================================================================= */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* ================= COLUMNA IZQUIERDA: CUADRO DE INTERPRETACIÓN ================= */}
          <div className="lg:col-span-6 flex flex-col justify-start">
            <AnimatePresence mode="wait">
              {voiceParsed ? (
                <motion.div
                  key="parsed-card"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 p-5 sm:p-6 text-left space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      {voiceParsed.type === 'expense' ? (
                        <>
                          <ArrowUpRight size={16} weight="bold" />
                          <span>Gasto Detectado</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft size={16} weight="bold" />
                          <span>Ingreso Detectado</span>
                        </>
                      )}
                    </span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-white">
                      S/. {voiceParsed.amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>

                  {/* Formulario Editable Rápido */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white/70 dark:bg-black/30 p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Concepto Detectado
                      </label>
                      <input
                        type="text"
                        value={voiceParsed.concept}
                        onChange={(e) =>
                          setVoiceParsed({ ...voiceParsed, concept: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.05] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Monto en Soles (S/.)
                      </label>
                      <input
                        type="number"
                        step="0.10"
                        value={voiceParsed.amount ?? ''}
                        onChange={(e) =>
                          setVoiceParsed({
                            ...voiceParsed,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.05] text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Selector Personalizado de Categoría con icono y color */}
                    <div ref={categoryDropdownRef} className="space-y-1 relative">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Categoría Asignada
                      </label>
                      {(() => {
                        const selCat = categories.find((c) => c.id === voiceParsed.category_id);
                        const SelIcon = getCategoryIcon(selCat?.icon_name || selCat?.name);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCategoryDropdownOpen((prev) => !prev);
                                setIsWalletDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between transition-all focus:outline-none cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: `${selCat?.color || '#3b82f6'}22`,
                                    color: selCat?.color || '#3b82f6',
                                  }}
                                >
                                  <SelIcon size={13} weight="bold" />
                                </div>
                                <span className="truncate">{selCat?.name || 'Selecciona Categoría'}</span>
                              </div>
                              {isCategoryDropdownOpen ? (
                                <CaretUp size={13} weight="bold" className="text-slate-400 shrink-0" />
                              ) : (
                                <CaretDown size={13} weight="bold" className="text-slate-400 shrink-0" />
                              )}
                            </button>

                            <AnimatePresence>
                              {isCategoryDropdownOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full inset-x-0 mt-1 z-50 bg-white/95 dark:bg-[#151622]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 max-h-56 overflow-y-auto space-y-1"
                                >
                                  {categories
                                    .filter((c) => c.type === voiceParsed.type)
                                    .map((cat) => {
                                      const isSel = cat.id === voiceParsed.category_id;
                                      const CatIcon = getCategoryIcon(cat.icon_name || cat.name);
                                      return (
                                        <button
                                          key={cat.id}
                                          type="button"
                                          onClick={() => {
                                            setVoiceParsed({ ...voiceParsed, category_id: cat.id });
                                            setIsCategoryDropdownOpen(false);
                                          }}
                                          className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-left cursor-pointer ${
                                            isSel
                                              ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 truncate">
                                            <div
                                              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                                              style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                                            >
                                              <CatIcon size={12} weight="bold" />
                                            </div>
                                            <span className="truncate">{cat.name}</span>
                                          </div>
                                          {isSel && <Check size={13} weight="bold" />}
                                        </button>
                                      );
                                    })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        );
                      })()}
                    </div>

                    {/* Selector Personalizado de Billetera con icono y saldo */}
                    <div ref={walletDropdownRef} className="space-y-1 relative">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Billetera / Tarjeta
                      </label>
                      {(() => {
                        const selWallet = wallets.find((w) => w.id === voiceParsed.wallet_id) || wallets[0];
                        const WIcon = selWallet?.type === 'cash' ? Money : selWallet?.type === 'savings' ? PiggyBank : CreditCard;
                        const wColor =
                          selWallet?.type === 'cash'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : selWallet?.type === 'savings'
                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                            : 'bg-sky-500/15 text-sky-600 dark:text-sky-400';

                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsWalletDropdownOpen((prev) => !prev);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between transition-all focus:outline-none cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${wColor}`}>
                                  <WIcon size={13} weight="bold" />
                                </div>
                                <span className="truncate">{selWallet?.name || 'Selecciona Billetera'}</span>
                              </div>
                              {isWalletDropdownOpen ? (
                                <CaretUp size={13} weight="bold" className="text-slate-400 shrink-0" />
                              ) : (
                                <CaretDown size={13} weight="bold" className="text-slate-400 shrink-0" />
                              )}
                            </button>

                            <AnimatePresence>
                              {isWalletDropdownOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-full inset-x-0 mt-1 z-50 bg-white/95 dark:bg-[#151622]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-1.5 max-h-56 overflow-y-auto space-y-1"
                                >
                                  {wallets.map((w) => {
                                    const isSel = w.id === voiceParsed.wallet_id;
                                    const Icon = w.type === 'cash' ? Money : w.type === 'savings' ? PiggyBank : CreditCard;
                                    const cClass =
                                      w.type === 'cash'
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : w.type === 'savings'
                                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                                        : 'bg-sky-500/15 text-sky-600 dark:text-sky-400';

                                    return (
                                      <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => {
                                          setVoiceParsed({ ...voiceParsed, wallet_id: w.id });
                                          setIsWalletDropdownOpen(false);
                                        }}
                                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between text-left cursor-pointer ${
                                          isSel
                                            ? 'btn-unified bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${cClass}`}>
                                            <Icon size={12} weight="bold" />
                                          </div>
                                          <span className="truncate">{w.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono opacity-75 shrink-0 ml-2">
                                          S/. {(w.balance ?? w.initial_balance).toFixed(2)}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmVoice}
                      className="btn-unified w-full py-3.5 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
                    >
                      <Check size={18} weight="bold" />
                      <span>Confirmar y Guardar Movimiento</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full min-h-[380px] rounded-3xl p-6 sm:p-8 bg-slate-50/70 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-3"
                >
                  <div className="w-16 h-16 rounded-2xl bg-zinc-200/70 dark:bg-white/[0.05] flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner">
                    <Microphone size={32} weight="duotone" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200">
                    Panel de Interpretación en Vivo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    Aquí aparecerá el desglose instantáneo del gasto o ingreso para que puedas revisarlo y confirmarlo cómodamente en la misma pantalla sin hacer scroll.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ================= COLUMNA DERECHA: MICRÓFONO Y CONTROLES ================= */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            <div className="glass-panel rounded-3xl p-6 text-center space-y-5 border border-slate-200 dark:border-white/10 shadow-lg">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  ASISTENTE DE VOZ
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Registro Instantáneo por Voz
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Presiona el micrófono y di frases naturales como "Gasté 30 soles en enchufe".
                </p>
              </div>

              {/* Error si no hay permisos de micrófono */}
              {voiceError && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2.5 text-left">
                  <WarningCircle size={20} weight="fill" className="shrink-0 text-amber-500" />
                  <span>{voiceError}</span>
                </div>
              )}

              {/* Botón de Micrófono con Animación de Ondas */}
              <div className="relative flex items-center justify-center py-2">
                {isListening && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0.1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                      className="absolute w-32 h-32 rounded-full bg-rose-500/25 pointer-events-none"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut', delay: 0.2 }}
                      className="absolute w-40 h-40 rounded-full bg-rose-500/15 pointer-events-none"
                    />
                  </>
                )}

                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={startVoiceRecognition}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white shadow-rose-500/50 ring-4 ring-rose-400/50'
                      : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-black/20'
                  }`}
                  title={isListening ? 'Haz clic para detener' : 'Presiona para hablar'}
                >
                  <Microphone size={34} weight={isListening ? 'fill' : 'bold'} />
                </motion.button>
              </div>

              {/* Estado del reconocimiento en tiempo real */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08]">
                <span className={`text-xs sm:text-sm font-bold ${isListening ? 'text-rose-500 font-black' : 'text-slate-600 dark:text-slate-300'}`}>
                  {voiceStatus}
                </span>
              </div>

              {/* Sugerencias Rápidas de Prueba */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  O prueba con una frase de ejemplo (1 clic):
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PHRASES.map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setVoiceTextInput(phrase);
                        setVoiceStatus(`"${phrase}"`);
                        parseSentence(phrase);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 transition-colors cursor-pointer"
                    >
                      "{phrase}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Caja de Fallback Directo */}
              <div className="space-y-2 text-left pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  O escribe directamente la frase rápida:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej. Gasté 30 soles en enchufe..."
                    value={voiceTextInput}
                    onChange={(e) => setVoiceTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') parseSentence(voiceTextInput);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => parseSentence(voiceTextInput)}
                    className="px-5 py-2.5 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shrink-0 cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    Interpretar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: BOT DE TELEGRAM & VINCULACIÓN SEGURA CON BÓVEDA 3D / QR */}
      {/* ========================================================================= */}
      {activeTab === 'telegram' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center justify-center w-full max-w-5xl mx-auto my-auto">
          {/* Columna Izquierda: Información Compacta y Pasos Rápidos */}
          <div className="lg:col-span-5 space-y-4 text-left">
            {/* Tarjeta Principal de Vinculación */}
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-md shrink-0">
                  <TelegramLogo size={22} weight="fill" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 block">
                    ASISTENTE TELEGRAM
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Vinculación de Cuenta
                  </h3>
                </div>
              </div>

              {/* Token Personal de Vinculación */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                  Tu Token de Vinculación
                </span>
                <div className="flex items-center justify-between gap-2.5 bg-white dark:bg-[#0c0d12] p-2.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                  <span className="font-mono text-sm sm:text-base font-black tracking-widest text-slate-900 dark:text-white truncate">
                    {linkToken}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="btn-unified px-3 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    {hasCopiedToken ? (
                      <>
                        <CheckCircle size={14} weight="bold" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} weight="bold" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pasos Rápidos y Simples */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex flex-col items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-xs">1</span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">Abre el Bot</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex flex-col items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-xs">2</span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">Envía el Token</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex flex-col items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">3</span>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">¡Listo para usar!</span>
                </div>
              </div>

              {/* Botón de Acción Principal Monocromático Unificado */}
              <div className="pt-1">
                <a
                  href={`https://t.me/FinanzasApp_bot?start=${linkToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-unified w-full py-3 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
                >
                  <PaperPlaneTilt size={16} weight="bold" />
                  <span>Abrir Bot en Telegram</span>
                  <ArrowSquareOut size={15} weight="bold" />
                </a>
              </div>
            </div>

            {/* Tarjeta 2: Selector de Estilo y Botón de Alternar Vista */}
            <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-xl space-y-3">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Elige tu estilo:
              </span>

              {/* Selector de 5 colores limpios sin letras abajo */}
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(BANKNOTE_THEMES) as BanknoteStyle[]).map((styleKey) => {
                  const theme = BANKNOTE_THEMES[styleKey];
                  const isSelected = banknoteStyle === styleKey;
                  return (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() => setBanknoteStyle(styleKey)}
                      className={`h-10 rounded-2xl border transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'border-zinc-950 dark:border-white bg-slate-200/90 dark:bg-white/15 shadow-md scale-105 ring-2 ring-zinc-950/20 dark:ring-white/20'
                          : 'border-slate-200/80 dark:border-white/[0.08] bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
                      }`}
                      title={`${theme.name} - ${theme.colorName}`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shadow-md ring-2 ring-white/80 dark:ring-black/60 transition-transform"
                        style={{ backgroundColor: theme.top }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Botón de alternar vista (QR vs Bóveda) movido aquí según el boceto del usuario */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setViewMode((prev) => (prev === 'isometric' ? 'topdown' : 'isometric'))}
                  className="btn-unified w-full py-2.5 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
                >
                  {viewMode === 'isometric' ? (
                    <>
                      <QrCode size={16} weight="bold" />
                      <span>Ver Código QR</span>
                    </>
                  ) : (
                    <>
                      <Cube size={16} weight="bold" />
                      <span>Ver Bóveda 3D</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Bóveda 3D con 100% de Espacio y Protagonismo */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center w-full">
            <VaultQr3D
              token={linkToken}
              botUsername="FinanzasApp_bot"
              banknoteStyle={banknoteStyle}
              viewMode={viewMode}
              onToggleViewMode={() => setViewMode((prev) => (prev === 'isometric' ? 'topdown' : 'isometric'))}
            />
          </div>
        </div>
      )}
    </div>
  );
};
