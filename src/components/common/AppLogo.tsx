import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  withBackground?: boolean;
}

/**
 * Logotipo oficial 2D vectorial "F" de Finanzas.
 * - Con fondo negro (withBackground = true): Fondo negro puro #000000, barras en azul y franja media blanca.
 * - Sin fondo (en la app): 2 colores con franja media en negro puro (#000000) para fondo blanco y barras en azul oscuro (#1d4ed8).
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 40,
  className = '',
  withBackground = false,
}) => {
  if (withBackground) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        width={size}
        height={size}
        className={className}
      >
        {/* Fondo Negro Puro con bordes redondeados */}
        <rect width="1024" height="1024" rx="220" fill="#000000" />

        {/* Logo 2D Plano Centrado con Margen Amplio (Safe Zone) */}
        <g transform="translate(154, 195) scale(0.65)">
          {/* 1. BARRA SUPERIOR (Azul Corporativo Elegante) */}
          <path
            d="M 236 248 C 236 236 245 228 258 228 L 582 228 C 596 228 610 223 621 214 L 824 103 C 836 96 852 105 852 120 L 852 248 C 852 258 846 268 837 274 L 661 387 C 651 394 639 398 627 398 L 258 398 C 245 398 236 390 236 378 Z"
            fill="#2563eb"
          />

          {/* 2. BARRA MEDIA (Blanco Puro para contraste sobre negro) */}
          <path
            d="M 236 450 C 236 438 245 430 258 430 L 688 430 C 700 430 710 438 713 450 L 633 586 C 629 594 621 600 611 600 L 258 600 C 245 600 236 592 236 580 Z"
            fill="#ffffff"
          />

          {/* 3. BARRA INFERIOR (Azul Corporativo Elegante) */}
          <path
            d="M 236 656 C 236 644 245 636 258 636 L 532 636 C 544 636 554 644 557 656 L 446 838 C 442 846 434 852 424 852 L 258 852 C 245 852 236 844 236 832 Z"
            fill="#2563eb"
          />
        </g>
      </svg>
    );
  }

  // Vista en la app sin contenedor: 2D plano con raya del medio en negro puro para fondo blanco
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="230 100 625 760"
      width={size}
      height={size}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 1. BARRA SUPERIOR (Azul Oscuro) */}
      <path
        d="M 236 248 C 236 236 245 228 258 228 L 582 228 C 596 228 610 223 621 214 L 824 103 C 836 96 852 105 852 120 L 852 248 C 852 258 846 268 837 274 L 661 387 C 651 394 639 398 627 398 L 258 398 C 245 398 236 390 236 378 Z"
        fill="#1d4ed8"
      />

      {/* 2. BARRA MEDIA (Negro Puro para fondo blanco, adaptativo en dark mode) */}
      <path
        d="M 236 450 C 236 438 245 430 258 430 L 688 430 C 700 430 710 438 713 450 L 633 586 C 629 594 621 600 611 600 L 258 600 C 245 600 236 592 236 580 Z"
        className="fill-black dark:fill-white transition-colors"
      />

      {/* 3. BARRA INFERIOR (Azul Oscuro) */}
      <path
        d="M 236 656 C 236 644 245 636 258 636 L 532 636 C 544 636 554 644 557 656 L 446 838 C 442 846 434 852 424 852 L 258 852 C 245 852 236 844 236 832 Z"
        fill="#1d4ed8"
      />
    </svg>
  );
};
