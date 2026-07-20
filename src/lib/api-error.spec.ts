import { AxiosError, AxiosHeaders } from 'axios';
import { toAppError } from './api-error';

function axiosError(
  status?: number,
  data?: unknown,
): AxiosError {
  const err = new AxiosError('boom');
  if (status !== undefined) {
    err.response = {
      status,
      data,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  }
  return err;
}

describe('toAppError', () => {
  it('flattens string[] validation messages', () => {
    const e = toAppError(
      axiosError(400, {
        statusCode: 400,
        message: ['transcript must be a string', 'inputMode must be voice|typed'],
        error: 'Bad Request',
      }),
    );
    expect(e.status).toBe(400);
    expect(e.message).toContain('transcript must be a string');
    expect(e.message).toContain('inputMode');
    expect(e.code).toBeUndefined();
  });

  it('extracts the backend code discriminator', () => {
    const e = toAppError(
      axiosError(403, {
        statusCode: 403,
        message: 'Upgrade to Pro to continue.',
        code: 'UPGRADE_REQUIRED',
        error: 'Upgrade Required',
      }),
    );
    expect(e.code).toBe('UPGRADE_REQUIRED');
    expect(e.status).toBe(403);
    expect(e.isNetwork).toBe(false);
  });

  it('marks no-response failures as network errors', () => {
    const e = toAppError(axiosError());
    expect(e.isNetwork).toBe(true);
    expect(e.status).toBeUndefined();
  });

  it('passes plain Errors through', () => {
    const e = toAppError(new Error('nope'));
    expect(e.message).toBe('nope');
    expect(e.isNetwork).toBe(false);
  });

  it('is idempotent for already-normalized errors', () => {
    const first = toAppError(axiosError(429, { message: 'slow down' }));
    expect(toAppError(first)).toBe(first);
  });
});
