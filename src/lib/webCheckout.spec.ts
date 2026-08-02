import { Linking } from 'react-native';
import {
  openWebUpgrade,
  setCheckoutPending,
  consumeCheckoutPending,
} from './webCheckout';
import { api } from '@/services/api';
import { showDialog } from '@/store/ui.store';

jest.mock('@/services/api', () => ({ api: { post: jest.fn() } }));
jest.mock('@/store/ui.store', () => ({ showDialog: jest.fn() }));

const mockedApi = api as unknown as { post: jest.Mock };
const mockedShowDialog = showDialog as jest.Mock;

describe('webCheckout', () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consumeCheckoutPending(); // drain any marker left by a prior test
    openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  describe('openWebUpgrade', () => {
    it('builds the callback URL from the handoff code and opens it', async () => {
      mockedApi.post.mockResolvedValue({ data: { code: 'abc123' } });

      await openWebUpgrade('profile');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/auth/web-handoff',
        {},
        { suppressErrorModal: true },
      );
      const url = openSpy.mock.calls[0][0] as string;
      expect(url).toContain('https://www.archeticto.com/auth/callback?code=abc123');
      expect(url).toContain(
        `next=${encodeURIComponent('/pricing?from=mobile&src=profile')}`,
      );
    });

    it('sets the pending marker before opening the browser', async () => {
      mockedApi.post.mockResolvedValue({ data: { code: 'abc123' } });

      await openWebUpgrade();

      // Marker was written (consuming it returns true).
      expect(consumeCheckoutPending()).toBe(true);
    });

    it('prefers a server-composed url when the endpoint returns one', async () => {
      mockedApi.post.mockResolvedValue({
        data: { url: 'https://example.com/go' },
      });

      await openWebUpgrade();

      expect(openSpy).toHaveBeenCalledWith('https://example.com/go');
    });

    it('shows a themed error dialog and opens nothing on API failure', async () => {
      mockedApi.post.mockRejectedValue(new Error('offline'));

      await openWebUpgrade('lesson');

      expect(openSpy).not.toHaveBeenCalled();
      expect(mockedShowDialog).toHaveBeenCalledTimes(1);
      expect(consumeCheckoutPending()).toBe(false); // marker cleared
    });
  });

  describe('consumeCheckoutPending', () => {
    it('returns false when no checkout is pending', () => {
      expect(consumeCheckoutPending()).toBe(false);
    });

    it('is a one-shot marker that expires after 30 minutes', () => {
      const t0 = 1_000_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(t0);

      setCheckoutPending();
      nowSpy.mockReturnValue(t0 + 10 * 60_000); // within window
      expect(consumeCheckoutPending()).toBe(true);
      expect(consumeCheckoutPending()).toBe(false); // already consumed

      nowSpy.mockReturnValue(t0); // reset base for the next marker
      setCheckoutPending();
      nowSpy.mockReturnValue(t0 + 31 * 60_000); // past the 30-min window
      expect(consumeCheckoutPending()).toBe(false);

      nowSpy.mockRestore();
    });
  });
});
