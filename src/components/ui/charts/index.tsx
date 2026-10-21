import React, { createContext, useContext, useState, useId } from 'react';
import { motion } from 'framer-motion';

// --- TYPES ---
export interface ChartDataPoint {
  [key: string]: any;
}

export interface GradientStop {
  offset: number;
  color: string;
}

export interface LegendItemData {
  label: string;
  value: number;
  maxValue?: number;
  color: string;
}

// --- CONTEXT ---
interface ChartContextValue {
  data: ChartDataPoint[];
  xDataKey: string;
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  hoveredPoint: { x: number; y: number; payload: ChartDataPoint } | null;
  setHoveredPoint: (point: { x: number; y: number; payload: ChartDataPoint } | null) => void;
  activeSeries: string | null;
  setActiveSeries: (s: string | null) => void;
  squareSnap?: { squareGap?: number; groupGap?: number };
}

const ChartContext = createContext<ChartContextValue | null>(null);

function useChart() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('Chart subcomponents must be used within a Chart component');
  return ctx;
}

// --- UTILITIES ---
export interface BuildProjectionOptions {
  sourceData: any[];
  seriesKey: string;
  mode?: 'target' | 'trend' | 'regression';
  pathDensity?: 'endpoints' | 'smooth';
  horizonPoints?: number;
  endValue?: number;
}

export function buildProjectionPath({
  sourceData,
  seriesKey,
  mode = 'target',
  horizonPoints = 6,
  endValue = 300,
}: BuildProjectionOptions) {
  if (!sourceData || sourceData.length === 0) return [];
  const lastIndex = sourceData.length - 1;
  const lastItem = sourceData[lastIndex];
  const startVal = Number(lastItem?.[seriesKey] ?? 0);
  const targetVal =
    mode === 'trend'
      ? startVal * 1.2
      : endValue !== undefined
      ? endValue
      : startVal * 1.25;

  const result: any[] = [];
  // Include anchor point
  result.push({
    ...lastItem,
    [seriesKey]: startVal,
    isAnchor: true,
  });

  for (let i = 1; i <= horizonPoints; i++) {
    const t = i / horizonPoints;
    // Cubic bezier or ease-in-out easing for projection curve
    const easeT = t * t * (3 - 2 * t);
    const projectedVal = startVal + (targetVal - startVal) * easeT;
    result.push({
      [seriesKey]: Math.round(projectedVal * 10) / 10,
      month: `+${i}m`,
      day: `+${i}d`,
      projected: true,
      isEnd: i === horizonPoints,
    });
  }

  return result;
}

// --- GRID ---
export interface GridProps {
  horizontal?: boolean;
  vertical?: boolean;
  strokeDasharray?: string;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  horizontal = true,
  vertical = false,
  strokeDasharray = '3 3',
  className = '',
}) => {
  const { width, height, padding } = useChart();
  const innerW = Math.max(10, width - padding.left - padding.right);
  const innerH = Math.max(10, height - padding.top - padding.bottom);

  const horizontalLines = 4;
  const lines = [];

  if (horizontal) {
    for (let i = 0; i <= horizontalLines; i++) {
      const y = padding.top + (innerH / horizontalLines) * i;
      lines.push(
        <line
          key={`h-${i}`}
          x1={padding.left}
          y1={y}
          x2={padding.left + innerW}
          y2={y}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeDasharray={strokeDasharray}
          className={className}
        />
      );
    }
  }

  if (vertical) {
    const verticalLines = 5;
    for (let i = 0; i <= verticalLines; i++) {
      const x = padding.left + (innerW / verticalLines) * i;
      lines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={padding.top}
          x2={x}
          y2={padding.top + innerH}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeDasharray={strokeDasharray}
          className={className}
        />
      );
    }
  }

  return <g className="chart-grid pointer-events-none">{lines}</g>;
};

// --- X AXIS ---
export interface XAxisProps {
  className?: string;
  tickFormatter?: (val: any) => string;
}

export const XAxis: React.FC<XAxisProps> = ({ className = '', tickFormatter }) => {
  const { data, xDataKey, width, height, padding } = useChart();
  const innerW = Math.max(10, width - padding.left - padding.right);
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const y = height - padding.bottom + 16;

  return (
    <g className={`chart-x-axis select-none ${className}`}>
      {data.map((item, i) => {
        const x = padding.left + (data.length === 1 ? innerW / 2 : i * step);
        const raw = item[xDataKey] ?? i;
        const text = tickFormatter ? tickFormatter(raw) : String(raw);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono font-medium"
          >
            {text}
          </text>
        );
      })}
    </g>
  );
};

