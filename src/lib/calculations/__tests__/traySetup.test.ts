import { describe, test, expect } from 'vitest';
import {
  calculateOptimalTrayCount,
  calculateTrayCoverageArea,
  calculateTotalTrayArea,
  calculateTrayPositions,
  validateTraySpecifications
} from '../traySetup';
import { TraySpecifications, PondArea } from '../types';

describe('Tray Setup Calculations', () => {
  const standardTraySpecs: TraySpecifications = {
    internalDiameter: 51,
    height: 4,
    meshSize: 1.3
  };

  const testPondArea: PondArea = {
    totalArea: 5000,
    activeArea: 4500
  };

  describe('calculateOptimalTrayCount', () => {
    test('should calculate correct tray count for standard pond', () => {
      const result = calculateOptimalTrayCount(testPondArea);
      
      expect(result.minimum).toBeGreaterThan(0);
      expect(result.maximum).toBeGreaterThanOrEqual(result.minimum);
      expect(result.optimal).toBeGreaterThan(0);
      expect(result.optimal).toBe(Math.round(5000 / 2250)); // ~2 trays
    });

    test('should handle small pond areas', () => {
      const smallPond: PondArea = { totalArea: 1000, activeArea: 900 };
      const result = calculateOptimalTrayCount(smallPond);
      
      expect(result.minimum).toBe(1);
      expect(result.maximum).toBe(1);
      expect(result.optimal).toBe(1);
    });

    test('should handle large pond areas', () => {
      const largePond: PondArea = { totalArea: 20000, activeArea: 18000 };
      const result = calculateOptimalTrayCount(largePond);
      
      expect(result.minimum).toBeGreaterThan(5);
      expect(result.maximum).toBeGreaterThan(10);
      expect(result.optimal).toBeGreaterThan(8);
    });
  });

  describe('calculateTrayCoverageArea', () => {
    test('should calculate correct coverage area for standard tray', () => {
      const area = calculateTrayCoverageArea(standardTraySpecs);
      
      // Expected area: π * (25.5)² / 10000 = ~0.204 m²
      expect(area).toBeCloseTo(0.204, 2);
    });

    test('should handle different tray sizes', () => {
      const largeTray: TraySpecifications = {
        internalDiameter: 60,
        height: 4,
        meshSize: 1.3
      };
      
      const area = calculateTrayCoverageArea(largeTray);
      expect(area).toBeGreaterThan(0.2);
    });
  });

  describe('calculateTotalTrayArea', () => {
    test('should calculate total area for multiple trays', () => {
      const totalArea = calculateTotalTrayArea(3, standardTraySpecs);
      const singleArea = calculateTrayCoverageArea(standardTraySpecs);
      
      expect(totalArea).toBeCloseTo(singleArea * 3, 3);
    });

    test('should use default specifications when not provided', () => {
      const totalArea = calculateTotalTrayArea(2);
      expect(totalArea).toBeGreaterThan(0);
    });
  });

  describe('calculateTrayPositions', () => {
    test('should generate correct number of positions', () => {
      const positions = calculateTrayPositions(testPondArea, 3);
      
      expect(positions).toHaveLength(3);
      positions.forEach((pos, index) => {
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(pos).toHaveProperty('zone');
        expect(pos.zone).toBe(`Zone-${index + 1}`);
      });
    });

    test('should distribute positions evenly', () => {
      const positions = calculateTrayPositions(testPondArea, 4);
      
      // Check that positions are distributed around a circle
      const angles = positions.map(pos => Math.atan2(pos.y, pos.x));
      
      // Angles should be roughly evenly spaced
      for (let i = 1; i < angles.length; i++) {
        const angleDiff = Math.abs(angles[i] - angles[i-1]);
        const expectedDiff = (2 * Math.PI) / 4; // 90 degrees for 4 trays
        expect(angleDiff).toBeCloseTo(expectedDiff, 0.5);
      }
    });
  });

  describe('validateTraySpecifications', () => {
    test('should validate standard specifications as correct', () => {
      const result = validateTraySpecifications(standardTraySpecs);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect incorrect diameter', () => {
      const incorrectSpecs: TraySpecifications = {
        internalDiameter: 50,
        height: 4,
        meshSize: 1.3
      };
      
      const result = validateTraySpecifications(incorrectSpecs);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Internal diameter should be 51cm (current: 50cm)');
    });

    test('should detect multiple issues', () => {
      const incorrectSpecs: TraySpecifications = {
        internalDiameter: 50,
        height: 5,
        meshSize: 1.5
      };
      
      const result = validateTraySpecifications(incorrectSpecs);
      
      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(3);
    });
  });
});