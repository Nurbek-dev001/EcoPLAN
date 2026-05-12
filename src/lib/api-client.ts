import axios, { AxiosInstance, AxiosError } from 'axios';
import { useNavigate } from '@tanstack/react-router';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token storage keys
const ACCESS_TOKEN_KEY = 'ecoplan_access_token';
const USER_KEY = 'ecoplan_user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    role: string;
    active: boolean;
    created_at: string;
  };
}

export interface Calculation {
  id: string;
  train_number: string;
  status: string;
  wagon_types?: Record<string, any>;
  occupancy?: number;
  revenue?: Record<string, any>;
  expenses?: Array<any>;
  financial_result?: Record<string, any>;
  anomalies?: Array<any>;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
}

export interface Tariff {
  id: string;
  name: string;
  region: string;
  category: string;
  value: number;
  unit?: string;
  valid_from: string;
  valid_to?: string;
}

export interface Train {
  id: string;
  number: string;
  route: string;
  from_station: string;
  to_station: string;
  distance_km?: number;
  duration_hours?: number;
}

// Create axios instance with interceptors
export const createApiClient = (navigate?: any): AxiosInstance => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - auth disabled (no token needed)
  api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors
  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Handle 401 - redirect to login
      if (error.response?.status === 401) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        if (navigate) {
          navigate({ to: '/login' });
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};

// Create global API client
export const apiClient = createApiClient();

// ============= AUTH API =============
export const authApi = {
  login: async (_email: string, _password: string): Promise<LoginResponse> => {
    // Auth disabled - return demo user immediately
    const demoUser = {
      id: "demo-user",
      email: "demo@ecoplan.kz",
      role: "director",
      active: true,
      created_at: "2024-01-01T00:00:00",
    };
    return {
      access_token: "demo-token",
      token_type: "bearer",
      user: demoUser,
    };
  },

  logout: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: async () => {
    return {
      id: "demo-user",
      email: "demo@ecoplan.kz",
      role: "director",
      active: true,
      created_at: "2024-01-01T00:00:00",
    };
  },

  refreshToken: async () => {
    return {
      access_token: "demo-token",
      token_type: "bearer",
      expires_in: 86400,
    };
  },
};

