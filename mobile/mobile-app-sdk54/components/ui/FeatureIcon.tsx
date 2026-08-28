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
  Search,
  SearchCode,
  CarFront,
  PackageCheck,
  PhoneCall,
  BarChart3,
  PlusCircle,
  ListOrdered,
  Kanban,
  BellRing,
  LayoutDashboard,
  FileEdit,
  Vote,
  Calculator,
  Settings,
  Layers,
  Building,
  FileSpreadsheet,
  ShieldAlert,
  ScanLine,
  CalendarCheck,
  CalendarDays,
  Receipt,
  ClipboardList,
  SlidersHorizontal,
  FolderGit2,
  UserPlus,
  ShieldX,
  Filter,
  Ticket,
  UserX,
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
  TicketCheck,
  History,
  CalendarClock,
} from 'lucide-react-native';

export interface FeatureIconProps {
  iconName: string;
  color: string;
  size?: number;
}

export const FeatureIcon: React.FC<FeatureIconProps> = ({ iconName, color, size = 20 }) => {
  switch (iconName) {
    case 'ContactRound':
      return <ContactRound size={size} color={color} />;
    case 'TicketCheck':
      return <TicketCheck size={size} color={color} />;
    case 'History':
      return <History size={size} color={color} />;
    case 'CalendarClock':
      return <CalendarClock size={size} color={color} />;
    case 'Ticket':
      return <Ticket size={size} color={color} />;
    case 'UserX':
      return <UserX size={size} color={color} />;
    case 'Megaphone':
      return <Megaphone size={size} color={color} />;
    case 'Coins':
      return <Coins size={size} color={color} />;
    case 'Compass':
      return <Compass size={size} color={color} />;
    case 'KeyRound':
      return <KeyRound size={size} color={color} />;
    case 'DoorOpen':
      return <DoorOpen size={size} color={color} />;
    case 'AlertCircle':
      return <AlertCircle size={size} color={color} />;
    case 'ScrollText':
      return <ScrollText size={size} color={color} />;
    case 'BadgeCheck':
      return <BadgeCheck size={size} color={color} />;
    case 'Sparkles':
      return <Sparkles size={size} color={color} />;
    case 'Shield':
      return <Shield size={size} color={color} />;
    case 'CreditCard':
      return <CreditCard size={size} color={color} />;
    case 'Wrench':
      return <Wrench size={size} color={color} />;
    case 'Bell':
      return <Bell size={size} color={color} />;
    case 'ShieldCheck':
      return <ShieldCheck size={size} color={color} />;
    case 'Building2':
      return <Building2 size={size} color={color} />;
    case 'Users':
      return <Users size={size} color={color} />;
    case 'Wallet':
      return <Wallet size={size} color={color} />;
    case 'Home':
      return <Home size={size} color={color} />;
    case 'UserCheck':
      return <UserCheck size={size} color={color} />;
    case 'FileText':
      return <FileText size={size} color={color} />;
    case 'Clock':
      return <Clock size={size} color={color} />;
    case 'QrCode':
      return <QrCode size={size} color={color} />;
    case 'Car':
      return <Car size={size} color={color} />;
    case 'Truck':
      return <Truck size={size} color={color} />;
    case 'Phone':
      return <Phone size={size} color={color} />;
    case 'MessageSquare':
      return <MessageSquare size={size} color={color} />;
    case 'Baby':
      return <Baby size={size} color={color} />;
    case 'Users2':
      return <Users2 size={size} color={color} />;
    case 'Search':
      return <Search size={size} color={color} />;
    case 'SearchCode':
      return <SearchCode size={size} color={color} />;
    case 'CarFront':
      return <CarFront size={size} color={color} />;
    case 'PackageCheck':
      return <PackageCheck size={size} color={color} />;
    case 'PhoneCall':
      return <PhoneCall size={size} color={color} />;
    case 'BarChart3':
      return <BarChart3 size={size} color={color} />;
    case 'PlusCircle':
      return <PlusCircle size={size} color={color} />;
    case 'ListOrdered':
      return <ListOrdered size={size} color={color} />;
    case 'Kanban':
      return <Kanban size={size} color={color} />;
    case 'BellRing':
      return <BellRing size={size} color={color} />;
    case 'LayoutDashboard':
      return <LayoutDashboard size={size} color={color} />;
    case 'FileEdit':
      return <FileEdit size={size} color={color} />;
    case 'Vote':
      return <Vote size={size} color={color} />;
    case 'Calculator':
      return <Calculator size={size} color={color} />;
    case 'Settings':
      return <Settings size={size} color={color} />;
    case 'Layers':
      return <Layers size={size} color={color} />;
    case 'Building':
      return <Building size={size} color={color} />;
    case 'FileSpreadsheet':
      return <FileSpreadsheet size={size} color={color} />;
    case 'ShieldAlert':
      return <ShieldAlert size={size} color={color} />;
    case 'ScanLine':
      return <ScanLine size={size} color={color} />;
    case 'CalendarCheck':
      return <CalendarCheck size={size} color={color} />;
    case 'CalendarDays':
      return <CalendarDays size={size} color={color} />;
    case 'Receipt':
      return <Receipt size={size} color={color} />;
    case 'ClipboardList':
      return <ClipboardList size={size} color={color} />;
    case 'SlidersHorizontal':
      return <SlidersHorizontal size={size} color={color} />;
    case 'FolderGit2':
      return <FolderGit2 size={size} color={color} />;
    case 'UserPlus':
      return <UserPlus size={size} color={color} />;
    case 'ShieldX':
      return <ShieldX size={size} color={color} />;
    case 'Filter':
      return <Filter size={size} color={color} />;
    default:
      return <Building2 size={size} color={color} />;
  }
};

export default FeatureIcon;
