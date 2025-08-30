import { TraySpecifications, PondArea } from './types';

/**
 * Calculate optimal number of check trays for a pond
 * Industry standard: 2-4 trays per 4,000-5,000 m² pond area
 * Optimal: 1 tray per 2,000-2,500 m²
 */
export function calculateOptimalTrayCount(pondArea: PondArea): {
  minimum: number;
  maximum: number;
  optimal: number;
} {
  const { totalArea } = pondArea;
  
  // Industry standards
  const minimum = Math.ceil((totalArea * 2) / 5000);
  const maximum = Math.floor((totalArea * 4) / 4000);
  
  // Optimal range: 1 tray per 2,000-2,500 m²
  const optimal = Math.round(totalArea / 2250); // midpoint of 2000-2500
  
  return {
    minimum: Math.max(1, minimum),
    maximum: Math.max(1, maximum),
    optimal: Math.max(1, optimal)
  };
}

/**
 * Calculate tray coverage area based on specifications
 */
export function calculateTrayCoverageArea(specs: TraySpecifications): number {
  const radius = specs.internalDiameter / 2; // cm to radius
  const areaInCm2 = Math.PI * Math.pow(radius, 2);
  return areaInCm2 / 10000; // convert cm² to m²
}

/**
 * Calculate total tray monitoring area for a pond
 */
export function calculateTotalTrayArea(
  trayCount: number, 
  specs: TraySpecifications = {
    internalDiameter: 51,
    height: 4,
    meshSize: 1.3
  }
): number {
  const singleTrayArea = calculateTrayCoverageArea(specs);
  return trayCount * singleTrayArea;
}

/**
 * Calculate tray positioning recommendations
 */
export function calculateTrayPositions(
  pondArea: PondArea,
  trayCount: number
): Array<{ x: number; y: number; zone: string }> {
  // Simplified positioning logic - in high-activity zones
  const positions = [];
  const sqrtArea = Math.sqrt(pondArea.totalArea);
  
  for (let i = 0; i < trayCount; i++) {
    const angle = (2 * Math.PI * i) / trayCount;
    const radius = sqrtArea * 0.3; // 30% from center
    
    positions.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      zone: `Zone-${i + 1}`
    });
  }
  
  return positions;
}

/**
 * Validate tray specifications against industry standards
 */
export function validateTraySpecifications(specs: TraySpecifications): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Standard specifications validation
  if (specs.internalDiameter !== 51) {
    warnings.push(`Internal diameter should be 51cm (current: ${specs.internalDiameter}cm)`);
  }
  
  if (specs.height !== 4) {
    warnings.push(`Height should be 4cm (current: ${specs.height}cm)`);
  }
  
  if (specs.meshSize !== 1.3) {
    warnings.push(`Mesh size should be 1.3mm (current: ${specs.meshSize}mm)`);
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}