import { ShrimpBatch, FeedingRecommendation, GrowthProjection } from './types';
import { calculateSizeSpecificFeedingRate } from './feedConversion';
import { calculateTemperatureAdjustmentFactor } from './temperatureFeeding';

/**
 * Calculate comprehensive feeding recommendation
 */
export function calculateFeedingRecommendation(
  batch: ShrimpBatch,
  temperature: number,
  environmentalAdjustments: {
    waterQuality: number; // 0-1 factor
    weather: number; // 0-1 factor  
    molting: boolean;
    dissolvedOxygen: number; // 0-1 factor
  }
): FeedingRecommendation {
  // Base feeding rate from size-specific calculation
  const { feedingRatePercent } = calculateSizeSpecificFeedingRate(batch.averageBodyWeight);
  
  // Calculate current biomass
  const currentBiomass = (batch.initialStock * batch.currentSurvivalRate * batch.averageBodyWeight) / 1000; // kg
  
  // Base daily feed requirement
  let baseDailyFeed = (currentBiomass * feedingRatePercent) / 100;
  
  // Apply temperature adjustment
  const tempAdjustment = calculateTemperatureAdjustmentFactor(temperature);
  baseDailyFeed *= tempAdjustment;
  
  // Apply environmental adjustments
  baseDailyFeed *= environmentalAdjustments.waterQuality;
  baseDailyFeed *= environmentalAdjustments.weather;
  baseDailyFeed *= environmentalAdjustments.dissolvedOxygen;
  
  // Molting adjustment (reduce 10% for 2-3 days)
  if (environmentalAdjustments.molting) {
    baseDailyFeed *= 0.9;
  }
  
  // Calculate tray vs broadcast allocation
  const trayPercentage = batch.averageBodyWeight < 10 ? 2.8 : 
                        batch.averageBodyWeight < 20 ? 3.0 : 3.3;
  
  const trayFeed = (baseDailyFeed * trayPercentage) / 100;
  const broadcastFeed = baseDailyFeed - trayFeed;
  
  // Calculate sessions per day based on shrimp size
  const sessionsPerDay = batch.averageBodyWeight < 5 ? 4 : 
                        batch.averageBodyWeight < 15 ? 3 : 2;
  
  const feedPerSession = baseDailyFeed / sessionsPerDay;
  
  // Confidence interval based on adjustments applied
  const adjustmentFactor = tempAdjustment * environmentalAdjustments.waterQuality * 
                          environmentalAdjustments.weather * environmentalAdjustments.dissolvedOxygen;
  const confidenceRange = baseDailyFeed * 0.15; // ±15%
  
  return {
    totalDailyFeed: Number(baseDailyFeed.toFixed(2)),
    trayFeed: Number(trayFeed.toFixed(2)),
    broadcastFeed: Number(broadcastFeed.toFixed(2)),
    sessionsPerDay,
    feedPerSession: Number(feedPerSession.toFixed(2)),
    confidenceInterval: {
      min: Number((baseDailyFeed - confidenceRange).toFixed(2)),
      max: Number((baseDailyFeed + confidenceRange).toFixed(2))
    }
  };
}

/**
 * Calculate growth projections and harvest estimates
 */
export function calculateGrowthProjection(
  batch: ShrimpBatch,
  targetHarvestWeight: number = 25, // grams
  currentFCR: number = 1.3
): GrowthProjection {
  const currentWeight = batch.averageBodyWeight;
  const weightToGain = targetHarvestWeight - currentWeight;
  
  // Growth rate estimation based on current size and conditions
  let weeklyGrowthRate: number; // grams per week
  if (currentWeight < 5) {
    weeklyGrowthRate = 0.8;
  } else if (currentWeight < 10) {
    weeklyGrowthRate = 1.0;
  } else if (currentWeight < 20) {
    weeklyGrowthRate = 1.2;
  } else {
    weeklyGrowthRate = 1.0; // Slower growth for larger shrimp
  }
  
  // Calculate days to harvest
  const weeksToHarvest = weightToGain / weeklyGrowthRate;
  const daysToHarvest = Math.ceil(weeksToHarvest * 7);
  
  // Project harvest biomass
  const currentPopulation = batch.initialStock * batch.currentSurvivalRate;
  const expectedSurvivalAtHarvest = Math.max(0.6, batch.currentSurvivalRate - (daysToHarvest * 0.001)); // 0.1% daily mortality
  const harvestPopulation = currentPopulation * (expectedSurvivalAtHarvest / batch.currentSurvivalRate);
  const harvestBiomass = (harvestPopulation * targetHarvestWeight) / 1000; // kg
  
  // Project FCR at harvest (typically increases slightly as shrimp grow)
  const projectedFCR = currentFCR + (daysToHarvest / 100) * 0.1; // Small increase over time
  
  return {
    projectedWeight: targetHarvestWeight,
    daysToHarvest,
    expectedFCR: Number(projectedFCR.toFixed(2)),
    harvestBiomass: Number(harvestBiomass.toFixed(2))
  };
}

/**
 * Calculate feed cost analysis and ROI projections
 */
