import {
  useFeatureFlagsStore,
  webUpgradeEnabled,
  FLAGS,
} from './feature-flags.store';
import { api } from '@/services/api';

jest.mock('@/services/api', () => ({ api: { get: jest.fn() } }));

const mockedApi = api as unknown as { get: jest.Mock };

function flag(key: string, enabled: boolean) {
  return { key, enabled, label: '', category: 'payments' };
}

function resetStore() {
  useFeatureFlagsStore.setState({ flags: {}, loaded: false });
}

describe('feature-flags.store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it('isEnabled is false before flags load (fail-closed)', () => {
    expect(
      useFeatureFlagsStore.getState().isEnabled(FLAGS.subscription),
    ).toBe(false);
  });

  it('reflects enabled state after a successful load', async () => {
    mockedApi.get.mockResolvedValue({
      data: [flag('subscription', true), flag('payment_web_mobile', false)],
    });

    await useFeatureFlagsStore.getState().fetchFlags();

    const s = useFeatureFlagsStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.isEnabled('subscription')).toBe(true);
    expect(s.isEnabled('payment_web_mobile')).toBe(false);
    expect(s.isEnabled('unknown_flag')).toBe(false);
  });

  it('stays fail-closed (loaded, all-false) when the fetch errors', async () => {
    mockedApi.get.mockRejectedValue(new Error('network'));

    await useFeatureFlagsStore.getState().fetchFlags();

    const s = useFeatureFlagsStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.isEnabled(FLAGS.subscription)).toBe(false);
  });

  it('suppresses the error modal on the cold-start fetch', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await useFeatureFlagsStore.getState().fetchFlags();

    expect(mockedApi.get).toHaveBeenCalledWith('/feature-flags', {
      suppressErrorModal: true,
    });
  });

  it('webUpgradeEnabled requires BOTH subscription and payment_web_mobile', async () => {
    mockedApi.get.mockResolvedValue({
      data: [flag('subscription', true), flag('payment_web_mobile', false)],
    });
    await useFeatureFlagsStore.getState().fetchFlags();
    expect(webUpgradeEnabled()).toBe(false);

    resetStore();
    mockedApi.get.mockResolvedValue({
      data: [flag('subscription', true), flag('payment_web_mobile', true)],
    });
    await useFeatureFlagsStore.getState().fetchFlags();
    expect(webUpgradeEnabled()).toBe(true);

    resetStore();
    mockedApi.get.mockResolvedValue({
      data: [flag('subscription', false), flag('payment_web_mobile', true)],
    });
    await useFeatureFlagsStore.getState().fetchFlags();
    expect(webUpgradeEnabled()).toBe(false);
  });
});
