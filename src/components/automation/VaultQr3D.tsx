import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import QRCode from 'qrcode';

export type BanknoteStyle = 'peru_10' | 'peru_20' | 'peru_50' | 'peru_100' | 'peru_200';

export interface BanknoteThemeConfig {
  id: BanknoteStyle;
  name: string;
  denomination: string;
  colorName: string;
  badgeBg: string;
  badgeBorder: string;
  dotColor: string;
  top: string;
  left: string;
  right: string;
  accent: string;
  strapBlue: string;
  threadColor: string;
}

export const BANKNOTE_THEMES: Record<BanknoteStyle, BanknoteThemeConfig> = {
  peru_10: {
    id: 'peru_10',
    name: 'S/ 10',
    denomination: '10',
    colorName: 'Verde',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    dotColor: '#10b981',
    top: '#10b981',      // Verde esmeralda claro
    left: '#047857',     // Sombra verde bosque
    right: '#059669',    // Verde billete medio
    accent: '#34d399',
    strapBlue: '#0284c7', // Tira de seguridad oficial
    threadColor: 'rgba(167, 243, 208, 0.75)',
  },
  peru_20: {
    id: 'peru_20',
    name: 'S/ 20',
    denomination: '20',
    colorName: 'Mostaza',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/40',
    dotColor: '#f59e0b',
    top: '#f59e0b',      // Mostaza / Crema brillante
    left: '#92400e',     // Ocre tostado sombra
    right: '#b45309',    // Mostaza cálido medio
    accent: '#fde047',
    strapBlue: '#0284c7',
    threadColor: 'rgba(254, 240, 138, 0.75)',
  },
  peru_50: {
    id: 'peru_50',
    name: 'S/ 50',
    denomination: '50',
    colorName: 'Rojo',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/40',
    dotColor: '#f43f5e',
    top: '#f43f5e',      // Rojo rosado / Carmesí
    left: '#9f1239',     // Granate oscuro sombra
    right: '#be123c',    // Rojo billete medio
    accent: '#fda4af',
    strapBlue: '#0284c7',
    threadColor: 'rgba(253, 164, 175, 0.75)',
  },
  peru_100: {
    id: 'peru_100',
    name: 'S/ 100',
    denomination: '100',
    colorName: 'Azul',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/40',
    dotColor: '#0ea5e9',
    top: '#0ea5e9',      // Azul celeste intenso
    left: '#0369a1',     // Azul marino sombra
    right: '#0284c7',    // Azul zafiro medio
    accent: '#7dd3fc',
    strapBlue: '#10b981', // Verde en billete azul
    threadColor: 'rgba(125, 211, 252, 0.75)',
  },
  peru_200: {
    id: 'peru_200',
    name: 'S/ 200',
    denomination: '200',
    colorName: 'Morado',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/40',
    dotColor: '#a855f7',
    top: '#a855f7',      // Morado lila vibrante
    left: '#6b21a8',     // Morado oscuro sombra
    right: '#7e22ce',    // Violeta medio
    accent: '#d8b4fe',
    strapBlue: '#eab308', // Dorado en billete morado
    threadColor: 'rgba(216, 180, 254, 0.75)',
  },
};

type BlockType = 'bill_stack' | 'gold_bar' | 'vault_safe';

interface BlockData {
  r: number;
  c: number;
  x: number;
  y: number;
  type: BlockType;
  stackCount: number; // 1 a 12 elementos apilados
  height: number;     // Altura 3D calculada
  isFinder: boolean;
}

interface VaultQr3DProps {
  token: string;
  botUsername?: string;
  className?: string;
  banknoteStyle?: BanknoteStyle;
  viewMode?: 'isometric' | 'topdown';
  onToggleViewMode?: () => void;
}

