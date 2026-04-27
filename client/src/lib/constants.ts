import { Home, FolderOpen, Settings, Store, Users, CloudUpload, BarChart3, MessageCircle, Calendar, Library as LibraryIcon, LucideIcon } from 'lucide-react';

export const NAVIGATION_ITEMS: Array<{ id: string; icon: LucideIcon; label: string; roles?: ('developer' | 'regular')[]; external?: boolean }> = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', roles: ['developer'] },
  { id: 'store', icon: Store, label: 'Store', roles: ['regular'] },
  { id: 'projects', icon: FolderOpen, label: 'Projects', roles: ['developer'] },
  { id: 'game-engines', icon: Settings, label: 'Game Engines', roles: ['developer'] },
  { id: 'asset-store', icon: Store, label: 'Asset Store', roles: ['developer'] },
  { id: 'collaboration', icon: MessageCircle, label: 'Buttonz', external: true },
  { id: 'distribution', icon: CloudUpload, label: 'Distribution', roles: ['developer'] },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', roles: ['developer'] },
  { id: 'community', icon: Users, label: 'Community' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'library', icon: LibraryIcon, label: 'Library', roles: ['regular'] },
];

export const PROJECT_STATUS_CONFIG = {
  'live': {
    label: 'Live',
    className: 'status-live px-3 py-1 rounded-full text-xs font-medium text-white',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'status-progress px-3 py-1 rounded-full text-xs font-medium text-white',
  },
  'not-started': {
    label: 'Not Started',
    className: 'status-not-started px-3 py-1 rounded-full text-xs font-medium text-gray-700',
  },
} as const;

export const ENGINE_CONFIG = {
  unity: { label: 'Unity 3D', icon: 'fas fa-cube' },
  unreal: { label: 'Unreal Engine', icon: 'fas fa-rocket' },
  godot: { label: 'Godot', icon: 'fas fa-code' },
  html5: { label: 'HTML5', icon: 'fas fa-code' },
  custom: { label: 'Custom Engine', icon: 'fas fa-wrench' },
} as const;

export const PLATFORM_CONFIG = {
  pc: { label: 'PC', icon: 'fas fa-desktop' },
  mobile: { label: 'Mobile', icon: 'fas fa-mobile-alt' },
  console: { label: 'Console', icon: 'fas fa-gamepad' },
  vr: { label: 'VR', icon: 'fas fa-vr-cardboard' },
  web: { label: 'Web', icon: 'fas fa-globe' },
} as const;