export function calculateFeedCostAnalysis(
  dailyFeedKg: number,
  feedPricePerKg: number,
  daysRemaining: number,
  projectedHarvestBiomass: number,
  shrimpPricePerKg: number
): {
  totalFeedCost: number;
  feedCostPerKg: number; // feed cost per kg of shrimp produced
  projectedRevenue: number;
  projectedProfit: number;
  roi: number; // return on investment percentage
  feedCostPercentage: number; // feed cost as % of revenue
  breakEvenPrice: number; // minimum shrimp price to break even
} {
  const totalFeedCost = dailyFeedKg * feedPricePerKg * daysRemaining;
  const feedCostPerKg = totalFeedCost / projectedHarvestBiomass;
  const projectedRevenue = projectedHarvestBiomass * shrimpPricePerKg;
  const projectedProfit = projectedRevenue - totalFeedCost;
  const roi = (projectedProfit / totalFeedCost) * 100;
  const feedCostPercentage = (totalFeedCost / projectedRevenue) * 100;
  const breakEvenPrice = totalFeedCost / projectedHarvestBiomass;
  
  return {
    totalFeedCost: Number(totalFeedCost.toFixed(2)),
    feedCostPerKg: Number(feedCostPerKg.toFixed(2)),
    projectedRevenue: Number(projectedRevenue.toFixed(2)),
    projectedProfit: Number(projectedProfit.toFixed(2)),
    roi: Number(roi.toFixed(1)),
    feedCostPercentage: Number(feedCostPercentage.toFixed(1)),
    breakEvenPrice: Number(breakEvenPrice.toFixed(2))
  };
}

/**
 * Generate feeding schedule recommendations
 */
export function generateFeedingSchedule(
  totalDailyFeed: number,
  sessionsPerDay: number,
  temperature: number,
  shrimpSize: number
): Array<{
  time: string;
  feedAmount: number; // kg
  feedType: 'tray' | 'broadcast';
  notes: string;
}> {
  const schedule = [];
  const feedPerSession = totalDailyFeed / sessionsPerDay;
  
  // Tray feeding percentage based on size
  const trayPercentage = shrimpSize < 10 ? 2.8 : shrimpSize < 20 ? 3.0 : 3.3;
  const trayFeedPerSession = (feedPerSession * trayPercentage) / 100;
  const broadcastFeedPerSession = feedPerSession - trayFeedPerSession;
  
  if (sessionsPerDay === 2) {
    schedule.push(
      {
        time: temperature < 28 ? '08:00' : '07:00',
        feedAmount: trayFeedPerSession,
        feedType: 'tray' as const,
        notes: 'Morning tray feeding - check consumption after 1-2 hours'
      },
      {
        time: temperature < 28 ? '08:15' : '07:15',
        feedAmount: broadcastFeedPerSession,
        feedType: 'broadcast' as const,
        notes: 'Morning broadcast feeding'
      },
      {
        time: temperature > 32 ? '19:00' : '18:00',
        feedAmount: trayFeedPerSession,
        feedType: 'tray' as const,
        notes: 'Evening tray feeding - check consumption after 1-2 hours'
      },
      {
        time: temperature > 32 ? '19:15' : '18:15',
        feedAmount: broadcastFeedPerSession,
        feedType: 'broadcast' as const,
        notes: 'Evening broadcast feeding'
      }
    );
  } else if (sessionsPerDay === 3) {
    schedule.push(
      {
        time: '07:00',
        feedAmount: trayFeedPerSession,
        feedType: 'tray' as const,
        notes: 'Morning tray feeding'
      },
      {
        time: '07:15',
        feedAmount: broadcastFeedPerSession,
        feedType: 'broadcast' as const,
        notes: 'Morning broadcast feeding'
      },
      {
        time: '13:00',
        feedAmount: trayFeedPerSession,
        feedType: 'tray' as const,
        notes: 'Afternoon tray feeding'
      },
      {
        time: '13:15',
        feedAmount: broadcastFeedPerSession,
        feedType: 'broadcast' as const,
        notes: 'Afternoon broadcast feeding'
      },
      {
        time: '18:30',
        feedAmount: trayFeedPerSession,
        feedType: 'tray' as const,
        notes: 'Evening tray feeding'
      },
      {
        time: '18:45',
        feedAmount: broadcastFeedPerSession,
        feedType: 'broadcast' as const,
        notes: 'Evening broadcast feeding'
      }
    );
  } else { // 4 sessions for very small shrimp
    const times = ['06:30', '10:30', '14:30', '18:30'];
    times.forEach((time, index) => {
      schedule.push(
        {
          time,
          feedAmount: trayFeedPerSession,
          feedType: 'tray' as const,
          notes: `Session ${index + 1} tray feeding`
        },
        {
          time: `${time.split(':')[0]}:${parseInt(time.split(':')[1]) + 15}`,
          feedAmount: broadcastFeedPerSession,
          feedType: 'broadcast' as const,
          notes: `Session ${index + 1} broadcast feeding`
        }
      );
    });
  }
  
  return schedule;
}