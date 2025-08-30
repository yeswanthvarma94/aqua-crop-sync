import { ShrimpBatch, PondArea } from './types';

/**
 * Calculate current biomass using the precision formula
 * Biomass = Initial Stock × Survival Rate × Current ABW
 */
export function calculateCurrentBiomass(batch: ShrimpBatch): {
  totalBiomass: number; // kg
  individualCount: number;
  biomassPerM2: number;
  confidence: 'high' | 'medium' | 'low';
} {
  const totalCount = batch.initialStock * batch.currentSurvivalRate;
  const totalBiomassGrams = totalCount * batch.averageBodyWeight;
  const totalBiomassKg = totalBiomassGrams / 1000;
  
  // Confidence based on days old and survival rate
  let confidence: 'high' | 'medium' | 'low';
  if (batch.daysOld >= 30 && batch.currentSurvivalRate >= 0.7) {
    confidence = 'high';
  } else if (batch.daysOld >= 15 && batch.currentSurvivalRate >= 0.5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    totalBiomass: Number(totalBiomassKg.toFixed(2)),
    individualCount: Math.round(totalCount),
    biomassPerM2: 0, // Will be calculated when pond area is provided
    confidence
  };
}

/**
 * Calculate biomass density per square meter
 */
export function calculateBiomassDensity(
  biomass: number, // kg
  pondArea: PondArea
): {
  densityPerM2: number; // kg/m²
  densityPerHectare: number; // kg/ha
  stockingDensity: number; // individuals/m²
  recommendedDensity: { min: number; max: number }; // kg/m²
} {
  const densityPerM2 = biomass / pondArea.activeArea;
  const densityPerHectare = densityPerM2 * 10000; // convert to hectare
  
  // Recommended density for shrimp farming (varies by system)
  const recommendedDensity = {
    min: 0.5, // kg/m² minimum sustainable
    max: 2.0  // kg/m² maximum for good water quality
  };
  
  return {
    densityPerM2: Number(densityPerM2.toFixed(3)),
    densityPerHectare: Number(densityPerHectare.toFixed(1)),
    stockingDensity: 0, // Requires individual count
    recommendedDensity
  };
}

/**
 * Calculate cast net sampling efficiency and biomass estimate
 * Using 3.3m diameter cast net with 60% bottom coverage efficiency
 */
export function calculateCastNetBiomassEstimate(
  samples: Array<{
    shrimpCount: number;
    totalWeight: number; // grams
    castArea: number; // m²
  }>,
  pondArea: PondArea
): {
  estimatedBiomass: number; // kg
  averageBodyWeight: number; // grams
  estimatedPopulation: number;
  samplingAccuracy: number; // 0-1
  confidenceInterval: { min: number; max: number };
} {
  const netDiameter = 3.3; // meters
  const coverageEfficiency = 0.6;
  const effectiveArea = Math.PI * Math.pow(netDiameter / 2, 2) * coverageEfficiency;
  
  // Calculate averages from samples
  const totalShrimp = samples.reduce((sum, sample) => sum + sample.shrimpCount, 0);
  const totalWeight = samples.reduce((sum, sample) => sum + sample.totalWeight, 0);
  const sampleCount = samples.length;
  
  if (totalShrimp === 0 || sampleCount === 0) {
    return {
      estimatedBiomass: 0,
      averageBodyWeight: 0,
      estimatedPopulation: 0,
      samplingAccuracy: 0,
      confidenceInterval: { min: 0, max: 0 }
    };
  }
  
  const avgBodyWeight = totalWeight / totalShrimp;
  const avgShrimpPerM2 = totalShrimp / (effectiveArea * sampleCount);
  
  // Scale up to pond level
  const estimatedPopulation = avgShrimpPerM2 * pondArea.activeArea;
  const estimatedBiomassGrams = estimatedPopulation * avgBodyWeight;
  const estimatedBiomassKg = estimatedBiomassGrams / 1000;
  
  // Calculate sampling accuracy based on sample variance
  const weights = samples.map(s => s.shrimpCount > 0 ? s.totalWeight / s.shrimpCount : 0);
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgBodyWeight, 2), 0) / weights.length;
  const coefficientOfVariation = Math.sqrt(variance) / avgBodyWeight;
  const samplingAccuracy = Math.max(0.5, 1 - coefficientOfVariation);
  
  // Confidence interval (±20% for typical cast net sampling)
  const confidenceRange = estimatedBiomassKg * 0.2;
  
  return {
    estimatedBiomass: Number(estimatedBiomassKg.toFixed(2)),
    averageBodyWeight: Number(avgBodyWeight.toFixed(2)),
    estimatedPopulation: Math.round(estimatedPopulation),
    samplingAccuracy: Number(samplingAccuracy.toFixed(3)),
    confidenceInterval: {
      min: Number((estimatedBiomassKg - confidenceRange).toFixed(2)),
      max: Number((estimatedBiomassKg + confidenceRange).toFixed(2))
    }
  };
}

