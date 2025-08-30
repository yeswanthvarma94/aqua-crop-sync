import { TrayScore, FCRData, ShrimpBatch } from './types';

/**
 * Calculate feeding adjustment based on tray scoring (0-3 scale)
 * Score 3: Fully consumed, high activity → Increase +10%
 * Score 2: <10% excess feed → Increase +5%  
 * Score 1: 10-20% excess feed → Maintain
 * Score 0: >20% excess feed, low activity → Reduce -10%
 */
export function calculateTrayScoreAdjustment(
  trayScores: TrayScore[],
  currentFeedAmount: number
): {
  recommendedAdjustment: number; // percentage change
  newFeedAmount: number;
  averageScore: number;
  confidence: 'high' | 'medium' | 'low';
} {
  if (trayScores.length === 0) {
    return {
      recommendedAdjustment: 0,
      newFeedAmount: currentFeedAmount,
      averageScore: 0,
      confidence: 'low'
    };
  }
  
  const averageScore = trayScores.reduce((sum, score) => sum + score.score, 0) / trayScores.length;
  
  let adjustmentPercentage: number;
  if (averageScore >= 2.5) {
    adjustmentPercentage = 10; // Increase 10%
  } else if (averageScore >= 1.5) {
    adjustmentPercentage = 5; // Increase 5%
  } else if (averageScore >= 0.5) {
    adjustmentPercentage = 0; // Maintain
  } else {
    adjustmentPercentage = -10; // Reduce 10%
  }
  
  const newFeedAmount = currentFeedAmount * (1 + adjustmentPercentage / 100);
  
  // Confidence based on number of trays and score consistency
  const scoreVariance = trayScores.reduce((sum, score) => sum + Math.pow(score.score - averageScore, 2), 0) / trayScores.length;
  let confidence: 'high' | 'medium' | 'low';
  
  if (trayScores.length >= 3 && scoreVariance <= 0.5) {
    confidence = 'high';
  } else if (trayScores.length >= 2 && scoreVariance <= 1.0) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    recommendedAdjustment: adjustmentPercentage,
    newFeedAmount: Number(newFeedAmount.toFixed(2)),
    averageScore: Number(averageScore.toFixed(1)),
    confidence
  };
}

/**
 * Calculate size-specific daily feeding rates based on shrimp weight
 * Industry standard feeding rates by body weight
 */
export function calculateSizeSpecificFeedingRate(shrimpWeight: number): {
  feedingRatePercent: number; // % of body weight per day
  feedingRateRange: { min: number; max: number };
  category: string;
} {
  let feedingRate: number;
  let feedingRange: { min: number; max: number };
  let category: string;
  
  if (shrimpWeight >= 2 && shrimpWeight < 3) {
    feedingRate = 7.5; // average of 8.0-7.0
    feedingRange = { min: 7.0, max: 8.0 };
    category = '2-3g';
  } else if (shrimpWeight >= 3 && shrimpWeight < 5) {
    feedingRate = 6.25; // average of 7.0-5.5
    feedingRange = { min: 5.5, max: 7.0 };
    category = '3-5g';
  } else if (shrimpWeight >= 5 && shrimpWeight < 10) {
    feedingRate = 5.0; // average of 5.5-4.5
    feedingRange = { min: 4.5, max: 5.5 };
    category = '5-10g';
  } else if (shrimpWeight >= 10 && shrimpWeight < 15) {
    feedingRate = 4.15; // average of 4.5-3.8
    feedingRange = { min: 3.8, max: 4.5 };
    category = '10-15g';
  } else if (shrimpWeight >= 15 && shrimpWeight < 20) {
    feedingRate = 3.5; // average of 3.8-3.2
    feedingRange = { min: 3.2, max: 3.8 };
    category = '15-20g';
  } else if (shrimpWeight >= 20 && shrimpWeight < 25) {
    feedingRate = 3.05; // average of 3.2-2.9
    feedingRange = { min: 2.9, max: 3.2 };
    category = '20-25g';
  } else if (shrimpWeight >= 25 && shrimpWeight < 30) {
    feedingRate = 2.7; // average of 2.9-2.5
    feedingRange = { min: 2.5, max: 2.9 };
    category = '25-30g';
  } else if (shrimpWeight >= 30 && shrimpWeight < 35) {
    feedingRate = 2.4; // average of 2.5-2.3
    feedingRange = { min: 2.3, max: 2.5 };
    category = '30-35g';
  } else if (shrimpWeight >= 35 && shrimpWeight <= 40) {
    feedingRate = 2.2; // average of 2.3-2.1
    feedingRange = { min: 2.1, max: 2.3 };
    category = '35-40g';
  } else if (shrimpWeight < 2) {
    feedingRate = 8.0; // high rate for very small shrimp
    feedingRange = { min: 7.5, max: 8.5 };
    category = '<2g';
  } else { // > 40g
    feedingRate = 2.0; // reduced rate for large shrimp
    feedingRange = { min: 1.8, max: 2.2 };
    category = '>40g';
  }
  
  return {
    feedingRatePercent: feedingRate,
    feedingRateRange: feedingRange,
    category
  };
}

