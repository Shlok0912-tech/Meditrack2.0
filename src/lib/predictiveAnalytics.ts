// Predictive analytics engine for medicine consumption patterns
// Uses advanced statistical models and trend analysis

import { Medicine, MedicineLog } from './storage';
import { differenceInDays, addDays, format, startOfDay, eachDayOfInterval } from 'date-fns';

export interface ConsumptionPattern {
  medicineId: string;
  medicineName: string;
  averageDailyConsumption: number;
  totalConsumed: number;
  daysTracked: number;
  predictedRunOutDate: Date | null;
  daysUntilRunOut: number | null;
  recommendedRefillDate: Date | null;
  confidence: 'high' | 'medium' | 'low';
  trend: 'increasing' | 'stable' | 'decreasing';
  weekdayPattern?: Record<string, number>;
}

export interface StockPrediction {
  currentStock: number;
  projectedStock7Days: number;
  projectedStock30Days: number;
  runOutRisk: 'critical' | 'warning' | 'low' | 'safe';
}

// Calculate moving average for trend analysis
function calculateMovingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(avg);
  }
  return result;
}

// Detect consumption trend
function detectTrend(movingAverages: number[]): 'increasing' | 'stable' | 'decreasing' {
  if (movingAverages.length < 3) return 'stable';
  
  const recent = movingAverages.slice(-5);
  const firstHalf = recent.slice(0, Math.ceil(recent.length / 2));
  const secondHalf = recent.slice(Math.ceil(recent.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePercent > 10) return 'increasing';
  if (changePercent < -10) return 'decreasing';
  return 'stable';
}

// Analyze weekday patterns
function analyzeWeekdayPattern(logs: MedicineLog[]): Record<string, number> {
  const weekdayConsumption: Record<string, number[]> = {
    'Sun': [], 'Mon': [], 'Tue': [], 'Wed': [], 'Thu': [], 'Fri': [], 'Sat': []
  };
  
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    weekdayConsumption[dayName].push(log.quantity);
  });
  
  const weekdayAverages: Record<string, number> = {};
  Object.entries(weekdayConsumption).forEach(([day, quantities]) => {
    weekdayAverages[day] = quantities.length > 0 
      ? quantities.reduce((sum, q) => sum + q, 0) / quantities.length 
      : 0;
  });
  
  return weekdayAverages;
}