export const BarXAxis: React.FC<XAxisProps> = ({ className = '', tickFormatter }) => {
  const { data, xDataKey, width, height, padding } = useChart();
  const innerW = Math.max(10, width - padding.left - padding.right);
  const groupW = data.length > 0 ? innerW / data.length : innerW;
  const y = height - padding.bottom + 18;

  return (
    <g className={`chart-bar-x-axis select-none ${className}`}>
      {data.map((item, i) => {
        const x = padding.left + i * groupW + groupW / 2;
        const raw = item[xDataKey] ?? i;
        const text = tickFormatter ? tickFormatter(raw) : String(raw);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono font-medium"
          >
            {text}
          </text>
        );
      })}
    </g>
  );
};

// --- TOOLTIP ---
export interface ChartTooltipProps {
  showCrosshair?: boolean;
  dotVariant?: 'ring' | 'dot';
  dotScale?: number;
  formatter?: (val: any, key: string, payload: any) => React.ReactNode;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  showCrosshair = true,
  dotVariant = 'ring',
  dotScale = 1.05,
}) => {
  const { hoveredPoint, height, padding } = useChart();
  if (!hoveredPoint) return null;

  const { x, y, payload } = hoveredPoint;

  return (
    <g className="chart-tooltip-group pointer-events-none">
      {showCrosshair && (
        <line
          x1={x}
          y1={padding.top}
          x2={x}
          y2={height - padding.bottom}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeDasharray="2 2"
          strokeWidth={1}
        />
      )}

      {/* Target Marker */}
      <circle
        cx={x}
        cy={y}
        r={dotVariant === 'ring' ? 6 * dotScale : 4 * dotScale}
        fill="currentColor"
        stroke="#ffffff"
        strokeWidth={2}
        className="text-emerald-500 drop-shadow-md"
      />

      {/* Tooltip Content Badge */}
      <foreignObject
        x={Math.min(Math.max(x - 65, 10), 300)}
        y={Math.max(y - 58, 8)}
        width={130}
        height={50}
        className="overflow-visible"
      >
        <div className="bg-zinc-950/95 dark:bg-white/95 text-white dark:text-zinc-950 rounded-xl px-2.5 py-1.5 shadow-xl border border-white/20 dark:border-zinc-300 text-[10px] text-center backdrop-blur-md">
          <div className="font-mono font-bold truncate">
            {Object.entries(payload)
              .filter(([k]) => k !== 'month' && k !== 'isAnchor' && k !== 'projected' && k !== 'isEnd')
              .slice(0, 2)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-1.5">
                  <span className="opacity-70 capitalize">{k}:</span>
                  <span className="font-mono font-black">{typeof v === 'number' ? `S/. ${v.toFixed(0)}` : String(v)}</span>
                </div>
              ))}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

