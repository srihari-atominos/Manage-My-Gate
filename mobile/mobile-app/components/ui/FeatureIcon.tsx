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
} from 'lucide-react-native';

export interface FeatureIconProps {
  iconName: string;
  color: string;
  size?: number;
}

export const FeatureIcon: React.FC<FeatureIconProps> = ({ iconName, color, size = 18 }) => {
  switch (iconName) {
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
    default:
      return <Building2 size={size} color={color} />;
  }
};

export default FeatureIcon;
