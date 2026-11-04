import * as Haptics from 'expo-haptics';

export const soundService = {
  /**
   * Instant haptic notification feedback (Zero network delay)
   */
  async playSuccessSound() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
  },

  /**
   * Instant barcode scanner haptic feedback
   */
  async playScanBeep() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
  },
};