// Enhanced consumption pattern analysis
export function analyzeConsumptionPattern(
  medicine: Medicine,
  logs: MedicineLog[]
): ConsumptionPattern {
  // Filter logs for this medicine
  const medicineLogs = logs
    .filter(log => log.medicineId === medicine.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (medicineLogs.length === 0) {
    return {
      medicineId: medicine.id,
      medicineName: medicine.name,
      averageDailyConsumption: 0,
      totalConsumed: 0,
      daysTracked: 0,
      predictedRunOutDate: null,
      daysUntilRunOut: null,
      recommendedRefillDate: null,
      confidence: 'low',
      trend: 'stable'
    };
  }

  // Calculate total consumed
  const totalConsumed = medicineLogs.reduce((sum, log) => sum + log.quantity, 0);

  // Calculate days tracked
  const firstLog = new Date(medicineLogs[0].timestamp);
  const lastLog = new Date(medicineLogs[medicineLogs.length - 1].timestamp);
  const daysTracked = Math.max(1, differenceInDays(lastLog, firstLog) + 1);

  // Group consumption by day for trend analysis
  const dailyConsumption: Record<string, number> = {};
  medicineLogs.forEach(log => {
    const dateKey = format(startOfDay(new Date(log.timestamp)), 'yyyy-MM-dd');
    dailyConsumption[dateKey] = (dailyConsumption[dateKey] || 0) + log.quantity;
  });

  const consumptionValues = Object.values(dailyConsumption);
  
  // Calculate moving average with window of 7 days
  const movingAverages = calculateMovingAverage(consumptionValues, 7);
  const trend = detectTrend(movingAverages);
  
  // Calculate weighted average (more weight to recent data)
  const weights = consumptionValues.map((_, i) => 1 + (i / consumptionValues.length) * 0.5);
  const weightedSum = consumptionValues.reduce((sum, val, i) => sum + val * weights[i], 0);
  const weightsSum = weights.reduce((sum, w) => sum + w, 0);
  const averageDailyConsumption = weightedSum / weightsSum / daysTracked;

  // Analyze weekday patterns
  const weekdayPattern = analyzeWeekdayPattern(medicineLogs);

  // Predict run out date with trend adjustment
  let predictedRunOutDate: Date | null = null;
  let daysUntilRunOut: number | null = null;
  let recommendedRefillDate: Date | null = null;

  if (averageDailyConsumption > 0 && medicine.currentStock > 0) {
    // Adjust prediction based on trend
    let adjustedConsumption = averageDailyConsumption;
    if (trend === 'increasing') {
      adjustedConsumption *= 1.15; // 15% increase for safety
    } else if (trend === 'decreasing') {
      adjustedConsumption *= 0.9; // 10% decrease
    }
    
    daysUntilRunOut = Math.floor(medicine.currentStock / adjustedConsumption);
    predictedRunOutDate = addDays(new Date(), daysUntilRunOut);
    
    // Smart refill recommendation
    const criticalThreshold = Math.max(7, Math.floor(daysUntilRunOut * 0.25));
    recommendedRefillDate = addDays(new Date(), Math.max(0, daysUntilRunOut - criticalThreshold));
  }

  // Enhanced confidence calculation
  let confidence: 'high' | 'medium' | 'low' = 'low';
  const dataPoints = medicineLogs.length;
  const consistency = consumptionValues.length >= 5 
    ? 1 - (Math.min(...consumptionValues) / Math.max(...consumptionValues))
    : 1;
  
  if (dataPoints >= 15 && daysTracked >= 21 && consistency < 0.5) {
    confidence = 'high';
  } else if (dataPoints >= 7 && daysTracked >= 10 && consistency < 0.7) {
    confidence = 'medium';
  }

  return {
    medicineId: medicine.id,
    medicineName: medicine.name,
    averageDailyConsumption,
    totalConsumed,
    daysTracked,
    predictedRunOutDate,
    daysUntilRunOut,
    recommendedRefillDate,
    confidence,
    trend,
    weekdayPattern
  };
}

// Get stock prediction for next periods
export function getStockPrediction(
  medicine: Medicine,
  pattern: ConsumptionPattern
): StockPrediction {
  const currentStock = medicine.currentStock;
  const dailyRate = pattern.averageDailyConsumption;

  const projectedStock7Days = Math.max(0, currentStock - (dailyRate * 7));
  const projectedStock30Days = Math.max(0, currentStock - (dailyRate * 30));

  // Determine risk level
  let runOutRisk: 'critical' | 'warning' | 'low' | 'safe' = 'safe';
  
  if (projectedStock7Days === 0) {
    runOutRisk = 'critical';
  } else if (projectedStock30Days === 0) {
    runOutRisk = 'warning';
  } else if (pattern.daysUntilRunOut !== null && pattern.daysUntilRunOut < 60) {
    runOutRisk = 'low';
  }

  return {
    currentStock,
    projectedStock7Days,
    projectedStock30Days,
    runOutRisk
  };
}

// Analyze all medicines and return predictions
export function analyzeMedicineInventory(
  medicines: Medicine[],
  logs: MedicineLog[]
): ConsumptionPattern[] {
  return medicines
    .map(medicine => analyzeConsumptionPattern(medicine, logs))
    .sort((a, b) => {
      // Sort by urgency: medicines running out soon first
      if (a.daysUntilRunOut === null) return 1;
      if (b.daysUntilRunOut === null) return -1;
      return a.daysUntilRunOut - b.daysUntilRunOut;
    });
}

// Get medicines that need attention
export function getMedicinesNeedingAttention(
  patterns: ConsumptionPattern[]
): {
  critical: ConsumptionPattern[];
  warning: ConsumptionPattern[];
  upcoming: ConsumptionPattern[];
} {
  const critical: ConsumptionPattern[] = [];
  const warning: ConsumptionPattern[] = [];
  const upcoming: ConsumptionPattern[] = [];

  patterns.forEach(pattern => {
    if (pattern.daysUntilRunOut === null) return;

    if (pattern.daysUntilRunOut <= 3) {
      critical.push(pattern);
    } else if (pattern.daysUntilRunOut <= 7) {
      warning.push(pattern);
    } else if (pattern.daysUntilRunOut <= 14) {
      upcoming.push(pattern);
    }
  });

  return { critical, warning, upcoming };
}

// Calculate adherence rate
export function calculateAdherenceRate(
  medicine: Medicine,
  logs: MedicineLog[],
  expectedDailyDoses: number = 1
): {
  adherenceRate: number;
  expectedDoses: number;
  actualDoses: number;
  missedDoses: number;
} {
  const medicineLogs = logs
    .filter(log => log.medicineId === medicine.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (medicineLogs.length === 0) {
    return {
      adherenceRate: 0,
      expectedDoses: 0,
      actualDoses: 0,
      missedDoses: 0
    };
  }

  const firstLog = new Date(medicineLogs[0].timestamp);
  const today = new Date();
  const daysTracked = Math.max(1, differenceInDays(today, firstLog));

  const expectedDoses = daysTracked * expectedDailyDoses;
  const actualDoses = medicineLogs.length;
  const missedDoses = Math.max(0, expectedDoses - actualDoses);
  const adherenceRate = (actualDoses / expectedDoses) * 100;

  return {
    adherenceRate: Math.min(100, adherenceRate),
    expectedDoses,
    actualDoses,
    missedDoses
  };
}

// Generate insights from patterns
export function generateInsights(
  medicines: Medicine[],
  logs: MedicineLog[]
): string[] {
  const insights: string[] = [];
  const patterns = analyzeMedicineInventory(medicines, logs);
  const attention = getMedicinesNeedingAttention(patterns);

  // Critical alerts
  if (attention.critical.length > 0) {
    insights.push(
      `🚨 URGENT: ${attention.critical.length} medicine(s) will run out within 3 days: ${attention.critical.map(p => p.medicineName).join(', ')}`
    );
  }

  // Warning alerts
  if (attention.warning.length > 0) {
    insights.push(
      `⚠️ Warning: ${attention.warning.length} medicine(s) will run out within a week: ${attention.warning.map(p => p.medicineName).join(', ')}`
    );
  }

  // Consumption patterns
  const highConsumption = patterns.filter(p => p.averageDailyConsumption > 3);
  if (highConsumption.length > 0) {
    insights.push(
      `📊 High consumption detected for: ${highConsumption.map(p => `${p.medicineName} (${p.averageDailyConsumption.toFixed(1)}/day)`).join(', ')}`
    );
  }

  // Adherence insights
  patterns.forEach(pattern => {
    const medicine = medicines.find(m => m.id === pattern.medicineId);
    if (medicine && pattern.daysTracked >= 7) {
      const schedule = medicine.schedule;
      let expectedDailyDoses = 1;
      
      if (schedule === 'three_times') expectedDailyDoses = 3;
      else if (schedule?.includes('_')) expectedDailyDoses = 2;

      const adherence = calculateAdherenceRate(medicine, logs, expectedDailyDoses);
      
      if (adherence.adherenceRate < 80) {
        insights.push(
          `📉 Low adherence for ${medicine.name}: ${adherence.adherenceRate.toFixed(0)}% (${adherence.missedDoses} missed doses)`
        );
      } else if (adherence.adherenceRate > 95) {
        insights.push(
          `✅ Excellent adherence for ${medicine.name}: ${adherence.adherenceRate.toFixed(0)}%`
        );
      }
    }
  });

  // General health
  if (insights.length === 0) {
    insights.push('✨ All medicines are well-stocked and adherence is good!');
  }

  return insights;
}
