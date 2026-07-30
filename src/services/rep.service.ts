import { api } from './api';
import type {
  DrillsPayload,
  FollowUpResponse,
  GradingResponse,
  HomePayload,
  InputMode,
  ProbeResponse,
  StatsPayload,
  SubmitAnswerBody,
} from '@/types';

export const repService = {
  async getHome(): Promise<HomePayload> {
    const { data } = await api.get<HomePayload>('/rep/home');
    return data;
  },

  async getDrills(params: {
    group?: string;
    category?: string;
    track?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  }): Promise<DrillsPayload> {
    const { data } = await api.get<DrillsPayload>('/rep/drills', { params });
    return data;
  },

  async submitDailyAnswer(body: SubmitAnswerBody): Promise<GradingResponse> {
    const { data } = await api.post<GradingResponse>(
      '/rep/daily/answer',
      body,
      // REP_ALREADY_COMPLETED and AI failures are handled by the rep flow.
      { suppressErrorModal: true },
    );
    return data;
  },

  async submitDrillAnswer(
    slug: string,
    body: SubmitAnswerBody,
  ): Promise<GradingResponse> {
    const { data } = await api.post<GradingResponse>(
      `/rep/drills/${encodeURIComponent(slug)}/answer`,
      body,
      { suppressErrorModal: true },
    );
    return data;
  },

  async submitProbe(
    attemptId: string,
    body: { transcript: string; inputMode: InputMode; language?: string },
  ): Promise<ProbeResponse> {
    const { data } = await api.post<ProbeResponse>(
      `/rep/attempts/${encodeURIComponent(attemptId)}/probe`,
      body,
      // Probe errors (already answered / session complete) are session flow.
      { suppressErrorModal: true },
    );
    return data;
  },

  async submitFollowUp(
    attemptId: string,
    body: { transcript: string; inputMode: 'voice' | 'typed' },
  ): Promise<FollowUpResponse> {
    const { data } = await api.post<FollowUpResponse>(
      `/rep/attempts/${encodeURIComponent(attemptId)}/follow-up`,
      body,
      { suppressErrorModal: true },
    );
    return data;
  },

  async getStats(): Promise<StatsPayload> {
    const { data } = await api.get<StatsPayload>('/rep/stats');
    return data;
  },
};
