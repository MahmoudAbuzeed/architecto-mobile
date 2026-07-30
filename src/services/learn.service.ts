import { api } from './api';
import type {
  DailyLessonPayload,
  DailySubmitResponse,
  TopicRow,
  TrackDetail,
  TracksPayload,
} from '@/types';

/**
 * Tracks/topics catalog. `/rep/tracks*` are new endpoints — errors render
 * inline in the Learn screens (an old backend 404s here; the modal host
 * shouldn't nag on every tab focus). `/learn/topics` is the existing web
 * endpoint, same JWT.
 */
export const learnService = {
  async getTracks(): Promise<TracksPayload> {
    const { data } = await api.get<TracksPayload>('/rep/tracks', {
      suppressErrorModal: true,
    });
    return data;
  },

  async getTrackDetail(track: string): Promise<TrackDetail> {
    const { data } = await api.get<TrackDetail>(
      `/rep/tracks/${encodeURIComponent(track)}`,
      { suppressErrorModal: true },
    );
    return data;
  },

  async getTopics(category: string): Promise<TopicRow[]> {
    const { data } = await api.get<TopicRow[]>('/learn/topics', {
      params: { category },
      suppressErrorModal: true,
    });
    return data;
  },

  async setPrimaryTrack(track: string): Promise<void> {
    await api.patch(
      '/auth/profile',
      { primaryTrack: track },
      { suppressErrorModal: true },
    );
  },

  async setAdditionalTracks(additionalTracks: string[]): Promise<void> {
    await api.patch(
      '/auth/profile',
      { additionalTracks },
      { suppressErrorModal: true },
    );
  },

  // ── Daily micro-lesson (`/learn/daily*`, new backends only) ──────────

  async getDaily(track: string, language: string): Promise<DailyLessonPayload> {
    const { data } = await api.get<DailyLessonPayload>('/learn/daily', {
      params: { track, language },
      // First fetch of a topic waits on LLM generation — beyond the 60s default.
      timeout: 120000,
      suppressErrorModal: true,
    });
    return data;
  },

  async submitDaily(body: {
    track: string;
    topicSlug: string;
    answers: Record<string, number>;
  }): Promise<DailySubmitResponse> {
    const { data } = await api.post<DailySubmitResponse>(
      '/learn/daily/submit',
      body,
      { suppressErrorModal: true },
    );
    return data;
  },
};