// --- BAR CHART & COMPONENTS ---
export interface BarChartProps {
  data: ChartDataPoint[];
  xDataKey?: string;
  squareSnap?: { squareGap?: number; groupGap?: number };
  height?: number;
  className?: string;
  children: React.ReactNode;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xDataKey = 'month',
  squareSnap,
  height = 260,
  className = '',
  children,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; payload: ChartDataPoint } | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const id = useId();

  const width = 500; // SVG viewBox coordinates
  const padding = { top: 20, right: 20, bottom: 35, left: 20 };

  return (
    <ChartContext.Provider
      value={{
        data,
        xDataKey,
        width,
        height,
        padding,
        hoveredIndex,
        setHoveredIndex,
        hoveredPoint,
        setHoveredPoint,
        activeSeries,
        setActiveSeries,
        squareSnap,
      }}
    >
      <div className={`relative w-full ${className}`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => {
            setHoveredIndex(null);
            setHoveredPoint(null);
          }}
        >
          <defs>
            {/* Pattern preset for desktop */}
            <pattern
              id="desktop-pattern"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-line-primary, #34d399)" strokeWidth="2" />
            </pattern>
            {/* Default gradient */}
            <linearGradient id={`bar-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1, #0ea5e9)" />
              <stop offset="100%" stopColor="var(--chart-5, #34d399)" />
            </linearGradient>
          </defs>
          {children}
        </svg>
      </div>
    </ChartContext.Provider>
  );
};

export interface BarProps {
  dataKey: string;
  fill?: string;
  lineCap?: 'round' | 'square';
  className?: string;
}

export const Bar: React.FC<BarProps> = ({
  dataKey,
  fill = 'var(--chart-line-primary, #34d399)',
  lineCap = 'round',
  className = '',
}) => {
  const { data, width, height, padding, setHoveredIndex, setHoveredPoint } = useChart();
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const barSlotW = innerW / (data.length || 1);
  const barW = Math.min(32, barSlotW * 0.55);

  return (
    <g className={`chart-bars ${className}`}>
      {data.map((d, i) => {
        const val = Number(d[dataKey] ?? 0);
        const h = (val / maxVal) * innerH;
        const x = padding.left + i * barSlotW + (barSlotW - barW) / 2;
        const y = padding.top + innerH - h;

        return (
          <motion.rect
            key={i}
            initial={{ height: 0, y: padding.top + innerH }}
            animate={{ height: h, y }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
            x={x}
            y={y}
            width={barW}
            height={h}
            fill={fill}
            rx={lineCap === 'round' ? Math.min(6, barW / 2) : 0}
            className="cursor-pointer transition-opacity hover:opacity-85"
            onMouseEnter={() => {
              setHoveredIndex(i);
              setHoveredPoint({ x: x + barW / 2, y, payload: d });
            }}
          />
        );
      })}
    </g>
  );
};

export interface BarSquaresProps {
  dataKey: string;
  fill?: string;
  stroke?: string;
  squareGap?: number;
  groupGap?: number;
  useGradient?: boolean;
  gradientStops?: GradientStop[];
  className?: string;
}

export const BarSquares: React.FC<BarSquaresProps> = ({
  dataKey,
  fill = 'var(--chart-1, #0ea5e9)',
  stroke,
  squareGap = 3,
  useGradient = false,
  gradientStops,
  className = '',
}) => {
  const { data, width, height, padding, setHoveredIndex, setHoveredPoint, squareSnap } = useChart();
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const gap = squareSnap?.squareGap ?? squareGap;
  const maxVal = Math.max(1, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const groupW = innerW / (data.length || 1);
  const barW = Math.min(26, groupW * 0.65);
  const squareSize = barW;
  const totalSquaresMax = Math.max(4, Math.floor(innerH / (squareSize + gap)));

  const id = useId();

  return (
    <g className={`chart-bar-squares ${className}`}>
      {useGradient && gradientStops && (
        <defs>
          <linearGradient id={`squares-grad-${id}-${dataKey}`} x1="0" y1="1" x2="0" y2="0">
            {gradientStops.map((s, idx) => (
              <stop key={idx} offset={`${s.offset}%`} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
      )}

      {data.map((d, i) => {
        const val = Number(d[dataKey] ?? 0);
        const ratio = Math.max(0, Math.min(1, val / maxVal));
        const squareCount = Math.round(ratio * totalSquaresMax);
        const groupX = padding.left + i * groupW + (groupW - barW) / 2;

        const fillStyle = useGradient && gradientStops ? `url(#squares-grad-${id}-${dataKey})` : fill;

        return (
          <g
            key={i}
            className="cursor-pointer"
            onMouseEnter={() => {
              const topY = padding.top + innerH - squareCount * (squareSize + gap);
              setHoveredIndex(i);
              setHoveredPoint({ x: groupX + barW / 2, y: topY, payload: d });
            }}
          >
            {Array.from({ length: squareCount }).map((_, sqIdx) => {
              const sqY = padding.top + innerH - (sqIdx + 1) * (squareSize + gap);
              return (
                <motion.rect
                  key={sqIdx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.03 + sqIdx * 0.02 }}
                  x={groupX}
                  y={sqY}
                  width={barW}
                  height={squareSize}
                  rx={2.5}
                  fill={fillStyle}
                  stroke={stroke}
                  strokeWidth={stroke ? 1 : 0}
                  className="transition-transform hover:scale-105"
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
};

// --- LINE CHART & COMPONENTS ---
export interface LineChartProps {
  data: ChartDataPoint[];
  xDataKey?: string;
  height?: number;
  className?: string;
  children: React.ReactNode;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xDataKey = 'day',
  height = 240,
  className = '',
  children,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; payload: ChartDataPoint } | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  const width = 500;
  const padding = { top: 20, right: 25, bottom: 35, left: 25 };

  return (
    <ChartContext.Provider
      value={{
        data,
        xDataKey,
        width,
        height,
        padding,
        hoveredIndex,
        setHoveredIndex,
        hoveredPoint,
        setHoveredPoint,
        activeSeries,
        setActiveSeries,
      }}
    >
      <div className={`relative w-full ${className}`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => {
            setHoveredIndex(null);
            setHoveredPoint(null);
          }}
        >
          {children}
        </svg>
      </div>
    </ChartContext.Provider>
  );
};

export interface LineProps {
  dataKey: string;
  strokeWidth?: number;
  stroke?: string;
  dualColor?: boolean;
  hasProjection?: boolean;
  className?: string;
}

export const Line: React.FC<LineProps> = ({
  dataKey,
  strokeWidth = 2.5,
  stroke = 'var(--chart-line-primary, #34d399)',
  dualColor = false,
  hasProjection = false,
  className = '',
}) => {
  const { data, width, height, padding, setHoveredPoint } = useChart();
  const availableW = width - padding.left - padding.right;
  const innerW = hasProjection ? availableW * 0.75 : availableW;
  const innerH = height - padding.top - padding.bottom;

  const minVal = Math.min(0, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const maxVal = Math.max(10, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const val = Number(d[dataKey] ?? 0);
    const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
    const rawY = padding.top + innerH - ((val - minVal) / range) * innerH;
    const y = Math.max(padding.top + 4, Math.min(padding.top + innerH - 4, rawY));
    return { x, y, val, payload: d };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

  return (
    <g className={`chart-line ${className}`}>
      {dualColor ? (
        // Segmented line with Green for Gain/Surplus and Red for Loss/Deficit
        points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          // If net is provided on payload, use it; otherwise check if value increased or decreased
          const isGain = p.payload.net !== undefined ? p.payload.net >= 0 : p.val >= prev.val;
          const segStroke = isGain ? '#34d399' : '#fb7185';

          return (
            <line
              key={`seg-${i}`}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke={segStroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })
      ) : (
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          d={pathD}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}

      {/* Markers per day */}
      {points.map((p, i) => {
        const isGain = p.payload.net !== undefined ? p.payload.net >= 0 : true;
        const dotColor = dualColor ? (isGain ? '#34d399' : '#fb7185') : stroke;
        const isPeak = p.payload.isPeak;

        return (
          <g
            key={`dot-${i}`}
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint({ x: p.x, y: p.y, payload: p.payload })}
          >
            {isPeak && (
              <circle
                cx={p.x}
                cy={p.y}
                r={8}
                className="fill-rose-500/20 stroke-[#fb7185] animate-pulse"
                strokeWidth={2}
              />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isPeak ? 5 : 3.5}
              fill={dotColor}
              stroke="#ffffff"
              strokeWidth={1.5}
              className="hover:scale-125 transition-transform"
            />
          </g>
        );
      })}
    </g>
  );
};

export const LineSeriesTerminalMarker: React.FC<{ dataKey: string; color?: string; hasProjection?: boolean }> = ({
  dataKey,
  color = '#34d399',
  hasProjection = false,
}) => {
  const { data, width, height, padding } = useChart();
  if (data.length === 0) return null;

  const availableW = width - padding.left - padding.right;
  const innerW = hasProjection ? availableW * 0.75 : availableW;
  const innerH = height - padding.top - padding.bottom;

  const minVal = Math.min(0, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const maxVal = Math.max(10, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const range = maxVal - minVal || 1;

  const lastIndex = data.length - 1;
  const last = data[lastIndex];
  const lastVal = Number(last[dataKey] ?? 0);
  const x = padding.left + innerW;
  const rawY = padding.top + innerH - ((lastVal - minVal) / range) * innerH;
  const y = Math.max(padding.top + 4, Math.min(padding.top + innerH - 4, rawY));

  return (
    <g className="chart-terminal-marker">
      <circle cx={x} cy={y} r={9} fill={color} fillOpacity={0.2} className="animate-ping" />
      <circle cx={x} cy={y} r={5} fill={color} stroke="#ffffff" strokeWidth={2} />
    </g>
  );
};

export interface ProjectionLineProps {
  data: any[];
  strokeDasharray?: string;
  curveKind?: 'bezier' | 'linear';
  strokeStyle?: 'gradient' | 'solid';
  gradientStart?: string;
  gradientEnd?: string;
  showEndMarker?: boolean;
}

export const ProjectionLine: React.FC<ProjectionLineProps> = ({
  data,
  strokeDasharray = '2,4',
  strokeStyle = 'gradient',
  gradientStart = 'oklch(0.979 0.037 110.273)',
  gradientEnd = 'oklch(0.59 0.17 166.38)',
  showEndMarker = true,
}) => {
  const { width, height, padding, data: baseData } = useChart();
  if (!data || data.length === 0) return null;

  const id = useId();
  const availableW = width - padding.left - padding.right;
  const baseW = availableW * 0.75;
  const projW = availableW * 0.25;
  const innerH = height - padding.top - padding.bottom;

  const allVals = [
    ...baseData.map((d) => Number(d.value ?? d.desktop ?? 0)),
    ...data.map((d) => Number(d.value ?? d.desktop ?? 0)),
  ];
  const minVal = Math.min(0, ...allVals);
  const maxVal = Math.max(10, ...allVals);
  const range = maxVal - minVal || 1;

  // Projection connects from end of base data to right edge
  const startX = padding.left + baseW;
  const stepX = projW / Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const val = Number(d.value ?? d.desktop ?? 0);
    const x = Math.min(width - padding.right, startX + i * stepX);
    const rawY = padding.top + innerH - ((val - minVal) / range) * innerH;
    const y = Math.max(padding.top + 4, Math.min(padding.top + innerH - 4, rawY));
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

  const lastP = points[points.length - 1];

  return (
    <g className="chart-projection">
      {strokeStyle === 'gradient' && (
        <defs>
          <linearGradient id={`proj-grad-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>
      )}
      <path
        d={pathD}
        fill="none"
        stroke={strokeStyle === 'gradient' ? `url(#proj-grad-${id})` : gradientEnd}
        strokeWidth={2}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
      />
      {showEndMarker && lastP && (
        <g>
          <circle cx={lastP.x} cy={lastP.y} r={4.5} fill={gradientEnd} stroke="#ffffff" strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
};

// --- AREA CHART ---
export interface AreaChartProps {
  data: ChartDataPoint[];
  xDataKey?: string;
  height?: number;
  className?: string;
  children: React.ReactNode;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  xDataKey = 'day',
  height = 240,
  className = '',
  children,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; payload: ChartDataPoint } | null>(null);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  const width = 500;
  const padding = { top: 20, right: 25, bottom: 35, left: 25 };

  return (
    <ChartContext.Provider
      value={{
        data,
        xDataKey,
        width,
        height,
        padding,
        hoveredIndex,
        setHoveredIndex,
        hoveredPoint,
        setHoveredPoint,
        activeSeries,
        setActiveSeries,
      }}
    >
      <div className={`relative w-full ${className}`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => {
            setHoveredIndex(null);
            setHoveredPoint(null);
          }}
        >
          {children}
        </svg>
      </div>
    </ChartContext.Provider>
  );
};

export interface AreaProps {
  dataKey: string;
  fillOpacity?: number;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}

export const Area: React.FC<AreaProps> = ({
  dataKey,
  fillOpacity = 0.3,
  strokeWidth = 2,
  fill = 'var(--chart-line-primary, #34d399)',
  className = '',
}) => {
  const { data, width, height, padding, setHoveredPoint } = useChart();
  const id = useId();
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const minVal = Math.min(0, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const maxVal = Math.max(10, ...data.map((d) => Number(d[dataKey] ?? 0)));
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const val = Number(d[dataKey] ?? 0);
    const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
    const y = padding.top + innerH - ((val - minVal) / range) * innerH;
    return { x, y, val, payload: d };
  });

  const lineD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = prev.x + (p.x - prev.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const baseY = padding.top + innerH;
  const areaD = `${lineD} L ${points[points.length - 1]?.x ?? innerW} ${baseY} L ${points[0]?.x ?? 0} ${baseY} Z`;

  return (
    <g className={`chart-area ${className}`}>
      <defs>
        <linearGradient id={`area-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        d={areaD}
        fill={`url(#area-grad-${id})`}
      />
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
        d={lineD}
        fill="none"
        stroke={fill}
        strokeWidth={strokeWidth}
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={1}
          className="cursor-pointer"
          onMouseEnter={() => setHoveredPoint({ x: p.x, y: p.y, payload: p.payload })}
        />
      ))}
    </g>
  );
};

// --- PIE CHART & PIE SLICE ---
interface PieContextValue {
  data: Array<{ label: string; value: number; color?: string }>;
  total: number;
  size: number;
  strokeWidth: number;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
}

const PieContext = createContext<PieContextValue | null>(null);

export interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children: React.ReactNode;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 280,
  strokeWidth: propStrokeWidth,
  className = '',
  children,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = Math.max(1, data.reduce((acc, cur) => acc + (Number(cur.value) || 0), 0));
  const strokeWidth = propStrokeWidth ?? Math.max(14, Math.round(size * 0.105));

  return (
    <PieContext.Provider value={{ data, total, size, strokeWidth, hoveredIndex, setHoveredIndex }}>
      <div className={`relative flex items-center justify-center select-none ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible -rotate-90"
        >
          {children}
        </svg>
      </div>
    </PieContext.Provider>
  );
};

export interface PieSliceProps {
  index: number;
  strokeWidth?: number;
  className?: string;
}

export const PieSlice: React.FC<PieSliceProps> = ({ index, strokeWidth: sliceStrokeWidth, className = '' }) => {
  const ctx = useContext(PieContext);
  if (!ctx) throw new Error('PieSlice must be used within PieChart');

  const { data, total, size, strokeWidth: ctxStrokeWidth, hoveredIndex, setHoveredIndex } = ctx;
  const item = data[index];
  if (!item) return null;

  const currentStrokeWidth = sliceStrokeWidth ?? ctxStrokeWidth;
  const radius = (size - currentStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate start offset
  let precedingSum = 0;
  for (let i = 0; i < index; i++) {
    precedingSum += Number(data[i].value) || 0;
  }

  const sliceLength = ((Number(item.value) || 0) / total) * circumference;
  const offset = -(precedingSum / total) * circumference;
  const isHovered = hoveredIndex === index;

  const defaultColors = ['#0ea5e9', '#a855f7', '#f59e0b', '#34d399', '#fb7185'];
  const sliceColor = item.color || defaultColors[index % defaultColors.length];

  return (
    <motion.circle
      initial={{ strokeDasharray: `0 ${circumference}` }}
      animate={{ strokeDasharray: `${sliceLength} ${circumference}` }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: 'easeOut' }}
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="transparent"
      stroke={sliceColor}
      strokeWidth={isHovered ? currentStrokeWidth + 4 : currentStrokeWidth}
      strokeDashoffset={offset}
      className={`cursor-pointer transition-all duration-200 ${className}`}
      onMouseEnter={() => setHoveredIndex(index)}
      onMouseLeave={() => setHoveredIndex(null)}
    />
  );
};

// --- LEGENDS ---
interface LegendContextValue {
  items: LegendItemData[];
  title?: string;
}

const LegendContext = createContext<LegendContextValue | null>(null);

export interface LegendProps {
  items: LegendItemData[];
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export const Legend: React.FC<LegendProps> = ({ items, title, className = '', children }) => {
  return (
    <LegendContext.Provider value={{ items, title }}>
      <div className={`space-y-2.5 ${className}`}>
        {title && (
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </h4>
        )}
        <div className="space-y-2">{children}</div>
      </div>
    </LegendContext.Provider>
  );
};

interface LegendItemContextValue {
  item: LegendItemData;
  index: number;
}

const LegendItemContext = createContext<LegendItemContextValue | null>(null);

export const LegendItemComponent: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const ctx = useContext(LegendContext);
  if (!ctx) throw new Error('LegendItemComponent must be inside Legend');

  return (
    <div className={`space-y-2 ${className}`}>
      {ctx.items.map((item, idx) => (
        <LegendItemContext.Provider key={idx} value={{ item, index: idx }}>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
            {children ? (
              children
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                    S/. {item.value.toLocaleString('es-PE')}
                  </span>
                </div>
              </>
            )}
          </div>
        </LegendItemContext.Provider>
      ))}
    </div>
  );
};

export const LegendMarker: React.FC<{ color?: string }> = ({ color }) => {
  const itemCtx = useContext(LegendItemContext);
  const c = color || itemCtx?.item.color || '#34d399';
  return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />;
};

export const LegendLabel: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const itemCtx = useContext(LegendItemContext);
  return (
    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
      {children ?? itemCtx?.item.label}
    </span>
  );
};

export const LegendValue: React.FC<{ value?: number }> = ({ value }) => {
  const itemCtx = useContext(LegendItemContext);
  const v = value !== undefined ? value : itemCtx?.item.value;
  return (
    <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
      {v !== undefined ? `S/. ${v.toLocaleString('es-PE')}` : null}
    </span>
  );
};