/**
 * Calculate Feed Conversion Ratio (FCR)
 * FCR = Total Feed Given / Total Biomass Gained
 */
export function calculateFCR(
  totalFeedGiven: number, // kg
  initialBiomass: number, // kg
  finalBiomass: number // kg
): {
  fcr: number;
  fcrCategory: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  biomassGained: number;
  efficiency: number; // 0-1 scale
} {
  const biomassGained = finalBiomass - initialBiomass;
  
  if (biomassGained <= 0) {
    return {
      fcr: Infinity,
      fcrCategory: 'critical',
      biomassGained: 0,
      efficiency: 0
    };
  }
  
  const fcr = totalFeedGiven / biomassGained;
  
  // FCR Categories based on commercial standards
  let fcrCategory: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  if (fcr <= 1.2) {
    fcrCategory = 'excellent'; // Target FCR 1.1-1.2
  } else if (fcr <= 1.4) {
    fcrCategory = 'good';
  } else if (fcr <= 1.5) {
    fcrCategory = 'average';
  } else if (fcr <= 2.0) {
    fcrCategory = 'poor';
  } else {
    fcrCategory = 'critical'; // Alert threshold
  }
  
  // Efficiency is inverse of FCR, normalized
  const efficiency = Math.min(1, 1.2 / fcr); // 1.2 is target FCR
  
  return {
    fcr: Number(fcr.toFixed(2)),
    fcrCategory,
    biomassGained: Number(biomassGained.toFixed(2)),
    efficiency: Number(efficiency.toFixed(3))
  };
}

/**
 * Calculate rolling FCR average for trend analysis
 */
export function calculateRollingFCR(
  fcrData: FCRData[],
  days: number = 7
): {
  rollingFCR: number;
  trend: 'improving' | 'stable' | 'declining';
  dataPoints: number;
} {
  if (fcrData.length === 0) {
    return { rollingFCR: 0, trend: 'stable', dataPoints: 0 };
  }
  
  // Sort by date and take last 'days' worth of data
  const sortedData = fcrData
    .sort((a, b) => b.period.end.getTime() - a.period.end.getTime())
    .slice(0, days);
  
  const totalFeed = sortedData.reduce((sum, data) => sum + data.feedGiven, 0);
  const totalBiomass = sortedData.reduce((sum, data) => sum + data.biomassGained, 0);
  
  const rollingFCR = totalBiomass > 0 ? totalFeed / totalBiomass : 0;
  
  // Determine trend by comparing first half vs second half
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (sortedData.length >= 4) {
    const midPoint = Math.floor(sortedData.length / 2);
    const recentFCR = sortedData.slice(0, midPoint).reduce((sum, d) => sum + d.fcr, 0) / midPoint;
    const olderFCR = sortedData.slice(midPoint).reduce((sum, d) => sum + d.fcr, 0) / (sortedData.length - midPoint);
    
    if (recentFCR < olderFCR * 0.95) {
      trend = 'improving'; // FCR decreased (better)
    } else if (recentFCR > olderFCR * 1.05) {
      trend = 'declining'; // FCR increased (worse)
    }
  }
  
  return {
    rollingFCR: Number(rollingFCR.toFixed(2)),
    trend,
    dataPoints: sortedData.length
  };
}

/**
 * Calculate feed allocation between trays and broadcast
 * Trays get 3-4% of daily feed, broadcast gets 96-97%
 */
export function calculateFeedAllocation(
  totalDailyFeed: number,
  shrimpWeight: number
): {
  trayFeedKg: number;
  broadcastFeedKg: number;
  trayPercentage: number;
  allocation: 'optimal' | 'adjusted';
} {
  // Adjust tray percentage based on shrimp size
  let trayPercentage: number;
  if (shrimpWeight >= 5 && shrimpWeight < 10) {
    trayPercentage = 2.8; // Smaller shrimp
  } else if (shrimpWeight >= 10 && shrimpWeight < 20) {
    trayPercentage = 3.0; // Medium shrimp
  } else if (shrimpWeight >= 20) {
    trayPercentage = 3.3; // Larger shrimp
  } else {
    trayPercentage = 3.0; // Default
  }
  
  const trayFeedKg = (totalDailyFeed * trayPercentage) / 100;
  const broadcastFeedKg = totalDailyFeed - trayFeedKg;
  
  const allocation = (trayPercentage >= 2.8 && trayPercentage <= 3.3) ? 'optimal' : 'adjusted';
  
  return {
    trayFeedKg: Number(trayFeedKg.toFixed(2)),
    broadcastFeedKg: Number(broadcastFeedKg.toFixed(2)),
    trayPercentage,
    allocation
  };
}