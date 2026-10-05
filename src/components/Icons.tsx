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

export const GridIcon = () => (
  <Svg><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></Svg>
);
export const ListIcon = () => (
  <Svg><rect x="4" y="3" width="16" height="18" rx="3" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></Svg>
);
export const EyeIcon = () => (
  <Svg><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const EyeOffIcon = () => (
  <Svg><path d="M3 3l18 18" /><path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.2-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>
);
export const PersonIcon = () => (
  <Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>
);

export const WalletIcon = () => (
  <Svg><path d="M3 7a3 3 0 0 1 3-3h12v4" /><path d="M3 7v10a3 3 0 0 0 3 3h13a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2" /><circle cx="16.5" cy="14" r="1.2" /></Svg>
);
export const SwapIcon = () => (
  <Svg><polyline points="17 3 21 7 17 11" /><line x1="3" y1="7" x2="21" y2="7" /><polyline points="7 21 3 17 7 13" /><line x1="21" y1="17" x2="3" y2="17" /></Svg>
);
export const TargetIcon = () => (
  <Svg><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></Svg>
);
export const MinusIcon = () => (
  <Svg><line x1="5" y1="12" x2="19" y2="12" /></Svg>
);

export const PencilIcon = () => (
  <Svg size={18}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>
);

export const RefreshIcon = () => (
  <Svg size={22}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><polyline points="21 3 21 9 15 9" /></Svg>
);
