/**
 * Color utilities for smooth heatmap transitions
 * Blue (low) → Orange (medium) → Red (high)
 */

// Color palette for activity heat mapping
export const HEATMAP_COLORS = {
  LOW: { r: 59, g: 130, b: 246 },      // Blue #3B82F6
  MEDIUM: { r: 251, g: 146, b: 60 },   // Orange #FB923C  
  HIGH: { r: 239, g: 68, b: 68 }       // Red #EF4444
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(color1, color2, factor) {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * factor),
    g: Math.round(color1.g + (color2.g - color1.g) * factor),
    b: Math.round(color1.b + (color2.b - color1.b) * factor)
  }
}

/**
 * Convert RGB object to hex string
 */
export function rgbToHex(color) {
  const r = Math.max(0, Math.min(255, color.r))
  const g = Math.max(0, Math.min(255, color.g))
  const b = Math.max(0, Math.min(255, color.b))
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Get heatmap color based on activity level (0-1)
 * Smooth transition: Blue (0) → Orange (0.5) → Red (1)
 */
export function getHeatmapColor(activityLevel) {
  const level = Math.max(0, Math.min(1, activityLevel))
  
  let color
  if (level <= 0.5) {
    // Blue to Orange (0 to 0.5)
    const factor = level / 0.5
    color = interpolateColor(HEATMAP_COLORS.LOW, HEATMAP_COLORS.MEDIUM, factor)
  } else {
    // Orange to Red (0.5 to 1)
    const factor = (level - 0.5) / 0.5
    color = interpolateColor(HEATMAP_COLORS.MEDIUM, HEATMAP_COLORS.HIGH, factor)
  }
  
  return rgbToHex(color)
}

/**
 * Get heatmap color with alpha transparency
 */
export function getHeatmapColorWithAlpha(activityLevel, alpha = 1) {
  const level = Math.max(0, Math.min(1, activityLevel))
  
  let color
  if (level <= 0.5) {
    const factor = level / 0.5
    color = interpolateColor(HEATMAP_COLORS.LOW, HEATMAP_COLORS.MEDIUM, factor)
  } else {
    const factor = (level - 0.5) / 0.5
    color = interpolateColor(HEATMAP_COLORS.MEDIUM, HEATMAP_COLORS.HIGH, factor)
  }
  
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
}

/**
 * Calculate pulse intensity based on activity level
 * Higher activity = stronger pulse
 */
export function getPulseIntensity(activityLevel) {
  const level = Math.max(0, Math.min(1, activityLevel))
  // Scale from 0.1 (subtle) to 1.0 (strong pulse)
  return 0.1 + (level * 0.9)
}

/**
 * Get pulse scale factor for animation
 * Creates a smooth heartbeat-like pulse
 */
export function getPulseScale(time, intensity, baseScale = 1) {
  // Create heartbeat pattern: quick beat, pause, quick beat, long pause
  const beatCycle = 2000 // 2 second cycle
  const normalizedTime = (time % beatCycle) / beatCycle
  
  let pulseValue = 0
  
  if (normalizedTime < 0.15) {
    // First beat
    pulseValue = Math.sin(normalizedTime * (Math.PI / 0.15))
  } else if (normalizedTime >= 0.3 && normalizedTime < 0.45) {
    // Second beat
    const localTime = normalizedTime - 0.3
    pulseValue = Math.sin(localTime * (Math.PI / 0.15)) * 0.8
  }
  // Else rest period (pulseValue = 0)
  
  const scaleMultiplier = 1 + (pulseValue * intensity * 0.2)
  return baseScale * scaleMultiplier
}

/**
 * Smooth color transition animation
 */
export function createColorTransition(startColor, endColor, duration = 1000) {
  return {
    from: startColor,
    to: endColor,
    duration,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)' // Smooth easing
  }
}