/**
 * Calculate survival rate based on sampling data
 */
export function calculateSurvivalRate(
  initialStock: number,
  sampledPopulation: number,
  sampledArea: number,
  totalArea: number,
  daysOld: number
): {
  estimatedSurvival: number; // 0-1
  mortalityRate: number; // per day
  expectedSurvival: number; // industry standard
  performance: 'excellent' | 'good' | 'average' | 'poor';
} {
  const scaledPopulation = (sampledPopulation / sampledArea) * totalArea;
  const estimatedSurvival = Math.min(1, scaledPopulation / initialStock);
  
  // Daily mortality rate
  const mortalityRate = (1 - Math.pow(estimatedSurvival, 1/daysOld)) * 100;
  
  // Industry standard survival rates by age
  let expectedSurvival: number;
  if (daysOld <= 30) {
    expectedSurvival = 0.85; // 85% for first month
  } else if (daysOld <= 60) {
    expectedSurvival = 0.75; // 75% for second month
  } else if (daysOld <= 90) {
    expectedSurvival = 0.70; // 70% for third month
  } else {
    expectedSurvival = 0.65; // 65% for harvest
  }
  
  // Performance rating
  let performance: 'excellent' | 'good' | 'average' | 'poor';
  const ratio = estimatedSurvival / expectedSurvival;
  if (ratio >= 1.1) {
    performance = 'excellent';
  } else if (ratio >= 0.95) {
    performance = 'good';
  } else if (ratio >= 0.80) {
    performance = 'average';
  } else {
    performance = 'poor';
  }
  
  return {
    estimatedSurvival: Number(estimatedSurvival.toFixed(3)),
    mortalityRate: Number(mortalityRate.toFixed(2)),
    expectedSurvival,
    performance
  };
}

/**
 * Calculate weekly growth rate and projections
 */
export function calculateGrowthRate(
  previousWeight: number, // grams
  currentWeight: number, // grams
  daysBetween: number
): {
  weeklyGrowthRate: number; // grams/week
  dailyGrowthRate: number; // grams/day
  growthPercentage: number; // % increase
  isHealthyGrowth: boolean;
} {
  const dailyGrowth = (currentWeight - previousWeight) / daysBetween;
  const weeklyGrowth = dailyGrowth * 7;
  const growthPercentage = ((currentWeight - previousWeight) / previousWeight) * 100;
  
  // Healthy growth for shrimp: 0.8-1.2g per week depending on size
  const expectedWeeklyGrowth = currentWeight < 10 ? 0.8 : 
                               currentWeight < 20 ? 1.0 : 1.2;
  const isHealthyGrowth = weeklyGrowth >= (expectedWeeklyGrowth * 0.8);
  
  return {
    weeklyGrowthRate: Number(weeklyGrowth.toFixed(2)),
    dailyGrowthRate: Number(dailyGrowth.toFixed(3)),
    growthPercentage: Number(growthPercentage.toFixed(1)),
    isHealthyGrowth
  };
}