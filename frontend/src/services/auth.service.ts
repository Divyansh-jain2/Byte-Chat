import { SignupRequest, VerifyOTPRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, AuthResponse, User } from '@/types/auth.types';
import apiClient from '@/lib/apiClient';

class AuthService {
  private async request<T, D = unknown>(method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string, data?: D): Promise<T> {
    const response = await apiClient({
      method,
      url: `/api/auth${endpoint}`,
      data,
    });
    return response.data;
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/signup', data);
  }

  async verifyOTP(data: VerifyOTPRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('POST', '/verify-otp', data);
    if (response.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('POST', '/login', data);
    if (response.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('POST', '/logout');
    } finally {
      localStorage.removeItem('user');
    }
  }

  async refresh(): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/refresh');
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/forgot-password', data);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/reset-password', data);
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? (JSON.parse(user) as User) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
}

export const authService = new AuthService();
