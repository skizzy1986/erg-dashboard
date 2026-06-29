import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function createNotificationChannels() {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.createChannel({
    id: 'readiness',
    name: 'Readiness Alerts',
    importance: 3,
    sound: 'default',
  });
}

export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return 'granted';
  const { display } = await LocalNotifications.checkPermissions();
  if (display === 'granted') return 'granted';
  const { display: result } = await LocalNotifications.requestPermissions();
  return result;
}

export async function scheduleReadinessAlert() {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1001,
        title: 'Readiness check',
        body: "Check your TSB and plan today's session.",
        schedule: { every: 'day', allowWhileIdle: true },
        channelId: 'readiness',
      },
    ],
  });
}

export async function scheduleSessionReminder(sessionLabel, atDate) {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now() % 2147483647,
        title: 'Session reminder',
        body: sessionLabel,
        schedule: { at: atDate, allowWhileIdle: true },
      },
    ],
  });
}
