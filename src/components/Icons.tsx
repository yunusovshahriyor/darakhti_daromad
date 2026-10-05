import type { ReactNode } from 'react';

const Svg = ({ children, size = 24 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const HomeIcon = () => (
  <Svg><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></Svg>
);
export const IncomeIcon = () => (
  <Svg><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></Svg>
);
export const ExpenseIcon = () => (
  <Svg><rect x="2" y="5" width="20" height="14" rx="3" /><line x1="2" y1="10" x2="22" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></Svg>
);
export const StarIcon = () => (
  <Svg><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" /></Svg>
);
export const MoreIcon = () => (
  <Svg><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></Svg>
);
export const PlusIcon = () => (
  <Svg size={26}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>
);
export const BackIcon = () => (
  <Svg><polyline points="15 18 9 12 15 6" /></Svg>
);
export const ChevronIcon = () => (
  <Svg size={18}><polyline points="9 18 15 12 9 6" /></Svg>
);
export const CloseIcon = () => (
  <Svg size={20}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></Svg>
);
