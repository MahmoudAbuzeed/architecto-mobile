import ReactNativeBlobUtil from 'react-native-blob-util';
import { API_BASE_URL } from './env';
import { tokenStorage } from '@/lib/tokenStorage';
import { fnv1a } from '@/lib/hash';

/**
 * Downloads Archie's spoken question audio (mp3) to the file cache and
 * returns a local path. Cached per (endpoint, lang, day-ish content) so
 * "Repeat question" and re-entry replay instantly and for free.
 */

const TTS_DIR = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/tts`;
const MAX_CACHED_FILES = 50;

/**
 * Thrown when the audio request comes back non-200, carrying the HTTP status
 * and (when present) the server's human message — so the caller can tell apart
 * "voice unavailable" (503), the free-tier daily cap (429), and generic
 * failures, and show the right thing instead of failing silently.
 */
export class TtsError extends Error {
  constructor(readonly status: number, readonly serverMessage?: string) {
    super(`TTS request failed (${status})`);
    this.name = 'TtsError';
  }
}

async function ensureDir(): Promise<void> {
  const exists = await ReactNativeBlobUtil.fs.exists(TTS_DIR);
  if (!exists) await ReactNativeBlobUtil.fs.mkdir(TTS_DIR).catch(() => undefined);
}

async function sweep(): Promise<void> {
  try {
    const files = await ReactNativeBlobUtil.fs.ls(TTS_DIR);
    if (files.length <= MAX_CACHED_FILES) return;
    // Oldest-first by name order is good enough for a small cache.
    for (const f of files.slice(0, files.length - MAX_CACHED_FILES)) {
      await ReactNativeBlobUtil.fs.unlink(`${TTS_DIR}/${f}`).catch(() => undefined);
    }
  } catch {
    // cache sweep is best-effort
  }
}

export const ttsService = {
  /**
   * Fetch (or reuse) the spoken audio for a rep question.
   * @param audioPath backend path, e.g. "/rep/daily/audio" or "/rep/drills/<slug>/audio"
   * @param cacheSeed stable string identifying the content (slug + date works)
   */
  async getOrFetch(
    audioPath: string,
    lang: string,
    cacheSeed: string,
  ): Promise<string> {
    await ensureDir();
    const file = `${TTS_DIR}/${fnv1a(`${audioPath}|${lang}|${cacheSeed}`)}.mp3`;
    if (await ReactNativeBlobUtil.fs.exists(file)) return file;

    const token = tokenStorage.getAccessToken();
    // The path may already carry a query (e.g. "/learn/daily/audio?track=X"),
    // so pick the right separator instead of always appending "?lang=".
    const sep = audioPath.includes('?') ? '&' : '?';
    const res = await ReactNativeBlobUtil.config({ path: file })
      .fetch(
        'GET',
        `${API_BASE_URL}${audioPath}${sep}lang=${encodeURIComponent(lang)}`,
        { Authorization: `Bearer ${token ?? ''}` },
      );
    const status = res.info().status;
    if (status !== 200) {
      // The error body was streamed to `file` (we used .config({ path })).
      // Read it back for the server's message before discarding the file.
      let serverMessage: string | undefined;
      try {
        const parsed = JSON.parse(await ReactNativeBlobUtil.fs.readFile(file, 'utf8'));
        serverMessage = Array.isArray(parsed?.message)
          ? parsed.message.join(' ')
          : typeof parsed?.message === 'string'
            ? parsed.message
            : undefined;
      } catch {
        // No readable JSON body — status alone drives the message.
      }
      await ReactNativeBlobUtil.fs.unlink(file).catch(() => undefined);
      throw new TtsError(status, serverMessage);
    }
    void sweep();
    return file;
  },
};
