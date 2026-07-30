import { api } from './api';
import type { NotificationPrefs } from '@/types';

/**
 * Notification preferences (`/users/me/notification-prefs`, new backends only).
 * Callers swallow a 404 and fall back to local-only reminder state, so every
 * call suppresses the global error modal.
 */
export const userService = {
  async getNotificationPrefs(): Promise<NotificationPrefs> {
    const { data } = await api.get<NotificationPrefs>(
      '/users/me/notification-prefs',
      { suppressErrorModal: true },
    );
    return data;
  },

  async updateNotificationPrefs(
    partial: Partial<NotificationPrefs>,
  ): Promise<void> {
    await api.patch('/users/me/notification-prefs', partial, {
      suppressErrorModal: true,
    });
  },
};
