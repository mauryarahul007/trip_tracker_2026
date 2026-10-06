import { describe, it, expect } from 'vitest';

/**
 * TypeScript reference implementation of the SQL public.semver_compare
 * introduced in migration 0112_native_app_version_gate.sql.
 */
function semverCompare(v1: string | null | undefined, v2: string | null | undefined): number {
  const parse = (v: string | null | undefined) => {
    if (!v) return [0, 0, 0];
    const match = v.trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return [0, 0, 0];
    return [
      parseInt(match[1] || '0', 10),
      parseInt(match[2] || '0', 10),
      parseInt(match[3] || '0', 10),
    ];
  };

  const p1 = parse(v1);
  const p2 = parse(v2);

  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return 1;
    if (p1[i] < p2[i]) return -1;
  }
  return 0;
}

/**
 * TypeScript reference implementation of public.get_app_version_gate
 * evaluating client status against backend app_config.
 */
function evaluateVersionGate(
  platform: 'ios' | 'android' | 'web',
  appVersion: string,
  config: {
    maintenance_mode?: boolean;
    maintenance_message?: string;
    min_supported_version_ios?: string;
    min_supported_version_android?: string;
    recommended_version_ios?: string;
    recommended_version_android?: string;
    store_url_ios?: string;
    store_url_android?: string;
  }
) {
  if (config.maintenance_mode) {
    return {
      action: 'maintenance',
      message: config.maintenance_message || 'App is currently undergoing scheduled maintenance.',
      store_url: null,
    };
  }

  const minSupported =
    platform === 'ios'
      ? config.min_supported_version_ios
      : config.min_supported_version_android;

  const recommended =
    platform === 'ios'
      ? config.recommended_version_ios
      : config.recommended_version_android;

  const storeUrl =
    platform === 'ios'
      ? config.store_url_ios || 'https://apps.apple.com/app/id000000000'
      : config.store_url_android || 'https://play.google.com/store/apps/details?id=com.triptracker.app';

  if (minSupported && semverCompare(appVersion, minSupported) < 0) {
    return {
      action: 'update_required',
      message: `Version ${appVersion} is no longer supported. Please update to version ${minSupported} or newer.`,
      store_url: storeUrl,
    };
  }

  if (recommended && semverCompare(appVersion, recommended) < 0) {
    return {
      action: 'update_recommended',
      message: `A newer version (${recommended}) of Trip Tracker is available.`,
      store_url: storeUrl,
    };
  }

  return {
    action: 'allow',
    message: null,
    store_url: storeUrl,
  };
}

/**
 * Formats FCM message body as constructed by supabase/functions/send-push/index.ts
 */
function buildFcmMessage(
  token: { fcm_token: string; client: 'capacitor' | 'flutter'; platform: 'ios' | 'android' },
  notification: { title: string; body: string },
  dataPayload: { tripId?: string; route?: string; type?: string }
) {
  const fcmData: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(dataPayload).map(([k, v]) => [k, String(v ?? '')])
    ),
    click_action: 'FLUTTER_NOTIFICATION_CLICK',
  };

  return {
    token: token.fcm_token,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: fcmData,
    android: {
      priority: 'high',
      notification: {
        channel_id: 'trip_updates',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.body,
          },
          sound: 'default',
          badge: 1,
          'content-available': 1,
          'mutable-content': 1,
        },
      },
    },
  };
}

describe('Native Dual-Client Delivery & Version Gate Parity', () => {
  describe('Semver Comparison Logic (0112_native_app_version_gate.sql parity)', () => {
    it('compares identical versions', () => {
      expect(semverCompare('1.0.0', '1.0.0')).toBe(0);
      expect(semverCompare('2.4.12', '2.4.12')).toBe(0);
    });

    it('identifies older and newer patch versions', () => {
      expect(semverCompare('1.0.0', '1.0.1')).toBe(-1);
      expect(semverCompare('1.0.2', '1.0.1')).toBe(1);
    });

    it('identifies minor and major version differences', () => {
      expect(semverCompare('1.1.0', '1.2.0')).toBe(-1);
      expect(semverCompare('2.0.0', '1.9.9')).toBe(1);
      expect(semverCompare('0.9.5', '1.0.0')).toBe(-1);
    });

    it('handles missing minor/patch components safely', () => {
      expect(semverCompare('1', '1.0.0')).toBe(0);
      expect(semverCompare('1.1', '1.1.0')).toBe(0);
      expect(semverCompare('1.2', '1.1.9')).toBe(1);
    });
  });

  describe('Version Gate Evaluation', () => {
    const mockConfig = {
      maintenance_mode: false,
      maintenance_message: 'Server upgrade in progress',
      min_supported_version_ios: '1.0.0',
      min_supported_version_android: '1.0.0',
      recommended_version_ios: '1.2.0',
      recommended_version_android: '1.2.0',
      store_url_ios: 'https://apps.apple.com/app/id123456789',
      store_url_android: 'https://play.google.com/store/apps/details?id=com.triptracker.app',
    };

    it('allows client with current recommended version', () => {
      const res = evaluateVersionGate('ios', '1.2.0', mockConfig);
      expect(res.action).toBe('allow');
      expect(res.store_url).toBe('https://apps.apple.com/app/id123456789');
    });

    it('recommends update when version is below recommended but >= min supported', () => {
      const res = evaluateVersionGate('android', '1.1.0', mockConfig);
      expect(res.action).toBe('update_recommended');
      expect(res.message).toContain('A newer version (1.2.0)');
    });

    it('blocks and requires update when version is below min supported', () => {
      const res = evaluateVersionGate('ios', '0.9.2', mockConfig);
      expect(res.action).toBe('update_required');
      expect(res.message).toContain('is no longer supported');
    });

    it('returns maintenance mode regardless of client version', () => {
      const maintConfig = { ...mockConfig, maintenance_mode: true };
      const res = evaluateVersionGate('android', '2.0.0', maintConfig);
      expect(res.action).toBe('maintenance');
      expect(res.message).toBe('Server upgrade in progress');
    });
  });

  describe('Dual-Client Push Notification Payload Validation', () => {
    const mockUserTokens = [
      { fcm_token: 'token-cap-123', client: 'capacitor' as const, platform: 'ios' as const },
      { fcm_token: 'token-flt-456', client: 'flutter' as const, platform: 'android' as const },
    ];

    it('constructs valid FCM message for both Capacitor and Flutter tokens', () => {
      const notification = { title: 'Dinner bill added', body: 'Rahul added ₹1,450 for Dinner' };
      const dataPayload = { tripId: 'trip-999', route: '/trip/trip-999/expenses', type: 'expense_created' };

      const messages = mockUserTokens.map((t) => buildFcmMessage(t, notification, dataPayload));

      expect(messages).toHaveLength(2);

      // Capacitor token message check
      const capMsg = messages[0];
      expect(capMsg.token).toBe('token-cap-123');
      expect(capMsg.notification.title).toBe('Dinner bill added');
      expect(capMsg.data.tripId).toBe('trip-999');
      expect(capMsg.apns.payload.aps['content-available']).toBe(1);
      expect(capMsg.apns.payload.aps['mutable-content']).toBe(1);

      // Flutter token message check
      const fltMsg = messages[1];
      expect(fltMsg.token).toBe('token-flt-456');
      expect(fltMsg.data.route).toBe('/trip/trip-999/expenses');
      expect(fltMsg.data.click_action).toBe('FLUTTER_NOTIFICATION_CLICK');
      expect(fltMsg.android.notification.channel_id).toBe('trip_updates');
    });
  });
});