export const VaultQr3D: React.FC<VaultQr3DProps> = ({
  token,
  botUsername = 'FinanzasApp_bot',
  className = '',
  banknoteStyle = 'peru_10',
  viewMode: controlledViewMode,
  onToggleViewMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [internalViewMode, setInternalViewMode] = useState<'isometric' | 'topdown'>('isometric');
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;

  // Transición Cinemática Suave (400ms sedoso, 120 FPS en móviles y escritorio)
  const animProgressRef = useRef(1); // 1 = 3D Isométrico, 0 = 2D QR plano
  const animStartTimeRef = useRef(0);
  const animStartPRef = useRef(1);
  const animTargetPRef = useRef(1);
  const ANIM_DURATION = 400; // ms (ágil, fluido y con 60-120 FPS sostenidos)

  // Arrastre horizontal interactivo para rotar en 3D (en Ref para 120 FPS sin re-renders de React)
  const dragAngleRef = useRef(0);
  const dragDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);

  // Gesto de pellizco (Pinch to Zoom en pantallas táctiles)
  const touchStartDistRef = useRef(0);
  const touchStartZoomRef = useRef(1);

  // Dimensiones en caché para CERO layout thrashing en render loop
  const canvasDimsRef = useRef({ width: 400, height: 400 });

  // Zoom interactivo con rueda del ratón
  const targetZoomRef = useRef(1);
  const animZoomRef = useRef(1);

  // Reloj continuo para partículas y destellos
  const timeRef = useRef(0);
  const isLoopRunningRef = useRef(false);
  const wakeUpRenderRef = useRef<() => void>(() => {});

  const telegramUrl = useMemo(
    () => `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`,
    [botUsername, token]
  );

  const currentTheme = BANKNOTE_THEMES[banknoteStyle] || BANKNOTE_THEMES.peru_10;

  // Generar la matriz QR estricta y pre-ordenar los bloques una sola vez (Zero per-frame allocations)
  const qrData = useMemo(() => {
    try {
      const qr = QRCode.create(telegramUrl, { errorCorrectionLevel: 'M' });
      const size = qr.modules.size;
      const rawBlocks: BlockData[] = [];

      const isFinderPattern = (r: number, c: number) => {
        if (r <= 7 && c <= 7) return true;
        if (r <= 7 && c >= size - 8) return true;
        if (r >= size - 8 && c <= 7) return true;
        return false;
      };

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const isDark = qr.modules.get(r, c) === 1;
          if (!isDark) continue;

          const isFinder = isFinderPattern(r, c);

          let type: BlockType;
          let stackCount: number;
          let height: number;

          if (isFinder) {
            // MONOLITOS DE TITANIO BLINDADO EN LAS 3 ESQUINAS
            type = 'vault_safe';
            stackCount = 1;
            height = 1.15;
          } else {
            // DISTRIBUCIÓN EQUILIBRADA: 44% Lingotes de Oro, 56% Billetes
            const seed = (r * 17 + c * 31 + (r ^ c)) % 100;
            const isGold = seed < 44;

            // 3 componentes estandarizados según el boceto: 1 barra, 3 barras o 5 barras
            const tierChoice = (r * 7 + c * 13 + (seed % 5)) % 3;
            stackCount = tierChoice === 0 ? 1 : tierChoice === 1 ? 3 : 5;

            if (isGold) {
              type = 'gold_bar';
              height = stackCount * 0.22; // 0.22, 0.66 o 1.10
            } else {
              type = 'bill_stack';
              height = stackCount * 0.20; // 0.20, 0.60 o 1.00
            }
          }

          rawBlocks.push({
            r,
            c,
            x: c - (size - 1) / 2,
            y: r - (size - 1) / 2,
            type,
            stackCount,
            height,
            isFinder,
          });
        }
      }

      // Pre-ordenar en 45° una sola vez
      rawBlocks.sort((a, b) => (a.r + a.c) - (b.r + b.c));

      return { size, blocks: rawBlocks };
    } catch (e) {
      console.error('Error generando matriz QR 3D:', e);
      return { size: 25, blocks: [] };
    }
  }, [telegramUrl]);

  // Iniciar la transición cinemática suave cada vez que cambia viewMode
  useEffect(() => {
    const target = viewMode === 'isometric' ? 1 : 0;
    if (animTargetPRef.current !== target) {
      animStartTimeRef.current = performance.now();
      animStartPRef.current = animProgressRef.current;
      animTargetPRef.current = target;
      if (viewMode === 'topdown') {
        targetZoomRef.current = 1;
      }
      wakeUpRenderRef.current();
    }
  }, [viewMode]);

  // Helper unificado de DPR para que búfer, escala y borrado sean 100% idénticos
  const getDpr = () => {
    const isMobile = window.innerWidth < 768;
    return isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 2);
  };

  // Observer de dimensiones para CERO layout thrashing (sin leer clientWidth cada fotograma)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          const w = Math.round(cr.width);
          const h = Math.round(cr.height);
          canvasDimsRef.current = { width: w, height: h };
          const dpr = getDpr();
          if (canvasRef.current) {
            canvasRef.current.width = Math.round(w * dpr);
            canvasRef.current.height = Math.round(h * dpr);
          }
          wakeUpRenderRef.current();
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Listener nativo no-pasivo de rueda para zoom sin scroll de página
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0016;
      targetZoomRef.current = Math.min(2.5, Math.max(0.7, targetZoomRef.current + delta));
      wakeUpRenderRef.current();
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Bucle de renderizado ultrarrápido (< 0.2ms por fotograma, 60/120 FPS sin caídas)
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    isLoopRunningRef.current = true;

    const render = () => {
      timeRef.current += 0.025;

      // Transición cinemática con curva cúbica suave (Cero pausas ni saltos bruscos)
      if (animProgressRef.current !== animTargetPRef.current) {
        const elapsed = performance.now() - animStartTimeRef.current;
        const progress = Math.min(1, Math.max(0, elapsed / ANIM_DURATION));
        // Easing cúbico simétrico: acelera suave y desacelera sedoso
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        animProgressRef.current = animStartPRef.current + (animTargetPRef.current - animStartPRef.current) * ease;
      }

      // Interpolación de Zoom
      const zoomDiff = targetZoomRef.current - animZoomRef.current;
      if (Math.abs(zoomDiff) > 0.001) {
        animZoomRef.current += zoomDiff * 0.18;
      } else {
        animZoomRef.current = targetZoomRef.current;
      }

      const p = animProgressRef.current; // 1 = 3D Isométrico, 0 = 2D QR plano
      const currentZoom = animZoomRef.current;

      const isMobile = window.innerWidth < 768;
      const dpr = getDpr();
      const { width, height } = canvasDimsRef.current;

      if (width <= 0 || height <= 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Sincronización exacta del búfer físico del canvas
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Limpieza 100% infalible del búfer físico completo (Cero estiramientos, artefactos o rastro fantasma)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Escalar al espacio de coordenadas lógicas CSS
      ctx.scale(dpr, dpr);

      const size = qrData.size;
      const centerX = width / 2;
      const blocks = qrData.blocks;

      const billTop = currentTheme.top;
      const billLeft = currentTheme.left;
      const billRight = currentTheme.right;
      const billStrapBlue = currentTheme.strapBlue;

      // =========================================================================
      // DIMENSIONAMIENTO UNIFICADO 2D Y 3D (CERO SALTOS BRUSCOS AL COMPLETAR TRANSICIÓN)
      // =========================================================================
      const margin = 1;
      const totalSpan = size + margin * 2;
      const halfFloor = totalSpan / 2;
      const slabDepth = 0.95;

      // Tamaño base proporcionado y armónico con las tarjetas de la izquierda
      const max2DSpan = isMobile ? 350 : 440;
      const base2DSize = Math.min(width - 32, height - 32, max2DSpan);
      const cellSize = (base2DSize / totalSpan) * currentZoom;
      const topdownScale = cellSize;

      const isoSpanX = halfFloor * 2 * 1.414;
      const isoSpanY = halfFloor * 2 * 0.816 + 3.2;
      const baseIsoScale = Math.min((width - 24) / isoSpanX, (height - 24) / isoSpanY);
      const effectiveIsoScale = baseIsoScale * currentZoom;

      const scale = (1 - p) * topdownScale + p * effectiveIsoScale;
      const centerY = (1 - p) * (height / 2) + p * (height / 2 + scale * 0.5);

      // =========================================================================
      // CASO 1: MODO 2D QR PLANO ESTRICTO (p === 0)
      // Centrado perfecto a cualquier zoom, 3 batch calls sin cálculos 3D. 120 FPS.
      // =========================================================================
      if (p === 0) {
        const qrLeft = centerX - (size * cellSize) / 2;
        const qrTop = (height / 2) - (size * cellSize) / 2;

        // Fondo blanco del QR exactamente centrado
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          qrLeft - margin * cellSize,
          qrTop - margin * cellSize,
          totalSpan * cellSize,
          totalSpan * cellSize
        );

        // Batch 1: Bloques de oro (cuadros planos 2D)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        for (let i = 0; i < blocks.length; i++) {
          const blk = blocks[i];
          if (blk.type === 'gold_bar') {
            ctx.rect(qrLeft + blk.c * cellSize, qrTop + blk.r * cellSize, cellSize, cellSize);
          }
        }
        ctx.fill();

        // Batch 2: Bloques de billetes peruanos
        ctx.fillStyle = billTop;
        ctx.beginPath();
        for (let i = 0; i < blocks.length; i++) {
          const blk = blocks[i];
          if (blk.type === 'bill_stack') {
            ctx.rect(qrLeft + blk.c * cellSize, qrTop + blk.r * cellSize, cellSize, cellSize);
          }
        }
        ctx.fill();

        // Batch 3: Monolitos de las esquinas
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        for (let i = 0; i < blocks.length; i++) {
          const blk = blocks[i];
          if (blk.isFinder) {
            ctx.rect(qrLeft + blk.c * cellSize, qrTop + blk.r * cellSize, cellSize, cellSize);
          }
        }
        ctx.fill();

        const isSettled = Math.abs(zoomDiff) <= 0.001;
        if (isSettled) {
          isLoopRunningRef.current = false;
          return;
        }

        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // =========================================================================
      // CASO 2: TRANSICIÓN 3D <-> 2D O MODO ISOMÉTRICO 3D (0 < p <= 1)
      // =========================================================================
      const isAnimating = animProgressRef.current !== animTargetPRef.current;

      const baseAzimuth = (45 * Math.PI) / 180;
      const userAzimuth = (dragAngleRef.current * Math.PI) / 180;
      const alpha = p * (baseAzimuth + userAzimuth);

      const isoElevation = Math.asin(1 / Math.sqrt(3));
      const topElevation = Math.PI / 2;
      const beta = topElevation - p * (topElevation - isoElevation);

      const cosA = Math.cos(alpha);
      const sinA = Math.sin(alpha);
      const cosB = Math.cos(beta);
      const sinB = Math.sin(beta);

      const px = (x: number, y: number) => centerX + (x * cosA - y * sinA) * scale;
      const py = (x: number, y: number, z: number) =>
        centerY + ((x * sinA + y * cosA) * sinB - z * p * cosB) * scale;

      // 1. Podio base 3D (se dibuja mientras p > 0.08)
      if (p > 0.08) {
        const shDrop = 14 * p;
        ctx.beginPath();
        ctx.moveTo(px(-halfFloor, halfFloor), py(-halfFloor, halfFloor, -slabDepth) + shDrop);
        ctx.lineTo(px(halfFloor, halfFloor), py(halfFloor, halfFloor, -slabDepth) + shDrop);
        ctx.lineTo(px(halfFloor, -halfFloor), py(halfFloor, -halfFloor, -slabDepth) + shDrop);
        ctx.lineTo(px(halfFloor, -halfFloor), py(halfFloor, -halfFloor, 0) + shDrop);
        ctx.lineTo(px(-halfFloor, -halfFloor), py(-halfFloor, -halfFloor, 0) + shDrop);
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 0, 0, ${0.16 * p})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px(halfFloor, -halfFloor), py(halfFloor, -halfFloor, 0));
        ctx.lineTo(px(halfFloor, halfFloor), py(halfFloor, halfFloor, 0));
        ctx.lineTo(px(halfFloor, halfFloor), py(halfFloor, halfFloor, -slabDepth));
        ctx.lineTo(px(halfFloor, -halfFloor), py(halfFloor, -halfFloor, -slabDepth));
        ctx.closePath();
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px(-halfFloor, halfFloor), py(-halfFloor, halfFloor, 0));
        ctx.lineTo(px(halfFloor, halfFloor), py(halfFloor, halfFloor, 0));
        ctx.lineTo(px(halfFloor, halfFloor), py(halfFloor, halfFloor, -slabDepth));
        ctx.lineTo(px(-halfFloor, halfFloor), py(-halfFloor, halfFloor, -slabDepth));
        ctx.closePath();
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
      }

      // 2. Superficie de mármol blanco
      ctx.beginPath();
      ctx.moveTo(px(-halfFloor, -halfFloor), py(-halfFloor, -halfFloor, 0));
      ctx.lineTo(px(halfFloor, -halfFloor), py(halfFloor, -halfFloor, 0));
      ctx.lineTo(px(halfFloor, halfFloor), py(halfFloor, halfFloor, 0));
      ctx.lineTo(px(-halfFloor, halfFloor), py(-halfFloor, halfFloor, 0));
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 3. Renderizado de bloques (Lados 3D solo cuando la elevación lo hace visible p > 0.12)
      const showSides = p > 0.12;

      // Reflejo sereno y pausado que recorre exclusivamente los lingotes de oro (ciclo pausado cada 6.2s)
      const nowSec = performance.now() * 0.001;
      const gleamCycle = 6.2;
      const gleamPhase = nowSec % gleamCycle;
      const sweepDuration = 2.4;
      const isGleaming = p > 0.15 && gleamPhase < sweepDuration;
      const gleamProgress = isGleaming ? gleamPhase / sweepDuration : -1;
      const gleamDiag = isGleaming ? -halfFloor * 1.4 + gleamProgress * (halfFloor * 2.8) : -999;
      const gleamBandWidth = 2.6;

      for (let i = 0; i < blocks.length; i++) {
        const blk = blocks[i];
        const bx = blk.x;
        const by = blk.y;
        const k = blk.stackCount;

        if (blk.isFinder) {
          const w = 0.48;
          const h = blk.height;

          if (showSides) {
            ctx.beginPath();
            ctx.moveTo(px(bx + w, by - w), py(bx + w, by - w, h));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, h));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, 0));
            ctx.lineTo(px(bx + w, by - w), py(bx + w, by - w, 0));
            ctx.closePath();
            ctx.fillStyle = '#161e30';
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(px(bx - w, by + w), py(bx - w, by + w, h));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, h));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, 0));
            ctx.lineTo(px(bx - w, by + w), py(bx - w, by + w, 0));
            ctx.closePath();
            ctx.fillStyle = '#02050b';
            ctx.fill();
          }

          ctx.beginPath();
          ctx.moveTo(px(bx - w, by - w), py(bx - w, by - w, h));
          ctx.lineTo(px(bx + w, by - w), py(bx + w, by - w, h));
          ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, h));
          ctx.lineTo(px(bx - w, by + w), py(bx - w, by + w, h));
          ctx.closePath();
          ctx.fillStyle = '#090d16';
          ctx.fill();

        } else if (blk.type === 'gold_bar') {
          const H_BAR = 0.20;
          const totalH = k * H_BAR;

          const lx0 = (1 - p) * 0.48 + p * 0.46;
          const lx1 = (1 - p) * 0.48 + p * 0.42;
          const wy0 = (1 - p) * 0.48 + p * 0.38;
          const wy1 = (1 - p) * 0.48 + p * 0.24;

          if (showSides) {
            // Cara lateral derecha
            ctx.beginPath();
            ctx.moveTo(px(bx + lx1, by - wy1), py(bx + lx1, by - wy1, totalH));
            ctx.lineTo(px(bx + lx1, by + wy1), py(bx + lx1, by + wy1, totalH));
            ctx.lineTo(px(bx + lx0, by + wy0), py(bx + lx0, by + wy0, 0));
            ctx.lineTo(px(bx + lx0, by - wy0), py(bx + lx0, by - wy0, 0));
            ctx.closePath();
            ctx.fillStyle = '#d97706';
            ctx.fill();

            // Cara frontal
            ctx.beginPath();
            ctx.moveTo(px(bx - lx1, by + wy1), py(bx - lx1, by + wy1, totalH));
            ctx.lineTo(px(bx + lx1, by + wy1), py(bx + lx1, by + wy1, totalH));
            ctx.lineTo(px(bx + lx0, by + wy0), py(bx + lx0, by + wy0, 0));
            ctx.lineTo(px(bx - lx0, by + wy0), py(bx - lx0, by + wy0, 0));
            ctx.closePath();
            ctx.fillStyle = '#92400e';
            ctx.fill();
          }

          // Cara superior
          ctx.beginPath();
          ctx.moveTo(px(bx - lx1, by - wy1), py(bx - lx1, by - wy1, totalH));
          ctx.lineTo(px(bx + lx1, by - wy1), py(bx + lx1, by - wy1, totalH));
          ctx.lineTo(px(bx + lx1, by + wy1), py(bx + lx1, by + wy1, totalH));
          ctx.lineTo(px(bx - lx1, by + wy1), py(bx - lx1, by + wy1, totalH));
          ctx.closePath();
          ctx.fillStyle = '#f59e0b';
          ctx.fill();

          // Reflejo destellante exclusivo de los lingotes de oro (onda suave coseno)
          if (isGleaming) {
            const blkDiag = (bx + by) * 0.707;
            const dist = Math.abs(blkDiag - gleamDiag);
            if (dist < gleamBandWidth) {
              const goldIntensity = 0.5 * (1 + Math.cos((dist / gleamBandWidth) * Math.PI));
              ctx.fillStyle = `rgba(255, 252, 220, ${goldIntensity * 0.65})`;
              ctx.fill();
            }
          }

          // Bisel troquelado en reposo 3D en escritorio
          if (!isMobile && !isAnimating && p > 0.8) {
            const chx = lx1 * 0.75;
            const chy = wy1 * 0.65;
            ctx.beginPath();
            ctx.moveTo(px(bx - chx, by - chy), py(bx - chx, by - chy, totalH));
            ctx.lineTo(px(bx + chx, by - chy), py(bx + chx, by - chy, totalH));
            ctx.lineTo(px(bx + chx, by + chy), py(bx + chx, by + chy, totalH));
            ctx.lineTo(px(bx - chx, by + chy), py(bx - chx, by + chy, totalH));
            ctx.closePath();
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
            ctx.stroke();
          }

        } else {
          // Billetes peruanos
          const H_BILL = 0.20;
          const totalH = k * H_BILL;
          const w = (1 - p) * 0.48 + p * 0.46;

          if (showSides) {
            ctx.beginPath();
            ctx.moveTo(px(bx + w, by - w), py(bx + w, by - w, totalH));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, totalH));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, 0));
            ctx.lineTo(px(bx + w, by - w), py(bx + w, by - w, 0));
            ctx.closePath();
            ctx.fillStyle = billRight;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(px(bx - w, by + w), py(bx - w, by + w, totalH));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, totalH));
            ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, 0));
            ctx.lineTo(px(bx - w, by + w), py(bx - w, by + w, 0));
            ctx.closePath();
            ctx.fillStyle = billLeft;
            ctx.fill();
          }

          // Cara superior
          ctx.beginPath();
          ctx.moveTo(px(bx - w, by - w), py(bx - w, by - w, totalH));
          ctx.lineTo(px(bx + w, by - w), py(bx + w, by - w, totalH));
          ctx.lineTo(px(bx + w, by + w), py(bx + w, by + w, totalH));
          ctx.lineTo(px(bx - w, by + w), py(bx - w, by + w, totalH));
          ctx.closePath();
          ctx.fillStyle = billTop;
          ctx.fill();

          // Banda de seguridad blanca con línea central azul
          if (p > 0.18) {
            const sw = w * 0.22;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(px(bx - sw, by - w), py(bx - sw, by - w, totalH));
            ctx.lineTo(px(bx + sw, by - w), py(bx + sw, by - w, totalH));
            ctx.lineTo(px(bx + sw, by + w), py(bx + sw, by + w, totalH));
            ctx.lineTo(px(bx - sw, by + w), py(bx - sw, by + w, totalH));
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = billStrapBlue;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(px(bx, by - w), py(bx, by - w, totalH));
            ctx.lineTo(px(bx, by + w), py(bx, by + w, totalH));
            ctx.stroke();
          }
        }
      }

      // En modo 2D QR plano (topdown): si la transición terminó y el zoom está quieto, pausamos el bucle para ahorrar 100% de CPU/GPU
      const isSettledTopdown = animProgressRef.current === 0 && animTargetPRef.current === 0 && Math.abs(zoomDiff) <= 0.001;
      if (isSettledTopdown) {
        isLoopRunningRef.current = false;
        return;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    wakeUpRenderRef.current = () => {
      if (!isLoopRunningRef.current) {
        isLoopRunningRef.current = true;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      isLoopRunningRef.current = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [qrData, currentTheme]);

  // Manejadores de arrastre para rotar
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'isometric') return;
    isDraggingRef.current = true;
    dragDistRef.current = 0;
    lastMouseXRef.current = e.clientX;
    wakeUpRenderRef.current();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || viewMode !== 'isometric') return;
    const deltaX = e.clientX - lastMouseXRef.current;
    lastMouseXRef.current = e.clientX;
    dragDistRef.current += Math.abs(deltaX);
    dragAngleRef.current = Math.max(-45, Math.min(45, dragAngleRef.current + deltaX * 0.5));
    wakeUpRenderRef.current();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Soporte táctil completo (1 dedo = rotar en 3D; 2 dedos = pellizco para zoom en 2D y 3D)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (viewMode !== 'isometric') return;
      isDraggingRef.current = true;
      dragDistRef.current = 0;
      lastMouseXRef.current = e.touches[0].clientX;
      wakeUpRenderRef.current();
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      dragDistRef.current = 999; // Evitar que se alterne la vista al soltar los dedos
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      touchStartDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartZoomRef.current = targetZoomRef.current;
      wakeUpRenderRef.current();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current && viewMode === 'isometric') {
      const deltaX = e.touches[0].clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.touches[0].clientX;
      dragDistRef.current += Math.abs(deltaX);
      dragAngleRef.current = Math.max(-45, Math.min(45, dragAngleRef.current + deltaX * 0.5));
      wakeUpRenderRef.current();
    } else if (e.touches.length === 2 && touchStartDistRef.current > 0) {
      // Pellizco para agrandar / alejar con 2 dedos
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = currentDist / touchStartDistRef.current;
      targetZoomRef.current = Math.min(2.5, Math.max(0.7, touchStartZoomRef.current * factor));
      wakeUpRenderRef.current();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
      touchStartDistRef.current = 0;
    } else if (e.touches.length === 1) {
      lastMouseXRef.current = e.touches[0].clientX;
    }
  };

  const toggleViewMode = useCallback(() => {
    if (dragDistRef.current > 6) return; // Si arrastró para rotar o pellizcó, no alternar modo
    if (onToggleViewMode) {
      onToggleViewMode();
    } else {
      setInternalViewMode((prev) => (prev === 'isometric' ? 'topdown' : 'isometric'));
    }
    dragAngleRef.current = 0;
    targetZoomRef.current = 1;
    wakeUpRenderRef.current();
  }, [onToggleViewMode]);

  const handleDoubleClick = () => {
    targetZoomRef.current = 1;
    dragAngleRef.current = 0;
    wakeUpRenderRef.current();
  };

  return (
    <div className={`flex flex-col items-center justify-center select-none w-full ${className}`}>
      {/* Contenedor Flotante Ampliado en 3D con 100% de Protagonismo */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[500px] sm:max-w-[540px] lg:max-w-[580px] aspect-square flex items-center justify-center select-none cursor-grab active:cursor-grabbing overflow-hidden rounded-3xl"
        onDoubleClick={handleDoubleClick}
        onClick={toggleViewMode}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title={viewMode === 'isometric' ? 'Clic o arrastra para rotar • Rueda del ratón para zoom' : 'Clic para ver Bóveda 3D'}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
