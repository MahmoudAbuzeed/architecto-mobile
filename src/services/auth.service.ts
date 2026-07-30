import { api } from './api';
import type { AuthResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { suppressErrorModal: true },
    );
    return data;
  },

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(
      '/auth/register',
      { email, password, name },
      { suppressErrorModal: true },
    );
    return data;
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(
      '/auth/verify-otp',
      { email, otp },
      { suppressErrorModal: true },
    );
    return data;
  },

  async googleMobile(idToken: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(
      '/auth/google/mobile',
      { idToken },
      { suppressErrorModal: true },
    );
    return data;
  },

  async appleMobile(
    identityToken: string,
    fullName?: string,
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(
      '/auth/apple/mobile',
      { identityToken, fullName },
      { suppressErrorModal: true },
    );
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me', {
      suppressErrorModal: true,
    });
    return data;
  },

  async deleteAccount(): Promise<void> {
    // Hard delete on the backend (DELETE /auth/account, JWT-guarded, no body).
    await api.delete('/auth/account', { suppressErrorModal: true });
  },
};
