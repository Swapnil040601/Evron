/**
 * Utility service to provide native haptic vibration feedback on supported mobile devices.
 * Fallbacks gracefully on unsupported web browsers or sandboxed iframes.
 */
export const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
    try {
      window.navigator.vibrate(pattern);
    } catch (e) {
      // Catch and ignore iframe permission policy exceptions elegantly
    }
  }
};

/**
 * Standard tactile pattern profiles
 */
export const HAPTIC_PATTERNS = {
  // Soft, lightweight tick for tab transitions or small button taps
  light: 8,
  // Medium tap for regular interactive buttons
  medium: 20,
  // Strong impact vibration
  heavy: 50,
  // Two quick pulses for success / confirm operations
  success: [15, 30, 20],
  // Persistent warning pulsator for failure / alerts / actions
  warning: [50, 40, 50],
  // Heavy alarm vibration
  alarm: [100, 30, 100, 30, 150]
};