// ============= CALCULATIONS API =============
export const calculationsApi = {
  create: async (calculation: any) => {
    const response = await apiClient.post('/api/calculations/', calculation);
    return response.data;
  },

  list: async (skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get('/api/calculations/', {
      params: { skip, limit },
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/api/calculations/${id}`);
    return response.data;
  },

  update: async (id: string, calculation: Partial<Calculation>) => {
    const response = await apiClient.put(`/api/calculations/${id}`, calculation);
    return response.data;
  },

  submit: async (id: string) => {
    const response = await apiClient.post(`/api/calculations/${id}/submit`);
    return response.data;
  },

  approve: async (id: string, comment?: string) => {
    const response = await apiClient.post(`/api/calculations/${id}/approve`, {
      comment,
    });
    return response.data;
  },

  reject: async (id: string, reason: string) => {
    const response = await apiClient.post(`/api/calculations/${id}/reject`, {
      reason,
    });
    return response.data;
  },
};

// ============= TARIFFS API =============
export const tariffsApi = {
  create: async (tariff: any) => {
    const response = await apiClient.post('/api/tariffs/', tariff);
    return response.data;
  },

  list: async (region?: string, category?: string, validDate?: string) => {
    const response = await apiClient.get('/api/tariffs/', {
      params: { region, category, valid_date: validDate },
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/api/tariffs/${id}`);
    return response.data;
  },

  getHistory: async (id: string) => {
    const response = await apiClient.get(`/api/tariffs/${id}/history`);
    return response.data;
  },

  update: async (id: string, tariff: Partial<Tariff>) => {
    const response = await apiClient.put(`/api/tariffs/${id}`, tariff);
    return response.data;
  },

  bulkImport: async (tariffs: any[]) => {
    const response = await apiClient.post('/api/tariffs/bulk-import', tariffs);
    return response.data;
  },
};

// ============= TRAINS API =============
export const trainsApi = {
  create: async (train: any) => {
    const response = await apiClient.post('/api/trains/', train);
    return response.data;
  },

  list: async (skip: number = 0, limit: number = 100) => {
    const response = await apiClient.get('/api/trains/', {
      params: { skip, limit },
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/api/trains/${id}`);
    return response.data;
  },

  getByNumber: async (number: string) => {
    const response = await apiClient.get(`/api/trains/number/${number}`);
    return response.data;
  },

  update: async (id: string, train: Partial<Train>) => {
    const response = await apiClient.put(`/api/trains/${id}`, train);
    return response.data;
  },
};

// ============= DASHBOARD API =============
export const dashboardApi = {
  getSummary: async () => {
    const response = await apiClient.get('/api/dashboard/summary');
    return response.data;
  },

  getRecentCalculations: async (limit: number = 10) => {
    const response = await apiClient.get('/api/dashboard/recent-calculations', {
      params: { limit },
    });
    return response.data;
  },

  getPendingApprovals: async (limit: number = 10) => {
    const response = await apiClient.get('/api/dashboard/pending-approvals', {
      params: { limit },
    });
    return response.data;
  },

  getAlerts: async () => {
    const response = await apiClient.get('/api/dashboard/alerts');
    return response.data;
  },

  getStatistics: async (periodDays: number = 30) => {
    const response = await apiClient.get('/api/dashboard/statistics', {
      params: { period_days: periodDays },
    });
    return response.data;
  },
};

// ============= REPORTS API =============
export const reportsApi = {
  getFinancialSummary: async (startDate?: string, endDate?: string, routeType?: string) => {
    const response = await apiClient.get('/api/reports/financial-summary', {
      params: { start_date: startDate, end_date: endDate, route_type: routeType },
    });
    return response.data;
  },

  getAnomalies: async (severity?: string, limit: number = 100) => {
    const response = await apiClient.get('/api/reports/anomalies', {
      params: { severity, limit },
    });
    return response.data;
  },

  getCalculationsExport: async (format: string = 'json', statusFilter?: string) => {
    const response = await apiClient.get('/api/reports/calculations-export', {
      params: { format, status_filter: statusFilter },
    });
    return response.data;
  },

  getCostAnalysis: async (groupBy: string = 'route_type') => {
    const response = await apiClient.get('/api/reports/cost-analysis', {
      params: { group_by: groupBy },
    });
    return response.data;
  },
};

// ============= ANALYTICS API =============
export const analyticsApi = {
  getCostTrends: async (periodDays: number = 30) => {
    const response = await apiClient.get('/api/analytics/cost-trends', {
      params: { period_days: periodDays },
    });
    return response.data;
  },

  getCostPerWagon: async (groupBy: string = 'train_type') => {
    const response = await apiClient.get('/api/analytics/cost-per-wagon', {
      params: { group_by: groupBy },
    });
    return response.data;
  },

  getCostPerPassenger: async (groupBy: string = 'route_type') => {
    const response = await apiClient.get('/api/analytics/cost-per-passenger', {
      params: { group_by: groupBy },
    });
    return response.data;
  },

  getAnomalyStatistics: async () => {
    const response = await apiClient.get('/api/analytics/anomaly-statistics');
    return response.data;
  },

  getForecast: async (months: number = 3) => {
    const response = await apiClient.get('/api/analytics/forecast', {
      params: { months },
    });
    return response.data;
  },
};

// ============= AUDIT LOGS API =============
export const auditLogsApi = {
  list: async (entityType?: string, entityId?: string, limit: number = 100, offset: number = 0) => {
    const response = await apiClient.get('/api/audit-logs/', {
      params: { entity_type: entityType, entity_id: entityId, limit, offset },
    });
    return response.data;
  },
};

// ============= USERS API =============
export const usersApi = {
  create: async (user: any) => {
    const response = await apiClient.post('/api/users/', user);
    return response.data;
  },

  list: async (skip: number = 0, limit: number = 100, role?: string, active?: boolean) => {
    const response = await apiClient.get('/api/users/', {
      params: { skip, limit, role, active },
    });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  update: async (id: string, user: any) => {
    const response = await apiClient.put(`/api/users/${id}`, user);
    return response.data;
  },

  changePassword: async (id: string, oldPassword: string, newPassword: string) => {
    const response = await apiClient.post(`/api/users/${id}/change-password`, {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  deactivate: async (id: string) => {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  },
};

// Helper function to get stored user
export const getStoredUser = () => {
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

// Helper function to get stored token
export const getStoredToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!getStoredToken();
};
