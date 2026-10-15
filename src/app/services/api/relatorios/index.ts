import { fetchAPI } from '../client';

export const relatoriosService = {
  dashboardAdmin: () => fetchAPI<any>('/relatorios/dashboard-admin'),
  dashboardTecnico: () => fetchAPI<any>('/relatorios/dashboard-tecnico'),
  dashboardCliente: () => fetchAPI<any>('/relatorios/dashboard-cliente'),
  intervencoes: () => fetchAPI<any>('/relatorios/intervencoes'),
  financeiro: () => fetchAPI<any>('/relatorios/financeiro'),
};
