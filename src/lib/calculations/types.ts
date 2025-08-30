// Type definitions for calculations module

export interface TraySpecifications {
  internalDiameter: number; // cm
  height: number; // cm
  meshSize: number; // mm
}

export interface PondArea {
  totalArea: number; // m²
  activeArea: number; // m²
}

export interface ShrimpBatch {
  initialStock: number;
  currentSurvivalRate: number; // 0-1
  averageBodyWeight: number; // grams
  daysOld: number;
}

export interface WaterConditions {
  temperature: number; // °C
  dissolvedOxygen: number; // mg/L
  ammonia: number; // mg/L
  nitrite: number; // mg/L
  ph: number;
}

export interface WeatherCondition {
  type: 'sunny' | 'cloudy' | 'rainy';
  intensity: 'light' | 'moderate' | 'heavy';
}

export interface TrayScore {
  score: 0 | 1 | 2 | 3;
  timestamp: Date;
  trayId: string;
}

export interface FeedingRecommendation {
  totalDailyFeed: number; // kg
  trayFeed: number; // kg (3-4% of daily)
  broadcastFeed: number; // kg (96-97% of daily)
  sessionsPerDay: number;
  feedPerSession: number; // kg
  confidenceInterval: {
    min: number;
    max: number;
  };
}

export interface FCRData {
  feedGiven: number; // kg
  biomassGained: number; // kg
  fcr: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface GrowthProjection {
  projectedWeight: number; // grams
  daysToHarvest: number;
  expectedFCR: number;
  harvestBiomass: number; // kg
}

export interface FecalStrandQuality {
  quality: 'good' | 'poor';
  length: 'long' | 'short';
  consistency: 'firm' | 'loose';
}

export interface ShrimpActivity {
  level: 'high' | 'normal' | 'low';
  feedingResponse: 'excellent' | 'good' | 'poor';
  surfaceActivity: boolean;
}