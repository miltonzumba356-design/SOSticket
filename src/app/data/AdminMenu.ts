import {
  LayoutDashboard,
  Users,
  FileText,
  Ticket,
  UserCog,
  BarChart3,
  Settings,
  User,
  Building2,
  Calendar,
  LucideIcon
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  subItems?: { id: string; label: string }[];
}

export const adminMenu: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'clientes',
    label: 'Utilizadores',
    icon: Users,
  },
  {
    id: 'empresas',
    label: 'Empresas',
    icon: Building2,
  },
  {
    id: 'contratos',
    label: 'Contratos',
    icon: FileText,
  },
  {
    id: 'intervencoes',
    label: 'Intervenções',
    icon: Ticket,
  },
  {
    id: 'calendario',
    label: 'Calendário',
    icon: Calendar,
  },
  {
    id: 'tecnicos',
    label: 'Técnicos',
    icon: UserCog,
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart3,
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
  },
  {
    id: 'perfil',
    label: 'Perfil',
    icon: User,
  },
];
