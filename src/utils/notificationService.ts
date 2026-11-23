import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AndroidImportance,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function jobUpdatesEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('@resq_notif_prefs');
    if (!raw) return true;
    const preferences = JSON.parse(raw);
    return preferences.jobUpdates !== false;
  } catch {
    return true;
  }
}

export async function prepareRescueNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'web' || !(await jobUpdatesEnabled())) return false;

    if (Platform.OS === 'android') {
      await setNotificationChannelAsync('rescue-updates', {
        name: 'Rescue updates',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 200, 250],
        sound: 'default',
      });
    }

    let permission = await getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await requestPermissionsAsync();
    }
    return permission.granted;
  } catch (error) {
    console.warn('Could not prepare rescue notifications:', error);
    return false;
  }
}

export async function notifyRescueEvent(
  eventId: string,
  title: string,
  body: string,
): Promise<void> {
  if (!eventId || !(await prepareRescueNotifications())) return;
  try {
    await scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { eventId },
        ...(Platform.OS === 'android' ? { channelId: 'rescue-updates' } : {}),
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Could not schedule rescue notification:', error);
  }
}