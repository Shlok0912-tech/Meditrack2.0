import { useState, useEffect } from 'react';
import { Medicine, MedicineLog } from '@/lib/storage';
import {
  analyzeMedicineInventory,
  getMedicinesNeedingAttention,
  getStockPrediction,
  generateInsights,
  ConsumptionPattern
} from '@/lib/predictiveAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Clock, Calendar, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PredictiveAnalyticsPanelProps {
  medicines: Medicine[];
  medicineLogs: MedicineLog[];
}

export function PredictiveAnalyticsPanel({ medicines, medicineLogs }: PredictiveAnalyticsPanelProps) {
  const [patterns, setPatterns] = useState<ConsumptionPattern[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [attention, setAttention] = useState<{
    critical: ConsumptionPattern[];
    warning: ConsumptionPattern[];
    upcoming: ConsumptionPattern[];
  }>({ critical: [], warning: [], upcoming: [] });

  useEffect(() => {
    const analyzedPatterns = analyzeMedicineInventory(medicines, medicineLogs);
    const generatedInsights = generateInsights(medicines, medicineLogs);
    const needingAttention = getMedicinesNeedingAttention(analyzedPatterns);

    setPatterns(analyzedPatterns);
    setInsights(generatedInsights);
    setAttention(needingAttention);
  }, [medicines, medicineLogs]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-orange-600 dark:text-orange-400';
      case 'low':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-green-600 dark:text-green-400';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default" className="bg-green-600">High Confidence</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Confidence</Badge>;
      default:
        return <Badge variant="outline">Low Confidence</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            AI-Powered Insights
          </CardTitle>
          <CardDescription>
            Real-time analysis of your medication patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <Alert key={index} variant={insight.includes('URGENT') ? 'destructive' : 'default'}>
                <AlertDescription className="text-sm">{insight}</AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical & Warning Medicines */}
      {(attention.critical.length > 0 || attention.warning.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              Medicines Requiring Attention
            </CardTitle>
            <CardDescription>
              Medicines that will run out soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {[...attention.critical, ...attention.warning].map((pattern) => {
                  const medicine = medicines.find(m => m.id === pattern.medicineId);
                  if (!medicine) return null;

                  const prediction = getStockPrediction(medicine, pattern);
                  const stockPercent = medicine.totalStock > 0 
                    ? (medicine.currentStock / medicine.totalStock) * 100
                    : 0;

                  return (
                    <div key={pattern.medicineId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{pattern.medicineName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {medicine.currentStock} tablets remaining ({stockPercent.toFixed(0)}%)
                          </p>
                        </div>
                        <Badge 
                          variant={pattern.daysUntilRunOut! <= 3 ? 'destructive' : 'default'}
                          className={cn(
                            pattern.daysUntilRunOut! > 3 && 'bg-orange-600'
                          )}
                        >
                          {pattern.daysUntilRunOut} days left
                        </Badge>
                      </div>

                      <Progress value={stockPercent} className="h-2" />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Daily Usage</p>
                          <p className="font-medium">
                            {pattern.averageDailyConsumption.toFixed(1)} tablets/day
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Run Out Date</p>
                          <p className="font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {pattern.predictedRunOutDate 
                              ? format(pattern.predictedRunOutDate, 'MMM dd, yyyy')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {pattern.recommendedRefillDate && (
                        <Alert>
                          <Calendar className="h-4 w-4" />
                          <AlertTitle>Recommended Refill</AlertTitle>
                          <AlertDescription>
                            {format(pattern.recommendedRefillDate, 'MMMM dd, yyyy')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* All Medicine Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Consumption Patterns & Predictions
          </CardTitle>
          <CardDescription>
            Detailed analysis for all medicines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {patterns.map((pattern) => {
                const medicine = medicines.find(m => m.id === pattern.medicineId);
                if (!medicine) return null;

                const prediction = getStockPrediction(medicine, pattern);
                const stockPercent = medicine.totalStock > 0 
                  ? (medicine.currentStock / medicine.totalStock) * 100
                  : 0;

                return (
                  <div key={pattern.medicineId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{pattern.medicineName}</h4>
                          {getConfidenceBadge(pattern.confidence)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tracked for {pattern.daysTracked} days • {pattern.totalConsumed} total consumed
                        </p>
                      </div>
                      {pattern.daysUntilRunOut !== null && (
                        <Badge variant="outline" className="shrink-0">
                          {pattern.daysUntilRunOut} days left
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground mb-1">Current</p>
                        <p className="font-bold text-lg">{medicine.currentStock}</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground mb-1">7 Days</p>
                        <p className="font-bold text-lg">{Math.round(prediction.projectedStock7Days)}</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground mb-1">30 Days</p>
                        <p className="font-bold text-lg">{Math.round(prediction.projectedStock30Days)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {prediction.runOutRisk === 'safe' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                        )}
                        <span className={getRiskColor(prediction.runOutRisk)}>
                          {prediction.runOutRisk.toUpperCase()} Risk
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        ~{pattern.averageDailyConsumption.toFixed(2)} tablets/day
                      </span>
                    </div>
                  </div>
                );
              })}

              {patterns.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No consumption data available yet. Start logging your medicine intake to see predictions!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
