import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.addListener('registration', async (token) => {
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
  } catch (err) {
    console.error('Push notification setup failed:', err);
  }
}

export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await supabase.from('device_push_tokens').delete().eq('user_id', userId);
    await PushNotifications.removeAllListeners();
  } catch (err) {
    console.error('Push notification teardown failed:', err);
  }
}
