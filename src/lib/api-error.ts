import { AxiosError } from 'axios';

/**
 * Normalized API error — the one shape screens and the modal host reason
 * about. Mirrors the backend's AllExceptionsFilter response:
 * { statusCode, message: string | string[], code?, error? }.
 */
export interface AppError {
  /** HTTP status; undefined = request never reached the server. */
  status?: number;
  /** Backend discriminator: UPGRADE_REQUIRED, AI_UNAVAILABLE, REP_ALREADY_COMPLETED… */
  code?: string;
  /** Human-readable message (string[] validation errors are flattened). */
  message: string;
  /** True when the device appears offline / the request never got a response. */
  isNetwork: boolean;
}

interface BackendErrorBody {
  statusCode?: number;
  message?: string | string[];
  code?: string;
  error?: string;
}

export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;

  const ax = err as AxiosError<BackendErrorBody>;
  if (ax?.isAxiosError) {
    if (!ax.response) {
      return {
        message: 'No connection. Your streak is safe — try again when you’re back online.',
        isNetwork: true,
      };
    }
    const body = ax.response.data;
    const raw = body?.message;
    const message = Array.isArray(raw)
      ? raw.join('\n')
      : raw || body?.error || `Request failed (${ax.response.status})`;
    return {
      status: ax.response.status,
      code: body?.code,
      message,
      isNetwork: false,
    };
  }

  return {
    message: err instanceof Error ? err.message : 'Something went wrong.',
    isNetwork: false,
  };
}

export function isAppError(e: unknown): e is AppError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    'isNetwork' in e
  );
}
