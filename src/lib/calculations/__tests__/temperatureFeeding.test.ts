import { describe, test, expect } from 'vitest';
import {
  calculateGutFillingTime,
  calculateTemperatureBasedSchedule,
  calculateTemperatureAdjustmentFactor,
  calculateOptimalTrayCheckTime
} from '../temperatureFeeding';

describe('Temperature-Based Feeding Calculations', () => {
  describe('calculateGutFillingTime', () => {
    test('should calculate correct times for 24°C', () => {
      const result = calculateGutFillingTime(24);
      
      expect(result.gutFillingMinutes).toBe(55);
      expect(result.fecesExcretionMinutes).toBe(105);
      expect(result.feedingEfficiency).toBeLessThan(1.0);
    });

    test('should calculate correct times for optimal temperature (30-32°C)', () => {
      const result30 = calculateGutFillingTime(30);
      const result32 = calculateGutFillingTime(32);
      
      expect(result30.gutFillingMinutes).toBe(28);
      expect(result30.fecesExcretionMinutes).toBe(53);
      expect(result30.feedingEfficiency).toBe(1.0);
      
      expect(result32.gutFillingMinutes).toBe(28);
      expect(result32.fecesExcretionMinutes).toBe(53);
      expect(result32.feedingEfficiency).toBe(1.0);
    });

    test('should calculate correct times for 34°C', () => {
      const result = calculateGutFillingTime(34);
      
      expect(result.gutFillingMinutes).toBe(20);
      expect(result.fecesExcretionMinutes).toBe(35);
      expect(result.feedingEfficiency).toBeLessThan(1.0);
    });

    test('should interpolate correctly for intermediate temperatures', () => {
      const result27 = calculateGutFillingTime(27);
      
      // Should be between 24°C and 30°C values
      expect(result27.gutFillingMinutes).toBeGreaterThan(27);
      expect(result27.gutFillingMinutes).toBeLessThan(55);
      expect(result27.fecesExcretionMinutes).toBeGreaterThan(52);
      expect(result27.fecesExcretionMinutes).toBeLessThan(105);
    });

    test('should apply efficiency penalty for temperature deviation', () => {
      const result25 = calculateGutFillingTime(25);
      const result35 = calculateGutFillingTime(35);
      
      // Both should have reduced efficiency due to deviation from optimal
      expect(result25.feedingEfficiency).toBeLessThan(1.0);
      expect(result35.feedingEfficiency).toBeLessThan(1.0);
    });
  });

  describe('calculateTemperatureBasedSchedule', () => {
    test('should reduce morning feeds in cool water (<28°C)', () => {
      const result = calculateTemperatureBasedSchedule(26, 10);
      
      expect(result.morningFeedPercentage).toBe(20);
      expect(result.afternoonFeedPercentage).toBe(50);
      expect(result.eveningFeedPercentage).toBe(30);
      expect(result.optimalFeedingTimes).toEqual(['08:00', '14:00', '18:00']);
    });

    test('should balance feeds in optimal temperature (28-32°C)', () => {
      const result = calculateTemperatureBasedSchedule(30, 10);
      
      expect(result.morningFeedPercentage).toBe(30);
      expect(result.afternoonFeedPercentage).toBe(40);
      expect(result.eveningFeedPercentage).toBe(30);
      expect(result.optimalFeedingTimes).toEqual(['07:00', '13:00', '18:30']);
    });

    test('should adjust schedule for high temperature (>32°C)', () => {
      const result = calculateTemperatureBasedSchedule(35, 10);
      
      expect(result.morningFeedPercentage).toBe(35);
      expect(result.afternoonFeedPercentage).toBe(25);
      expect(result.eveningFeedPercentage).toBe(40);
      expect(result.optimalFeedingTimes).toEqual(['06:30', '15:30', '19:00']);
    });

    test('should ensure percentages sum to 100', () => {
      const temperatures = [25, 30, 35];
      
      temperatures.forEach(temp => {
        const result = calculateTemperatureBasedSchedule(temp, 10);
        const total = result.morningFeedPercentage + result.afternoonFeedPercentage + result.eveningFeedPercentage;
        expect(total).toBe(100);
      });
    });
  });

  describe('calculateTemperatureAdjustmentFactor', () => {
    test('should return 1.0 for optimal temperature', () => {
      const factor = calculateTemperatureAdjustmentFactor(30, 30);
      expect(factor).toBe(1.0);
    });

    test('should reduce factor for temperature deviation', () => {
      // 1°C deviation should reduce by ~9%
      const factor29 = calculateTemperatureAdjustmentFactor(29, 30);
      const factor31 = calculateTemperatureAdjustmentFactor(31, 30);
      
      expect(factor29).toBeCloseTo(0.91, 2);
      expect(factor31).toBeCloseTo(0.91, 2);
    });

    test('should have minimum threshold of 0.5', () => {
      const extremeTemp = calculateTemperatureAdjustmentFactor(20, 30);
      expect(extremeTemp).toBeGreaterThanOrEqual(0.5);
    });

    test('should handle large deviations', () => {
      const factor = calculateTemperatureAdjustmentFactor(35, 30);
      expect(factor).toBeLessThan(1.0);
      expect(factor).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('calculateOptimalTrayCheckTime', () => {
    test('should provide reasonable check times for different temperatures', () => {
      const result24 = calculateOptimalTrayCheckTime(24);
      const result30 = calculateOptimalTrayCheckTime(30);
      const result34 = calculateOptimalTrayCheckTime(34);
      
      // Check times should be at least 1 hour, max 2 hours
      [result24, result30, result34].forEach(result => {
        expect(result.minMinutes).toBeGreaterThanOrEqual(60);
        expect(result.maxMinutes).toBeLessThanOrEqual(120);
        expect(result.recommendedMinutes).toBeGreaterThanOrEqual(result.minMinutes);
        expect(result.recommendedMinutes).toBeLessThanOrEqual(result.maxMinutes);
      });
    });

    test('should adjust check time based on gut filling', () => {
      const resultCold = calculateOptimalTrayCheckTime(24);
      const resultHot = calculateOptimalTrayCheckTime(34);
      
      // Warmer temperatures should generally have shorter check times
      expect(resultHot.recommendedMinutes).toBeLessThan(resultCold.recommendedMinutes);
    });
  });
});