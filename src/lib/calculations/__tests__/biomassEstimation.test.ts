import { describe, test, expect } from 'vitest';
import {
  calculateCurrentBiomass,
  calculateBiomassDensity,
  calculateCastNetBiomassEstimate,
  calculateSurvivalRate,
  calculateGrowthRate
} from '../biomassEstimation';
import { ShrimpBatch, PondArea } from '../types';

describe('Biomass Estimation Calculations', () => {
  const testBatch: ShrimpBatch = {
    initialStock: 100000,
    currentSurvivalRate: 0.8,
    averageBodyWeight: 15,
    daysOld: 45
  };

  const testPondArea: PondArea = {
    totalArea: 5000,
    activeArea: 4500
  };

  describe('calculateCurrentBiomass', () => {
    test('should calculate biomass correctly using the precision formula', () => {
      const result = calculateCurrentBiomass(testBatch);
      
      // Expected: 100000 * 0.8 * 15 / 1000 = 1200 kg
      expect(result.totalBiomass).toBe(1200);
      expect(result.individualCount).toBe(80000);
      expect(result.confidence).toBe('high'); // 45 days old, 80% survival
    });

    test('should assign correct confidence levels', () => {
      const highConfidenceBatch: ShrimpBatch = {
        ...testBatch,
        daysOld: 35,
        currentSurvivalRate: 0.75
      };
      const mediumConfidenceBatch: ShrimpBatch = {
        ...testBatch,
        daysOld: 20,
        currentSurvivalRate: 0.6
      };
      const lowConfidenceBatch: ShrimpBatch = {
        ...testBatch,
        daysOld: 10,
        currentSurvivalRate: 0.4
      };

      expect(calculateCurrentBiomass(highConfidenceBatch).confidence).toBe('high');
      expect(calculateCurrentBiomass(mediumConfidenceBatch).confidence).toBe('medium');
      expect(calculateCurrentBiomass(lowConfidenceBatch).confidence).toBe('low');
    });

    test('should handle zero survival rate', () => {
      const zeroBatch: ShrimpBatch = {
        ...testBatch,
        currentSurvivalRate: 0
      };

      const result = calculateCurrentBiomass(zeroBatch);
      expect(result.totalBiomass).toBe(0);
      expect(result.individualCount).toBe(0);
    });
  });

  describe('calculateBiomassDensity', () => {
    test('should calculate density correctly', () => {
      const biomass = 1200; // kg
      const result = calculateBiomassDensity(biomass, testPondArea);
      
      // Expected density: 1200 / 4500 = 0.267 kg/m²
      expect(result.densityPerM2).toBeCloseTo(0.267, 3);
      expect(result.densityPerHectare).toBeCloseTo(2667, 0); // 0.267 * 10000
    });

    test('should provide recommended density ranges', () => {
      const result = calculateBiomassDensity(900, testPondArea);
      
      expect(result.recommendedDensity.min).toBe(0.5);
      expect(result.recommendedDensity.max).toBe(2.0);
    });

    test('should handle zero biomass', () => {
      const result = calculateBiomassDensity(0, testPondArea);
      
      expect(result.densityPerM2).toBe(0);
      expect(result.densityPerHectare).toBe(0);
    });
  });

  describe('calculateCastNetBiomassEstimate', () => {
    const sampleData = [
      { shrimpCount: 25, totalWeight: 375, castArea: 8.6 }, // 15g average
      { shrimpCount: 30, totalWeight: 420, castArea: 8.6 }, // 14g average
      { shrimpCount: 20, totalWeight: 320, castArea: 8.6 }  // 16g average
    ];

    test('should estimate biomass from cast net samples', () => {
      const result = calculateCastNetBiomassEstimate(sampleData, testPondArea);
      
      expect(result.estimatedBiomass).toBeGreaterThan(0);
      expect(result.averageBodyWeight).toBeCloseTo(15, 1); // Should be close to 15g
      expect(result.estimatedPopulation).toBeGreaterThan(0);
      expect(result.samplingAccuracy).toBeGreaterThan(0.5);
    });

    test('should handle empty samples', () => {
      const result = calculateCastNetBiomassEstimate([], testPondArea);
      
      expect(result.estimatedBiomass).toBe(0);
      expect(result.averageBodyWeight).toBe(0);
      expect(result.estimatedPopulation).toBe(0);
      expect(result.samplingAccuracy).toBe(0);
    });

    test('should provide confidence intervals', () => {
      const result = calculateCastNetBiomassEstimate(sampleData, testPondArea);
      
      expect(result.confidenceInterval.max).toBeGreaterThan(result.confidenceInterval.min);
      expect(result.confidenceInterval.min).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateSurvivalRate', () => {
    test('should calculate survival rate from sampling data', () => {
      const result = calculateSurvivalRate(100000, 75000, 4500, 4500, 45);
      
      expect(result.estimatedSurvival).toBe(0.75);
      expect(result.mortalityRate).toBeGreaterThan(0);
      expect(result.expectedSurvival).toBe(0.7); // Expected for 45 days
    });

    test('should assign correct performance ratings', () => {
      const excellent = calculateSurvivalRate(100000, 80000, 4500, 4500, 45);
      const good = calculateSurvivalRate(100000, 70000, 4500, 4500, 45);
      const average = calculateSurvivalRate(100000, 60000, 4500, 4500, 45);
      const poor = calculateSurvivalRate(100000, 50000, 4500, 4500, 45);

      expect(excellent.performance).toBe('excellent');
      expect(good.performance).toBe('good');
      expect(average.performance).toBe('average');
      expect(poor.performance).toBe('poor');
    });

    test('should adjust expected survival by age', () => {
      const result30 = calculateSurvivalRate(100000, 80000, 4500, 4500, 30);
      const result60 = calculateSurvivalRate(100000, 80000, 4500, 4500, 60);
      const result90 = calculateSurvivalRate(100000, 80000, 4500, 4500, 90);

      expect(result30.expectedSurvival).toBe(0.85);
      expect(result60.expectedSurvival).toBe(0.75);
      expect(result90.expectedSurvival).toBe(0.70);
    });
  });

  describe('calculateGrowthRate', () => {
    test('should calculate weekly and daily growth rates', () => {
      const result = calculateGrowthRate(10, 12, 7); // 2g gain in 7 days
      
      expect(result.dailyGrowthRate).toBeCloseTo(0.286, 2); // 2/7
      expect(result.weeklyGrowthRate).toBe(2);
      expect(result.growthPercentage).toBe(20); // (12-10)/10 * 100
    });

    test('should determine healthy growth status', () => {
      const healthyGrowth = calculateGrowthRate(10, 11.5, 7); // Good growth
      const poorGrowth = calculateGrowthRate(10, 10.3, 7); // Poor growth

      expect(healthyGrowth.isHealthyGrowth).toBe(true);
      expect(poorGrowth.isHealthyGrowth).toBe(false);
    });

    test('should handle zero or negative growth', () => {
      const noGrowth = calculateGrowthRate(10, 10, 7);
      const negativeGrowth = calculateGrowthRate(10, 9, 7);

      expect(noGrowth.weeklyGrowthRate).toBe(0);
      expect(noGrowth.growthPercentage).toBe(0);
      expect(negativeGrowth.weeklyGrowthRate).toBeLessThan(0);
      expect(negativeGrowth.growthPercentage).toBeLessThan(0);
    });
  });
});