import { SignupRequest, VerifyOTPRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, AuthResponse } from '@/types/auth.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class AuthService {
  private baseUrl = `${API_BASE_URL}/api/auth`;

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      credentials: 'include' // Important for cookies
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    // Store access token if present
    if (response.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }

    // Store user if present
    if (response.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    // Store access token
    if (response.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }

    // Store user
    if (response.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async logout(): Promise<void> {
    await this.request('/logout', {
      method: 'POST'
    });

    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  getCurrentUser(): any | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = new AuthService();
