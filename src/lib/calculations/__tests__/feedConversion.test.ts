import { describe, test, expect } from 'vitest';
import {
  calculateTrayScoreAdjustment,
  calculateSizeSpecificFeedingRate,
  calculateFCR,
  calculateRollingFCR,
  calculateFeedAllocation
} from '../feedConversion';
import { TrayScore, FCRData } from '../types';

describe('Feed Conversion Calculations', () => {
  describe('calculateTrayScoreAdjustment', () => {
    test('should increase feed for high tray scores (Score 3)', () => {
      const highScores: TrayScore[] = [
        { score: 3, timestamp: new Date(), trayId: 'T1' },
        { score: 3, timestamp: new Date(), trayId: 'T2' },
        { score: 3, timestamp: new Date(), trayId: 'T3' }
      ];

      const result = calculateTrayScoreAdjustment(highScores, 100);
      
      expect(result.recommendedAdjustment).toBe(10);
      expect(result.newFeedAmount).toBe(110);
      expect(result.averageScore).toBe(3);
      expect(result.confidence).toBe('high');
    });

    test('should maintain feed for medium tray scores (Score 1)', () => {
      const mediumScores: TrayScore[] = [
        { score: 1, timestamp: new Date(), trayId: 'T1' },
        { score: 1, timestamp: new Date(), trayId: 'T2' }
      ];

      const result = calculateTrayScoreAdjustment(mediumScores, 100);
      
      expect(result.recommendedAdjustment).toBe(0);
      expect(result.newFeedAmount).toBe(100);
      expect(result.averageScore).toBe(1);
    });

    test('should reduce feed for low tray scores (Score 0)', () => {
      const lowScores: TrayScore[] = [
        { score: 0, timestamp: new Date(), trayId: 'T1' },
        { score: 0, timestamp: new Date(), trayId: 'T2' }
      ];

      const result = calculateTrayScoreAdjustment(lowScores, 100);
      
      expect(result.recommendedAdjustment).toBe(-10);
      expect(result.newFeedAmount).toBe(90);
      expect(result.averageScore).toBe(0);
    });

    test('should handle mixed scores correctly', () => {
      const mixedScores: TrayScore[] = [
        { score: 2, timestamp: new Date(), trayId: 'T1' },
        { score: 3, timestamp: new Date(), trayId: 'T2' },
        { score: 1, timestamp: new Date(), trayId: 'T3' }
      ];

      const result = calculateTrayScoreAdjustment(mixedScores, 100);
      
      expect(result.averageScore).toBe(2);
      expect(result.recommendedAdjustment).toBe(5); // Score 2 = +5%
    });

    test('should return default values for empty tray scores', () => {
      const result = calculateTrayScoreAdjustment([], 100);
      
      expect(result.recommendedAdjustment).toBe(0);
      expect(result.newFeedAmount).toBe(100);
      expect(result.averageScore).toBe(0);
      expect(result.confidence).toBe('low');
    });
  });

  describe('calculateSizeSpecificFeedingRate', () => {
    test('should return correct rates for different size categories', () => {
      const testCases = [
        { weight: 2.5, expectedRate: 7.5, expectedCategory: '2-3g' },
        { weight: 4, expectedRate: 6.25, expectedCategory: '3-5g' },
        { weight: 8, expectedRate: 5.0, expectedCategory: '5-10g' },
        { weight: 12, expectedRate: 4.15, expectedCategory: '10-15g' },
        { weight: 18, expectedRate: 3.5, expectedCategory: '15-20g' },
        { weight: 22, expectedRate: 3.05, expectedCategory: '20-25g' },
        { weight: 28, expectedRate: 2.7, expectedCategory: '25-30g' },
        { weight: 32, expectedRate: 2.4, expectedCategory: '30-35g' },
        { weight: 38, expectedRate: 2.2, expectedCategory: '35-40g' }
      ];

      testCases.forEach(({ weight, expectedRate, expectedCategory }) => {
        const result = calculateSizeSpecificFeedingRate(weight);
        expect(result.feedingRatePercent).toBe(expectedRate);
        expect(result.category).toBe(expectedCategory);
      });
    });

    test('should handle edge cases', () => {
      const verySmall = calculateSizeSpecificFeedingRate(1.5);
      const veryLarge = calculateSizeSpecificFeedingRate(45);

      expect(verySmall.category).toBe('<2g');
      expect(verySmall.feedingRatePercent).toBe(8.0);
      
      expect(veryLarge.category).toBe('>40g');
      expect(veryLarge.feedingRatePercent).toBe(2.0);
    });

    test('should provide feeding rate ranges', () => {
      const result = calculateSizeSpecificFeedingRate(15);
      
      expect(result.feedingRateRange.min).toBeLessThan(result.feedingRateRange.max);
      expect(result.feedingRatePercent).toBeGreaterThanOrEqual(result.feedingRateRange.min);
      expect(result.feedingRatePercent).toBeLessThanOrEqual(result.feedingRateRange.max);
    });
  });

  describe('calculateFCR', () => {
    test('should calculate FCR correctly', () => {
      const result = calculateFCR(1200, 500, 1000); // 1200kg feed, 500kg biomass gain
      
      expect(result.fcr).toBe(2.4); // 1200/500
      expect(result.biomassGained).toBe(500);
      expect(result.fcrCategory).toBe('critical'); // FCR > 2.0
    });

    test('should categorize FCR correctly', () => {
      const excellent = calculateFCR(120, 100, 200); // FCR = 1.2
      const good = calculateFCR(130, 100, 200); // FCR = 1.3
      const average = calculateFCR(150, 100, 200); // FCR = 1.5
      const poor = calculateFCR(180, 100, 200); // FCR = 1.8
      const critical = calculateFCR(220, 100, 200); // FCR = 2.2

      expect(excellent.fcrCategory).toBe('excellent');
      expect(good.fcrCategory).toBe('good');
      expect(average.fcrCategory).toBe('average');
      expect(poor.fcrCategory).toBe('poor');
      expect(critical.fcrCategory).toBe('critical');
    });

    test('should handle zero or negative biomass gain', () => {
      const result = calculateFCR(100, 200, 200); // No biomass gain
      
      expect(result.fcr).toBe(Infinity);
      expect(result.fcrCategory).toBe('critical');
      expect(result.biomassGained).toBe(0);
      expect(result.efficiency).toBe(0);
    });

    test('should calculate efficiency correctly', () => {
      const goodFCR = calculateFCR(120, 100, 200); // FCR = 1.2
      const poorFCR = calculateFCR(240, 100, 200); // FCR = 2.4

      expect(goodFCR.efficiency).toBe(1); // 1.2/1.2 = 1
      expect(poorFCR.efficiency).toBe(0.5); // 1.2/2.4 = 0.5
    });
  });

  describe('calculateRollingFCR', () => {
    const mockFCRData: FCRData[] = [
      {
        feedGiven: 100,
        biomassGained: 80,
        fcr: 1.25,
        period: { start: new Date('2024-01-01'), end: new Date('2024-01-02') }
      },
      {
        feedGiven: 120,
        biomassGained: 90,
        fcr: 1.33,
        period: { start: new Date('2024-01-02'), end: new Date('2024-01-03') }
      },
      {
        feedGiven: 110,
        biomassGained: 95,
        fcr: 1.16,
        period: { start: new Date('2024-01-03'), end: new Date('2024-01-04') }
      }
    ];

    test('should calculate rolling FCR correctly', () => {
      const result = calculateRollingFCR(mockFCRData, 7);
      
      // Total feed: 330, Total biomass: 265, FCR: 330/265 ≈ 1.25
      expect(result.rollingFCR).toBeCloseTo(1.25, 2);
      expect(result.dataPoints).toBe(3);
    });

    test('should determine trend correctly', () => {
      // Create data with improving trend (decreasing FCR)
      const improvingData: FCRData[] = [
        { ...mockFCRData[0], fcr: 1.4 },
        { ...mockFCRData[1], fcr: 1.3 },
        { ...mockFCRData[2], fcr: 1.2 },
        { feedGiven: 100, biomassGained: 90, fcr: 1.1, period: { start: new Date('2024-01-04'), end: new Date('2024-01-05') } }
      ];

      const result = calculateRollingFCR(improvingData, 7);
      expect(result.trend).toBe('improving');
    });

    test('should handle empty data', () => {
      const result = calculateRollingFCR([], 7);
      
      expect(result.rollingFCR).toBe(0);
      expect(result.trend).toBe('stable');
      expect(result.dataPoints).toBe(0);
    });
  });

  describe('calculateFeedAllocation', () => {
    test('should allocate feed correctly based on shrimp size', () => {
      const testCases = [
        { weight: 8, expectedTrayPct: 2.8 },
        { weight: 15, expectedTrayPct: 3.0 },
        { weight: 25, expectedTrayPct: 3.3 }
      ];

      testCases.forEach(({ weight, expectedTrayPct }) => {
        const result = calculateFeedAllocation(100, weight);
        
        expect(result.trayPercentage).toBe(expectedTrayPct);
        expect(result.trayFeedKg).toBeCloseTo(expectedTrayPct, 1);
        expect(result.broadcastFeedKg).toBeCloseTo(100 - expectedTrayPct, 1);
        expect(result.allocation).toBe('optimal');
      });
    });

    test('should ensure feed allocation sums to total', () => {
      const result = calculateFeedAllocation(150, 12);
      
      expect(result.trayFeedKg + result.broadcastFeedKg).toBeCloseTo(150, 2);
    });

    test('should handle edge cases', () => {
      const result = calculateFeedAllocation(0, 20);
      
      expect(result.trayFeedKg).toBe(0);
      expect(result.broadcastFeedKg).toBe(0);
    });
  });
});