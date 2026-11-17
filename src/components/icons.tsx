/** Hand-drawn 24px stroke icons, so the app has no icon-library dependency. */
import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 18, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: P) => <I {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></I>;
export const PlusIcon = (p: P) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const FileIcon = (p: P) => <I {...p}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></I>;
export const LayersIcon = (p: P) => <I {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></I>;
export const BookIcon = (p: P) => <I {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M8 7h7" /></I>;
export const HelmetIcon = (p: P) => <I {...p}><path d="M3 17h18M4 17v-2a8 8 0 0 1 16 0v2" /><path d="M10 7V5h4v2M12 7v6" /></I>;
export const SparkIcon = (p: P) => <I {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m12 8 1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z" /></I>;
export const SearchIcon = (p: P) => <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></I>;
export const SunIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>;
export const MoonIcon = (p: P) => <I {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></I>;
export const ChevronRight = (p: P) => <I {...p}><path d="m9 6 6 6-6 6" /></I>;
export const ChevronLeft = (p: P) => <I {...p}><path d="m15 6-6 6 6 6" /></I>;
export const ChevronDown = (p: P) => <I {...p}><path d="m6 9 6 6 6-6" /></I>;
export const ChevronUp = (p: P) => <I {...p}><path d="m6 15 6-6 6 6" /></I>;
export const CheckIcon = (p: P) => <I {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></I>;
export const XIcon = (p: P) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>;
export const DownloadIcon = (p: P) => <I {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></I>;
export const CopyIcon = (p: P) => <I {...p}><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></I>;
export const LinkIcon = (p: P) => <I {...p}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></I>;
export const EditIcon = (p: P) => <I {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></I>;
export const TrashIcon = (p: P) => <I {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></I>;
export const RefreshIcon = (p: P) => <I {...p}><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></I>;
export const WandIcon = (p: P) => <I {...p}><path d="m4 20 11-11M14 4v2M19 9h2M17.5 5.5l1.5-1.5M13 7l4 4" /></I>;
export const SendIcon = (p: P) => <I {...p}><path d="M4 12 20 4l-6 16-3-7z" /><path d="m11 13 9-9" /></I>;
export const ClockIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></I>;
export const UploadIcon = (p: P) => <I {...p}><path d="M12 16V5M7 10l5-5 5 5M5 20h14" /></I>;
export const ClipboardIcon = (p: P) => <I {...p}><rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" /></I>;
export const TargetIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></I>;
export const ShieldIcon = (p: P) => <I {...p}><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z" /><path d="m9 12 2 2 4-4" /></I>;
export const ChartIcon = (p: P) => <I {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></I>;
export const UsersIcon = (p: P) => <I {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></I>;
export const CalendarIcon = (p: P) => <I {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></I>;
export const DotsIcon = (p: P) => <I {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></I>;
export const SidebarIcon = (p: P) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M9 4v16" /></I>;
export const LogoutIcon = (p: P) => <I {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></I>;
export const PrintIcon = (p: P) => <I {...p}><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" /><rect x="7" y="14" width="10" height="7" /></I>;
export const EyeIcon = (p: P) => <I {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></I>;
export const GripIcon = (p: P) => <I {...p}><circle cx="9" cy="6" r=".8" /><circle cx="15" cy="6" r=".8" /><circle cx="9" cy="12" r=".8" /><circle cx="15" cy="12" r=".8" /><circle cx="9" cy="18" r=".8" /><circle cx="15" cy="18" r=".8" /></I>;
export const AlertIcon = (p: P) => <I {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></I>;
export const InfoIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></I>;
export const MapPinIcon = (p: P) => <I {...p}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z" /><circle cx="12" cy="10" r="2.3" /></I>;
export const BoltIcon = (p: P) => <I {...p}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></I>;
export const KanbanIcon = (p: P) => <I {...p}><rect x="3.5" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="16.5" y="4" width="4" height="13" rx="1" /></I>;
export const ListIcon = (p: P) => <I {...p}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></I>;
export const TrophyIcon = (p: P) => <I {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z" /></I>;
export const SettingsIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></I>;
