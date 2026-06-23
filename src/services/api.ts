import { UserProfile, Employee, AttendanceRecord, FacePose } from '../types';

const STORAGE_KEY = 'face_att_config';
const LEGACY_DEFAULT_URL = 'https://172.16.24.50:5184/api';

function getDefaultUrl(): string {
  const envUrl = ((import.meta as any).env?.VITE_API_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'capacitor://localhost') {
    return `${window.location.origin}/api`.replace(/\/$/, '');
  }

  return 'http://35.244.3.148:5193/api';
}

const DEFAULT_URL = getDefaultUrl();

interface Config { baseUrl: string; token: string | null; }

function loadConfig(): Config {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        baseUrl: !parsed.baseUrl || parsed.baseUrl === LEGACY_DEFAULT_URL ? DEFAULT_URL : parsed.baseUrl,
        token: parsed.token ?? null,
      };
    }
  } catch {}
  return { baseUrl: DEFAULT_URL, token: null };
}

function saveConfig(c: Config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

class ApiService {
  private cfg: Config = loadConfig();

  get baseUrl()    { return this.cfg.baseUrl; }
  get token()      { return this.cfg.token; }
  get isLoggedIn() { return !!this.cfg.token; }

  setBaseUrl(url: string) {
    this.cfg.baseUrl = url.replace(/\/$/, '');
    saveConfig(this.cfg);
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.cfg.token) h['Authorization'] = `Bearer ${this.cfg.token}`;
    return h;
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.cfg.baseUrl}${path}`, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error('Cannot reach server. Check your network connection.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || res.statusText);
    }
    return res.json().catch(() => { throw new Error('Unexpected server response.'); });
  }

  // Auth
  async login(email: string, password: string): Promise<UserProfile> {
    const data: any = await this.req('POST', '/login', { email, password });
    this.cfg.token = data.token;
    saveConfig(this.cfg);
    return data.user ?? data;
  }

  logout() {
    this.cfg.token = null;
    saveConfig(this.cfg);
  }

  async me(): Promise<UserProfile> {
    const data: any = await this.req('GET', '/me');
    return data.user ?? data;
  }

  // Employees
  async getEmployees(params: { page?: number; limit?: number; search?: string } = {}):
    Promise<{ rows: Employee[]; pagination: any; summary: any }> {
    return this.req('POST', '/users/data', {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      search: params.search ?? '',
      status: 'Active',
    });
  }

  async createEmployee(payload: {
    name: string; code: string; email: string; phone: string;
    gender: string; department: string; type?: string; role?: string;
  }): Promise<Employee> {
    return this.req('POST', '/users', {
      ...payload,
      type: payload.type ?? 'Staff',
      role: payload.role ?? 'user',
      status: 'Active',
    });
  }

  async registerFace(userId: number, poses: FacePose[], images: string[]): Promise<any> {
    const sources = images.map(img => ({ type: 'base64', value: img }));
    return this.req('POST', `/users/${userId}/register-face`, { poses, sources });
  }

  async deletePose(userId: number, pose: FacePose): Promise<any> {
    const res = await fetch(`${this.cfg.baseUrl}/users/${userId}/poses/${pose}`, {
      method: 'DELETE', headers: this.headers(),
    });
    if (!res.ok) throw new Error('Delete failed');
    return res.json();
  }

  getFileUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.cfg.baseUrl.replace(/\/api$/, '')}/files/${path}`;
  }

  // Attendance
  async getAttendance(params: {
    from: string; to: string; user_id?: number | null;
    status?: string | null; search?: string; page?: number; limit?: number;
  }): Promise<{ rows: AttendanceRecord[]; pagination: any; summary: any }> {
    return this.req('POST', '/attendance/data', {
      from: params.from, to: params.to,
      user_id: params.user_id ?? null,
      status: params.status ?? null,
      search: params.search ?? '',
      page: params.page ?? 1,
      limit: params.limit ?? 200,
    });
  }

  async getMonthlyAttendance(month: string): Promise<any> {
    return this.req('POST', '/attendance/monthly', { month });
  }

  async exportAttendance(params: { from: string; to: string; user_id?: number | null }): Promise<Blob> {
    const res = await fetch(`${this.cfg.baseUrl}/attendance/export`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ from: params.from, to: params.to, user_id: params.user_id ?? null }),
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }
}

export const apiService = new ApiService();
