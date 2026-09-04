import React from 'react';
import {
  CreditCard,
  Wrench,
  Bell,
  ShieldCheck,
  Building2,
  Users,
  Wallet,
  Home,
  House,
  UserCheck,
  FileText,
  Clock,
  QrCode,
  Car,
  Truck,
  Phone,
  MessageSquare,
  Baby,
  Users2,
  UsersRound,
  Search,
  SearchCode,
  CarFront,
  PackageCheck,
  PhoneCall,
  BarChart3,
  ChartBar,
  ChartPie,
  PlusCircle,
  ListOrdered,
  Kanban,
  BellRing,
  LayoutDashboard,
  FileEdit,
  FilePenLine,
  Vote,
  Calculator,
  Settings,
  Settings2,
  Layers,
  Building,
  FileSpreadsheet,
  ShieldAlert,
  ScanLine,
  ScanQrCode,
  CalendarCheck,
  CalendarDays,
  CalendarCog,
  Receipt,
  ReceiptIndianRupee,
  BookOpenCheck,
  ClipboardList,
  SlidersHorizontal,
  FolderGit2,
  UserPlus,
  ShieldX,
  ShieldBan,
  Filter,
  Ticket,
  TicketCheck,
  TicketPlus,
  Route,
  ListTodo,
  UserX,
  UserRoundCog,
  Megaphone,
  Coins,
  Compass,
  KeyRound,
  DoorOpen,
  AlertCircle,
  ScrollText,
  BadgeCheck,
  Sparkles,
  Shield,
  ContactRound,
  History,
  CalendarClock,
  WalletCards,
  Workflow,
  Sliders,
  MonitorCog,
} from 'lucide-react-native';

import { useColorScheme } from 'nativewind';

// High-contrast color brightness map for dark mode
const DARK_MODE_COLOR_MAP: Record<string, string> = {
  '#2563EB': '#60A5FA', // Blue
  '#16A34A': '#4ADE80', // Green
  '#EA580C': '#FB923C', // Orange
  '#7C3AED': '#C084FC', // Purple
  '#DB2777': '#F472B6', // Pink
  '#DC2626': '#F87171', // Red
  '#0D9488': '#2DD4BF', // Teal
  '#475569': '#94A3B8', // Slate
  '#6366F1': '#818CF8', // Indigo
};

export interface FeatureIconProps {
  iconName: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export const FeatureIcon: React.FC<FeatureIconProps> = ({
  iconName,
  color,
  size = 28,
  strokeWidth = 2.3,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const effectiveColor = (isDark && DARK_MODE_COLOR_MAP[color]) ? DARK_MODE_COLOR_MAP[color] : color;

  switch (iconName) {
    // Visitor & Gate Security
    case 'MonitorCog':
      return <MonitorCog size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ContactRound':
      return <ContactRound size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'TicketCheck':
      return <TicketCheck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ShieldBan':
      return <ShieldBan size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ShieldX':
      return <ShieldX size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'History':
      return <History size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'DoorOpen':
      return <DoorOpen size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'BadgeCheck':
      return <BadgeCheck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;

    // Amenities & Booking
    case 'LayoutDashboard':
      return <LayoutDashboard size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Compass':
      return <Compass size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'CalendarCheck':
      return <CalendarCheck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'WalletCards':
      return <WalletCards size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'SlidersHorizontal':
      return <SlidersHorizontal size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Settings2':
      return <Settings2 size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'CalendarCog':
      return <CalendarCog size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'CalendarDays':
      return <CalendarDays size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'BookOpenCheck':
      return <BookOpenCheck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ReceiptIndianRupee':
      return <ReceiptIndianRupee size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Wrench':
      return <Wrench size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ScanQrCode':
      return <ScanQrCode size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ScanLine':
      return <ScanLine size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ClipboardList':
      return <ClipboardList size={size} color={effectiveColor} strokeWidth={strokeWidth} />;

    // Complaints & Maintenance
    case 'ChartBar':
    case 'BarChart3':
      return <ChartBar size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'TicketPlus':
      return <TicketPlus size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'PlusCircle':
      return <PlusCircle size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Route':
      return <Route size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ListTodo':
      return <ListTodo size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'UsersRound':
    case 'Users2':
      return <UsersRound size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'UserCheck':
      return <UserCheck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;

    // Notice Board & Polls
    case 'Megaphone':
      return <Megaphone size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'FilePenLine':
    case 'FileEdit':
      return <FilePenLine size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Vote':
      return <Vote size={size} color={effectiveColor} strokeWidth={strokeWidth} />;

    // Billing & Financial Suite
    case 'ChartPie':
      return <ChartPie size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Calculator':
      return <Calculator size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Receipt':
      return <Receipt size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Wallet':
      return <Wallet size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'CreditCard':
      return <CreditCard size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Coins':
      return <Coins size={size} color={effectiveColor} strokeWidth={strokeWidth} />;

    // Administration & Security
    case 'UserRoundCog':
      return <UserRoundCog size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Users':
      return <Users size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'House':
    case 'Home':
      return <House size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ShieldCheck':
      return <ShieldCheck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Settings':
      return <Settings size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Workflow':
      return <Workflow size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Layers':
      return <Layers size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Building':
    case 'Building2':
      return <Building2 size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Sliders':
      return <Sliders size={size} color={effectiveColor} strokeWidth={strokeWidth} />;

    // Common Fallbacks
    case 'Ticket':
      return <Ticket size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'UserX':
      return <UserX size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'KeyRound':
      return <KeyRound size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'AlertCircle':
      return <AlertCircle size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ScrollText':
      return <ScrollText size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Sparkles':
      return <Sparkles size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Shield':
      return <Shield size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Bell':
      return <Bell size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Clock':
      return <Clock size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'QrCode':
      return <QrCode size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Car':
      return <Car size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Truck':
      return <Truck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Phone':
      return <Phone size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'MessageSquare':
      return <MessageSquare size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Baby':
      return <Baby size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Search':
      return <Search size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'SearchCode':
      return <SearchCode size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'CarFront':
      return <CarFront size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'PackageCheck':
      return <PackageCheck size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'PhoneCall':
      return <PhoneCall size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ListOrdered':
      return <ListOrdered size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Kanban':
      return <Kanban size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'BellRing':
      return <BellRing size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'ShieldAlert':
      return <ShieldAlert size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'FolderGit2':
      return <FolderGit2 size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'UserPlus':
      return <UserPlus size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'Filter':
      return <Filter size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    case 'CalendarClock':
      return <CalendarClock size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
    default:
      return <Building2 size={size} color={effectiveColor} strokeWidth={strokeWidth} />;
  }
};

export default FeatureIcon;

