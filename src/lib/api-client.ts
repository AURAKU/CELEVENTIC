/**
 * Laravel API client — proxies to backend when LARAVEL_API_URL is set.
 * Falls back to local Next.js API routes when not configured.
 */

const LARAVEL_API = process.env.LARAVEL_API_URL;
const API_TOKEN = process.env.LARAVEL_API_TOKEN;

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl ?? LARAVEL_API ?? "";
    this.token = token ?? API_TOKEN;
  }

  get isLaravelEnabled() {
    return !!this.baseUrl;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.baseUrl) {
      return { success: false, error: "Laravel API not configured" };
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.message ?? "API request failed" };
    }
    return { success: true, data: json.data ?? json };
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>("PUT", path, body);
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

export const laravelApi = new ApiClient();
