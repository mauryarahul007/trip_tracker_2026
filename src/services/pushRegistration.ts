import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';

// onAuthStateChange fires registerForPushNotifications() on every auth
// event — including TOKEN_REFRESHED, roughly hourly on a long session —
// so guard against piling up duplicate 'registration'/'registrationError'
// listeners (and redundant PushNotifications.register() calls) across
// calls within the same device session.
let isRegistered = false;

// The most recently registered FCM token for THIS device, so sign-out
// can scope its delete to (user_id, fcm_token) instead of user_id alone
// — otherwise signing out on one device would also delete the same
// user's OTHER devices' push registrations.
let lastRegisteredToken: string | null = null;

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (isRegistered) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.addListener('registration', async (token) => {
      lastRegisteredToken = token.value;
      await supabase.from('device_push_tokens').upsert(
        {
          user_id: userId,
          platform: Capacitor.getPlatform() as 'ios' | 'android',
          fcm_token: token.value,
        },
        { onConflict: 'user_id,fcm_token' }
      );
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration failed:', err);
    });

    await PushNotifications.register();
    isRegistered = true;
  } catch (err) {
    console.error('Push notification setup failed:', err);
  }
}

export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // No token registered on this device (e.g. permission was denied) —
    // nothing to delete, and deleting by user_id alone would wipe out
    // this user's other devices' registrations too.
    if (lastRegisteredToken) {
      await supabase.from('device_push_tokens').delete().eq('user_id', userId).eq('fcm_token', lastRegisteredToken);
    }
    await PushNotifications.removeAllListeners();
  } catch (err) {
    console.error('Push notification teardown failed:', err);
  } finally {
    isRegistered = false;
    lastRegisteredToken = null;
  }
}
