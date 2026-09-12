import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  withBackground?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 40,
  className = '',
  withBackground = false,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <filter id="appLogoDropShadow" x="-15%" y="-15%" width="130%" height="135%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#000000" floodOpacity="0.65" />
        </filter>

        <linearGradient id="appLogoTopBlue" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#8bcbf2" />
          <stop offset="25%" stopColor="#65a4cf" />
          <stop offset="65%" stopColor="#4e88b2" />
          <stop offset="100%" stopColor="#315f83" />
        </linearGradient>

        <linearGradient id="appLogoMidWhite" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f8fafc" />
          <stop offset="75%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>

        <linearGradient id="appLogoBotBlue" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#79bce4" />
          <stop offset="35%" stopColor="#5692bc" />
          <stop offset="75%" stopColor="#427a9f" />
          <stop offset="100%" stopColor="#2a5374" />
        </linearGradient>

        <linearGradient id="appLogoBevelLight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {withBackground && (
        <>
          <rect width="1024" height="1024" rx="230" fill="#0c0d12" />
          <rect
            x="3"
            y="3"
            width="1018"
            height="1018"
            rx="227"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
        </>
      )}

      <g filter="url(#appLogoDropShadow)">
        {/* 1. BARRA SUPERIOR */}
        <g>
          <path
            d="M 236 248 C 236 236 245 228 258 228 L 582 228 C 596 228 610 223 621 214 L 824 103 C 836 96 852 105 852 120 L 852 248 C 852 258 846 268 837 274 L 661 387 C 651 394 639 398 627 398 L 258 398 C 245 398 236 390 236 378 Z"
            fill="#1e3e57"
            transform="translate(0, 10)"
          />
          <path
            d="M 236 248 C 236 236 245 228 258 228 L 582 228 C 596 228 610 223 621 214 L 824 103 C 836 96 852 105 852 120 L 852 248 C 852 258 846 268 837 274 L 661 387 C 651 394 639 398 627 398 L 258 398 C 245 398 236 390 236 378 Z"
            fill="url(#appLogoTopBlue)"
            stroke="url(#appLogoBevelLight)"
            strokeWidth="7"
          />
          <path
            d="M 246 244 C 246 238 250 235 258 235 L 582 235 C 594 235 606 230 615 223 L 822 110"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>

        {/* 2. BARRA MEDIA */}
        <g>
          <path
            d="M 236 450 C 236 438 245 430 258 430 L 688 430 C 700 430 710 438 713 450 L 633 586 C 629 594 621 600 611 600 L 258 600 C 245 600 236 592 236 580 Z"
            fill="#8a919e"
            transform="translate(0, 10)"
          />
          <path
            d="M 236 450 C 236 438 245 430 258 430 L 688 430 C 700 430 710 438 713 450 L 633 586 C 629 594 621 600 611 600 L 258 600 C 245 600 236 592 236 580 Z"
            fill="url(#appLogoMidWhite)"
            stroke="url(#appLogoBevelLight)"
            strokeWidth="7"
          />
          <path
            d="M 248 438 L 686 438"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>

        {/* 3. BARRA INFERIOR */}
        <g>
          <path
            d="M 236 656 C 236 644 245 636 258 636 L 532 636 C 544 636 554 644 557 656 L 446 838 C 442 846 434 852 424 852 L 258 852 C 245 852 236 844 236 832 Z"
            fill="#1a374e"
            transform="translate(0, 10)"
          />
          <path
            d="M 236 656 C 236 644 245 636 258 636 L 532 636 C 544 636 554 644 557 656 L 446 838 C 442 846 434 852 424 852 L 258 852 C 245 852 236 844 236 832 Z"
            fill="url(#appLogoBotBlue)"
            stroke="url(#appLogoBevelLight)"
            strokeWidth="7"
          />
          <path
            d="M 248 644 L 530 644"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>
      </g>
    </svg>
  );
};
