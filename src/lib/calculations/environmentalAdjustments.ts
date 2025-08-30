import { WaterConditions, WeatherCondition, FecalStrandQuality, ShrimpActivity } from './types';

/**
 * Calculate water quality adjustment factor for feeding
 * Reduces feeding during high ammonia/nitrite periods
 */
export function calculateWaterQualityAdjustment(conditions: WaterConditions): {
  adjustmentFactor: number; // 0-1 multiplier
  recommendations: string[];
  severity: 'good' | 'caution' | 'critical';
} {
  const recommendations: string[] = [];
  let adjustmentFactor = 1.0;
  let severity: 'good' | 'caution' | 'critical' = 'good';
  
  // Ammonia levels (mg/L)
  if (conditions.ammonia > 0.5) {
    adjustmentFactor *= 0.95; // Reduce 5%
    recommendations.push('High ammonia detected - reduce feeding by 5%');
    severity = 'caution';
  }
  if (conditions.ammonia > 1.0) {
    adjustmentFactor *= 0.90; // Additional 5% reduction (total 10%)
    recommendations.push('Critical ammonia levels - emergency water management needed');
    severity = 'critical';
  }
  
  // Nitrite levels (mg/L)
  if (conditions.nitrite > 0.3) {
    adjustmentFactor *= 0.95; // Reduce 5%
    recommendations.push('High nitrite detected - reduce feeding by 5%');
    severity = severity === 'critical' ? 'critical' : 'caution';
  }
  if (conditions.nitrite > 0.6) {
    adjustmentFactor *= 0.90; // Additional 5% reduction
    recommendations.push('Critical nitrite levels - increase water exchange');
    severity = 'critical';
  }
  
  // Dissolved Oxygen (mg/L)
  if (conditions.dissolvedOxygen < 4.0) {
    adjustmentFactor *= 0.90; // Reduce 10%
    recommendations.push('Low dissolved oxygen - reduce feeding and increase aeration');
    severity = severity === 'critical' ? 'critical' : 'caution';
  }
  if (conditions.dissolvedOxygen < 3.0) {
    adjustmentFactor *= 0.80; // Additional 10% reduction (total 20%)
    recommendations.push('Critical oxygen levels - emergency aeration required');
    severity = 'critical';
  }
  
  // pH levels
  if (conditions.ph < 7.5 || conditions.ph > 8.5) {
    adjustmentFactor *= 0.95; // Reduce 5%
    recommendations.push('pH outside optimal range (7.5-8.5) - adjust water chemistry');
    severity = severity === 'critical' ? 'critical' : 'caution';
  }
  
  return {
    adjustmentFactor: Number(adjustmentFactor.toFixed(3)),
    recommendations,
    severity
  };
}

/**
 * Calculate weather-based feeding adjustments
 */
export function calculateWeatherAdjustment(weather: WeatherCondition): {
  adjustmentFactor: number;
  recommendations: string[];
  optimalFeedingTimes: string[];
} {
  let adjustmentFactor = 1.0;
  const recommendations: string[] = [];
  let optimalFeedingTimes: string[] = ['07:00', '13:00', '18:00']; // Default times
  
  switch (weather.type) {
    case 'rainy':
      adjustmentFactor = 0.90; // Reduce 10% total daily ration
      recommendations.push('Rainy weather - reduce total daily feed by 10%');
      
      if (weather.intensity === 'heavy') {
        adjustmentFactor = 0.80; // Additional reduction for heavy rain
        recommendations.push('Heavy rain - consider skipping midday feeding');
        optimalFeedingTimes = ['07:30', '17:30']; // Only morning and evening
      } else {
        optimalFeedingTimes = ['08:00', '14:00', '17:30']; // Adjusted times
      }
      break;
      
    case 'cloudy':
      adjustmentFactor = 0.95; // Slight reduction
      recommendations.push('Cloudy weather - monitor tray consumption closely');
      optimalFeedingTimes = ['07:30', '13:30', '18:00']; // Standard with slight delay
      break;
      
    case 'sunny':
      // No adjustment needed for sunny weather
      recommendations.push('Optimal feeding conditions');
      break;
  }
  
  return {
    adjustmentFactor: Number(adjustmentFactor.toFixed(2)),
    recommendations,
    optimalFeedingTimes
  };
}

/**
 * Calculate molting period adjustments
 * Typically occurs every 15-20 days in growing shrimp
 */
export function calculateMoltingAdjustment(
  daysInCycle: number,
  fecalQuality: FecalStrandQuality,
  activity: ShrimpActivity
): {
  isMoltingPeriod: boolean;
  adjustmentFactor: number;
  daysRemaining: number;
  recommendations: string[];
} {
  // Molting typically occurs every 15-20 days
  const cycleLength = 18; // average
  const daysIntoCurrentCycle = daysInCycle % cycleLength;
  
  // Molting indicators
  const moltingSignals = [
    fecalQuality.quality === 'poor',
    fecalQuality.length === 'short',
    activity.level === 'low',
    activity.feedingResponse === 'poor'
  ];
  
  const moltingScore = moltingSignals.filter(Boolean).length;
  
  // Predict molting period (typically days 14-17 of cycle)
  const isMoltingPeriod = (daysIntoCurrentCycle >= 14 && daysIntoCurrentCycle <= 17) || moltingScore >= 2;
  
  let adjustmentFactor = 1.0;
  const recommendations: string[] = [];
  let daysRemaining = 0;
  
  if (isMoltingPeriod) {
    adjustmentFactor = 0.90; // Reduce 10% for 2-3 days
    daysRemaining = Math.min(3, 18 - daysIntoCurrentCycle);
    recommendations.push('Molting period detected - reduce feeding by 10%');
    recommendations.push('Monitor shrimp activity and fecal strand quality');
    recommendations.push('Expect reduced feeding response for 2-3 days');
  } else if (daysIntoCurrentCycle >= 11 && daysIntoCurrentCycle <= 13) {
    recommendations.push('Pre-molting phase - monitor for signs of molting');
    recommendations.push('Prepare for potential feeding reduction in 1-3 days');
  }
  
  return {
    isMoltingPeriod,
    adjustmentFactor: Number(adjustmentFactor.toFixed(2)),
    daysRemaining,
    recommendations
  };
}

