import { WaterConditions } from './types';

/**
 * Calculate gut filling time based on water temperature
 * Based on scientific research data provided
 */
export function calculateGutFillingTime(temperature: number): {
  gutFillingMinutes: number;
  fecesExcretionMinutes: number;
  feedingEfficiency: number; // 0-1 scale
} {
  let gutFilling: number;
  let fecesExcretion: number;
  
  if (temperature <= 24) {
    gutFilling = 55;
    fecesExcretion = 105;
  } else if (temperature >= 30 && temperature <= 32) {
    gutFilling = 27.5; // average of 25-30
    fecesExcretion = 52.5; // average of 45-60
  } else if (temperature >= 34) {
    gutFilling = 20;
    fecesExcretion = 35;
  } else {
    // Linear interpolation for temperatures between ranges
    if (temperature > 24 && temperature < 30) {
      // Interpolate between 24°C and 30°C values
      const ratio = (temperature - 24) / (30 - 24);
      gutFilling = 55 - (55 - 27.5) * ratio;
      fecesExcretion = 105 - (105 - 52.5) * ratio;
    } else { // temperature > 32 && temperature < 34
      // Interpolate between 32°C and 34°C values
      const ratio = (temperature - 32) / (34 - 32);
      gutFilling = 27.5 - (27.5 - 20) * ratio;
      fecesExcretion = 52.5 - (52.5 - 35) * ratio;
    }
  }
  
  // Calculate feeding efficiency (optimal at 29-31°C)
  let efficiency: number;
  if (temperature >= 29 && temperature <= 31) {
    efficiency = 1.0; // 100% efficiency in optimal range
  } else {
    // 8-10% decrease per 1°C deviation (using 9% average)
    const optimalTemp = 30;
    const deviation = Math.abs(temperature - optimalTemp);
    efficiency = Math.max(0.1, 1.0 - (deviation * 0.09));
  }
  
  return {
    gutFillingMinutes: Math.round(gutFilling),
    fecesExcretionMinutes: Math.round(fecesExcretion),
    feedingEfficiency: Number(efficiency.toFixed(3))
  };
}

/**
 * Calculate optimal feeding schedule based on temperature
 */
export function calculateTemperatureBasedSchedule(
  temperature: number,
  totalDailyFeed: number
): {
  morningFeedPercentage: number;
  afternoonFeedPercentage: number;
  eveningFeedPercentage: number;
  optimalFeedingTimes: string[];
} {
  let morningPct: number;
  let afternoonPct: number;
  let eveningPct: number;
  
  if (temperature < 28) {
    // Reduce morning feeds in cooler water
    morningPct = 20;
    afternoonPct = 50; // Increase when temperature peaks
    eveningPct = 30;
  } else if (temperature >= 28 && temperature <= 32) {
    // Optimal temperature range - balanced feeding
    morningPct = 30;
    afternoonPct = 40;
    eveningPct = 30;
  } else {
    // High temperature - early morning and late evening
    morningPct = 35;
    afternoonPct = 25; // Reduce during peak heat
    eveningPct = 40;
  }
  
  const optimalTimes: string[] = [];
  
  if (temperature < 28) {
    optimalTimes.push('08:00', '14:00', '18:00');
  } else if (temperature <= 32) {
    optimalTimes.push('07:00', '13:00', '18:30');
  } else {
    optimalTimes.push('06:30', '15:30', '19:00');
  }
  
  return {
    morningFeedPercentage: morningPct,
    afternoonFeedPercentage: afternoonPct,
    eveningFeedPercentage: eveningPct,
    optimalFeedingTimes: optimalTimes
  };
}

/**
 * Calculate temperature adjustment factor for feed quantity
 */
export function calculateTemperatureAdjustmentFactor(
  currentTemp: number,
  optimalTemp: number = 30
): number {
  const deviation = Math.abs(currentTemp - optimalTemp);
  
  if (deviation === 0) return 1.0;
  
  // 8-10% decrease per 1°C (using 9% average)
  const reductionFactor = 1.0 - (deviation * 0.09);
  
  // Minimum 50% of optimal feeding even in extreme temperatures
  return Math.max(0.5, reductionFactor);
}

/**
 * Determine optimal tray checking time after feeding based on temperature
 */
export function calculateOptimalTrayCheckTime(temperature: number): {
  minMinutes: number;
  maxMinutes: number;
  recommendedMinutes: number;
} {
  const { gutFillingMinutes } = calculateGutFillingTime(temperature);
  
  // Check trays 1-2 hours post-feeding, but adjust based on gut filling time
  const baseCheckTime = gutFillingMinutes + 30; // 30 minutes after gut filling
  
  return {
    minMinutes: Math.max(60, baseCheckTime), // minimum 1 hour
    maxMinutes: Math.min(120, baseCheckTime + 60), // maximum 2 hours
    recommendedMinutes: Math.round((baseCheckTime + baseCheckTime + 30) / 2)
  };
}