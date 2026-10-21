import React, { useEffect, useRef, useState } from 'react';

export interface BgSettings {
  mode: 'dots' | 'custom_image' | 'aurora' | 'minimal';
  blur: number; // in px: 0 to 30
  opacity: number; // in percentage: 10 to 100
  customImageUrl?: string | null;
}

export const DEFAULT_BG_SETTINGS: BgSettings = {
  mode: 'dots',
  blur: 0,
  opacity: 80,
  customImageUrl: null,
};

export const BG_SETTINGS_STORAGE_KEY = 'app_finanzas_bg_settings_v1';
export const CUSTOM_IMAGE_STORAGE_KEY = 'app_finanzas_custom_bg_img_v1';

export const getStoredBgSettings = (): BgSettings => {
  try {
    const saved = localStorage.getItem(BG_SETTINGS_STORAGE_KEY);
    const savedImg = localStorage.getItem(CUSTOM_IMAGE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_BG_SETTINGS,
        ...parsed,
        customImageUrl: savedImg || parsed.customImageUrl || null,
      };
    } else if (savedImg) {
      return {
        ...DEFAULT_BG_SETTINGS,
        mode: 'custom_image',
        customImageUrl: savedImg,
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_BG_SETTINGS;
};

export const saveStoredBgSettings = (settings: BgSettings) => {
  if (settings.customImageUrl) {
    try {
      localStorage.setItem(CUSTOM_IMAGE_STORAGE_KEY, settings.customImageUrl);
    } catch (e) {
      console.warn('Could not save custom image to localStorage (quota exceeded):', e);
    }
  } else {
    localStorage.removeItem(CUSTOM_IMAGE_STORAGE_KEY);
  }

  const settingsToStore = {
    mode: settings.mode,
    blur: settings.blur,
    opacity: settings.opacity,
    hasCustomImage: !!settings.customImageUrl,
  };
  localStorage.setItem(BG_SETTINGS_STORAGE_KEY, JSON.stringify(settingsToStore));
  window.dispatchEvent(new Event('app:bg-settings-changed'));
};

const MOBILE_BREAKPOINT = 768;
const SPACING = 28;

export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settings, setSettings] = useState<BgSettings>(getStoredBgSettings);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(getStoredBgSettings());
    };
    window.addEventListener('app:bg-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app:bg-settings-changed', handleSettingsChange);
  }, []);

  const hasCustomImage = settings.mode === 'custom_image' && !!settings.customImageUrl;

  useEffect(() => {
    if (hasCustomImage || settings.mode === 'minimal') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let isDesktopRunning = false;

    // Helper: Dibuja los puntos estáticos una sola vez (Cero RAF, 0% CPU en móviles)
    const renderStaticDots = () => {
      const width = (canvas.width = window.innerWidth);
      const height = (canvas.height = window.innerHeight);
      const isDark = document.documentElement.classList.contains('dark');

      ctx.clearRect(0, 0, width, height);

      const cols = Math.floor(width / SPACING) + 2;
      const rows = Math.floor(height / SPACING) + 2;
      const offsetX = (width - cols * SPACING) / 2;
      const offsetY = (height - rows * SPACING) / 2;

      const baseAlpha = (isDark ? 0.28 : 0.65) * 0.96;
      const baseRadius = isDark ? 1.25 : 1.45;
      ctx.fillStyle = isDark ? `rgba(161, 161, 170, ${baseAlpha})` : `rgba(100, 116, 139, ${baseAlpha})`;

      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        const y = offsetY + r * SPACING;
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * SPACING;
          ctx.moveTo(x + baseRadius, y);
          ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    };

    // --- MODO ESCRITORIO INTERACTIVO (Física de cursor y brillo dinámico) ---
    interface Dot {
      ox: number;
      oy: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      active: boolean;
    }

    let dots: Dot[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 130,
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const initDots = () => {
      dots = [];
      const cols = Math.floor(width / SPACING) + 2;
      const rows = Math.floor(height / SPACING) + 2;
      const offsetX = (width - cols * SPACING) / 2;
      const offsetY = (height - rows * SPACING) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ox = offsetX + c * SPACING;
          const oy = offsetY + r * SPACING;
          dots.push({
            ox,
            oy,
            x: ox,
            y: oy,
            vx: 0,
            vy: 0,
            active: false,
          });
        }
      }
    };

    const renderDesktop = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(renderDesktop);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const maxDist = mouse.radius;
      const maxDistSq = maxDist * maxDist;
      const opacityMultiplier = 0.96;
      const isDark = document.documentElement.classList.contains('dark');

      // Resplandor radial suave en tiempo real bajo el cursor
      if (mouse.x > -500) {
        const mouseGlow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, maxDist * 1.4);
        mouseGlow.addColorStop(0, `rgba(16, 185, 129, ${0.15 * opacityMultiplier})`);
        mouseGlow.addColorStop(0.5, `rgba(99, 102, 241, ${0.07 * opacityMultiplier})`);
        mouseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = mouseGlow;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, maxDist * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      const baseAlpha = (isDark ? 0.28 : 0.65) * opacityMultiplier;
      const baseRadius = isDark ? 1.25 : 1.45;
      const baseFillStyle = isDark ? `rgba(161, 161, 170, ${baseAlpha})` : `rgba(100, 116, 139, ${baseAlpha})`;

      // Renderizado de puntos en un solo batch ultra rápido (< 0.1ms por fotograma)
      ctx.beginPath();
      ctx.fillStyle = baseFillStyle;

      const nearDots: { x: number; y: number; radius: number; fillStyle: string }[] = [];

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const dx = mouse.x - d.x;
        const dy = mouse.y - d.y;
        const distSq = dx * dx + dy * dy;

        let isNear = false;
        let dist = 9999;

        if (distSq < maxDistSq) {
          dist = Math.sqrt(distSq);
          isNear = true;
          d.active = true;
          const force = (1 - dist / maxDist) * 14;
          const angle = Math.atan2(dy, dx);
          d.vx -= Math.cos(angle) * force * 0.28;
          d.vy -= Math.sin(angle) * force * 0.28;
        }

        if (d.active) {
          d.vx += (d.ox - d.x) * 0.12;
          d.vy += (d.oy - d.y) * 0.12;
          d.vx *= 0.72;
          d.vy *= 0.72;

          if (Math.abs(d.vx) < 0.01 && Math.abs(d.vy) < 0.01 && !isNear) {
            d.vx = 0;
            d.vy = 0;
            d.x = d.ox;
            d.y = d.oy;
            d.active = false;
          } else {
            d.x += d.vx;
            d.y += d.vy;
          }
        }

        if (isNear) {
          const proximity = 1 - dist / maxDist;
          const alpha = (0.35 + proximity * 0.65) * opacityMultiplier;
          const radius = baseRadius + proximity * 1.6;
          const fillStyle = proximity > 0.55
            ? (isDark ? `rgba(52, 211, 153, ${alpha})` : `rgba(16, 185, 129, ${alpha})`)
            : (isDark ? `rgba(129, 140, 248, ${alpha})` : `rgba(99, 102, 241, ${alpha})`);
          nearDots.push({ x: d.x, y: d.y, radius, fillStyle });
        } else {
          ctx.moveTo(d.x + baseRadius, d.y);
          ctx.arc(d.x, d.y, baseRadius, 0, Math.PI * 2);
        }
      }
      ctx.fill();

      // Dibujar los pocos puntos activos cerca del cursor
      for (let i = 0; i < nearDots.length; i++) {
        const nd = nearDots[i];
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.radius, 0, Math.PI * 2);
        ctx.fillStyle = nd.fillStyle;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(renderDesktop);
    };

    const startDesktopMode = () => {
      if (isDesktopRunning) return;
      isDesktopRunning = true;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
      initDots();
      renderDesktop();
    };

    const stopDesktopMode = () => {
      if (!isDesktopRunning) return;
      isDesktopRunning = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };

    const updateMode = () => {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        stopDesktopMode();
        renderStaticDots();
      } else {
        startDesktopMode();
      }
    };

    // Iniciar según resolución actual
    updateMode();

    const handleResize = () => {
      updateMode();
      if (window.innerWidth >= MOBILE_BREAKPOINT && isDesktopRunning) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initDots();
      }
    };

    window.addEventListener('resize', handleResize);

    // Observar cambios de tema (dark/light) para redibujar en móvil instantáneamente sin bucle continuo
    const themeObserver = new MutationObserver(() => {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        renderStaticDots();
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      stopDesktopMode();
      window.removeEventListener('resize', handleResize);
      themeObserver.disconnect();
    };
  }, [hasCustomImage, settings.mode]);

  // 1. Custom Background Image Layer
  if (hasCustomImage && settings.customImageUrl) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-[filter,opacity] duration-300"
          style={{
            backgroundImage: `url(${settings.customImageUrl})`,
            filter: settings.blur > 0 ? `blur(${settings.blur}px)` : 'none',
            opacity: settings.opacity / 100,
            transform: settings.blur > 0 ? 'scale(1.08)' : 'scale(1)',
          }}
        />
        <div className="absolute inset-0 bg-white/75 dark:bg-black/45 transition-colors duration-300" />
      </div>
    );
  }

  if (settings.mode === 'minimal') return null;

  // 2. Interactive Canvas Dot Matrix
  return (
    <canvas
      ref={canvasRef}
      style={{
        filter: 'none',
        opacity: 1.0,
      }}
      className="fixed inset-0 pointer-events-none z-0 select-none"
    />
  );
};