/**
 * Calculate dissolved oxygen feeding dependency
 * Run aerators 30 minutes pre-feeding to optimize consumption
 */
export function calculateDissolvedOxygenRequirement(
  currentDO: number, // mg/L
  targetDO: number = 5.5, // mg/L optimal for feeding
  pondVolume: number // cubic meters
): {
  aerationNeeded: boolean;
  aerationMinutes: number;
  oxygenDeficit: number; // mg/L
  estimatedConsumption: number; // % of normal
  recommendations: string[];
} {
  const oxygenDeficit = Math.max(0, targetDO - currentDO);
  const aerationNeeded = oxygenDeficit > 0.5;
  
  // Calculate aeration time needed (rough estimate)
  // Typical aeration can increase DO by 1-2 mg/L per hour
  const aerationMinutes = aerationNeeded ? Math.ceil((oxygenDeficit / 1.5) * 60) : 0;
  
  // Estimate feeding consumption based on DO levels
  let estimatedConsumption: number;
  if (currentDO >= 5.0) {
    estimatedConsumption = 100; // Optimal consumption
  } else if (currentDO >= 4.0) {
    estimatedConsumption = 85; // Reduced consumption
  } else if (currentDO >= 3.0) {
    estimatedConsumption = 65; // Poor consumption
  } else {
    estimatedConsumption = 40; // Critical - survival mode
  }
  
  const recommendations: string[] = [];
  
  if (aerationNeeded) {
    recommendations.push(`Run aerators for ${Math.min(aerationMinutes, 60)} minutes before feeding`);
    recommendations.push('Monitor dissolved oxygen levels throughout the day');
  }
  
  if (currentDO < 4.0) {
    recommendations.push('Dissolved oxygen below optimal - reduce feeding quantity');
    recommendations.push('Increase water circulation and aeration');
  }
  
  if (currentDO < 3.0) {
    recommendations.push('Critical oxygen levels - emergency aeration required');
    recommendations.push('Consider reducing stocking density if problem persists');
  }
  
  return {
    aerationNeeded,
    aerationMinutes: Math.min(aerationMinutes, 120), // Cap at 2 hours
    oxygenDeficit: Number(oxygenDeficit.toFixed(1)),
    estimatedConsumption,
    recommendations
  };
}

/**
 * Calculate comprehensive environmental adjustment factor
 * Combines all environmental factors into single multiplier
 */
export function calculateComprehensiveEnvironmentalAdjustment(
  waterConditions: WaterConditions,
  weather: WeatherCondition,
  daysInCycle: number,
  fecalQuality: FecalStrandQuality,
  activity: ShrimpActivity
): {
  totalAdjustmentFactor: number;
  individualFactors: {
    waterQuality: number;
    weather: number;
    molting: number;
    dissolvedOxygen: number;
  };
  criticalAlerts: string[];
  recommendations: string[];
  feedingConfidence: 'high' | 'medium' | 'low';
} {
  const waterQualityResult = calculateWaterQualityAdjustment(waterConditions);
  const weatherResult = calculateWeatherAdjustment(weather);
  const moltingResult = calculateMoltingAdjustment(daysInCycle, fecalQuality, activity);
  const doResult = calculateDissolvedOxygenRequirement(waterConditions.dissolvedOxygen, 5.5, 1000);
  
  const individualFactors = {
    waterQuality: waterQualityResult.adjustmentFactor,
    weather: weatherResult.adjustmentFactor,
    molting: moltingResult.adjustmentFactor,
    dissolvedOxygen: doResult.estimatedConsumption / 100
  };
  
  // Combined adjustment factor
  const totalAdjustmentFactor = Object.values(individualFactors).reduce((acc, factor) => acc * factor, 1);
  
  // Collect critical alerts
  const criticalAlerts: string[] = [];
  if (waterQualityResult.severity === 'critical') {
    criticalAlerts.push('Critical water quality conditions detected');
  }
  if (waterConditions.dissolvedOxygen < 3.0) {
    criticalAlerts.push('Critical dissolved oxygen levels');
  }
  if (weather.type === 'rainy' && weather.intensity === 'heavy') {
    criticalAlerts.push('Heavy rainfall affecting feeding conditions');
  }
  
  // Combine all recommendations
  const recommendations = [
    ...waterQualityResult.recommendations,
    ...weatherResult.recommendations,
    ...moltingResult.recommendations,
    ...doResult.recommendations
  ];
  
  // Determine feeding confidence
  let feedingConfidence: 'high' | 'medium' | 'low';
  if (criticalAlerts.length > 0 || totalAdjustmentFactor < 0.7) {
    feedingConfidence = 'low';
  } else if (waterQualityResult.severity === 'caution' || totalAdjustmentFactor < 0.9) {
    feedingConfidence = 'medium';
  } else {
    feedingConfidence = 'high';
  }
  
  return {
    totalAdjustmentFactor: Number(totalAdjustmentFactor.toFixed(3)),
    individualFactors,
    criticalAlerts,
    recommendations,
    feedingConfidence
  };
}