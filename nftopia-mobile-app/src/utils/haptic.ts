import * as Haptics from 'expo-haptics';

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';
export type HapticSelectionType = 'selection';

export class HapticFeedback {
  static impact(style: HapticImpactStyle = 'light'): void {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[style]);
  }

  static notification(type: HapticNotificationType): void {
    const map = {
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    };
    Haptics.notificationAsync(map[type]);
  }

  static selection(): void {
    Haptics.selectionAsync();
  }

  static light(): void {
    this.impact('light');
  }

  static medium(): void {
    this.impact('medium');
  }

  static heavy(): void {
    this.impact('heavy');
  }

  static success(): void {
    this.notification('success');
  }

  static warning(): void {
    this.notification('warning');
  }

  static error(): void {
    this.notification('error');
  }

  static onPress(style: HapticImpactStyle = 'light'): void {
    this.impact(style);
  }

  static onLongPress(): void {
    this.impact('heavy');
  }

  static onSuccess(): void {
    this.success();
  }

  static onError(): void {
    this.error();
  }
}