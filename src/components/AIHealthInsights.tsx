import { useState, useEffect } from 'react';
import { Medicine, MedicineLog, GlucoseReading } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Activity, 
  Zap,
  Lightbulb,
  Target,
  Award
} from 'lucide-react';
import { differenceInDays, format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface AIHealthInsightsProps {
  medicines: Medicine[];
  medicineLogs: MedicineLog[];
  glucoseReadings: GlucoseReading[];
}

interface HealthInsight {
  type: 'positive' | 'warning' | 'info' | 'critical';
  category: 'adherence' | 'glucose' | 'patterns' | 'recommendations';
  title: string;
  description: string;
  metric?: number;
  icon: any;
}

export function AIHealthInsights({ medicines, medicineLogs, glucoseReadings }: AIHealthInsightsProps) {
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [healthScore, setHealthScore] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    const generatedInsights = generateHealthInsights();
    setInsights(generatedInsights);
    
    const score = calculateHealthScore();
    setHealthScore(score);

    const streak = calculateStreak();
    setStreakDays(streak);
  }, [medicines, medicineLogs, glucoseReadings]);

  const generateHealthInsights = (): HealthInsight[] => {
    const insights: HealthInsight[] = [];

    // Medication Adherence Analysis
    const adherenceInsights = analyzeAdherence();
    insights.push(...adherenceInsights);

    // Glucose Pattern Analysis
    const glucoseInsights = analyzeGlucosePatterns();
    insights.push(...glucoseInsights);

    // Timing Pattern Analysis
    const timingInsights = analyzeTimingPatterns();
    insights.push(...timingInsights);

    // Personalized Recommendations
    const recommendations = generateRecommendations();
    insights.push(...recommendations);

    return insights;
  };

  const analyzeAdherence = (): HealthInsight[] => {
    const insights: HealthInsight[] = [];
    const last7Days = subDays(new Date(), 7);
    
    const recentLogs = medicineLogs.filter(
      log => new Date(log.timestamp) >= last7Days
    );

    const adherenceRate = (recentLogs.length / (medicines.length * 7)) * 100;

    if (adherenceRate >= 90) {
      insights.push({
        type: 'positive',
        category: 'adherence',
        title: 'Excellent Medication Adherence!',
        description: `You've maintained ${adherenceRate.toFixed(0)}% adherence over the past week. Keep up the great work!`,
        metric: adherenceRate,
        icon: Award
      });
    } else if (adherenceRate < 70) {
      insights.push({
        type: 'warning',
        category: 'adherence',
        title: 'Adherence Needs Attention',
        description: `Your adherence rate is ${adherenceRate.toFixed(0)}%. Try setting reminders to improve consistency.`,
        metric: adherenceRate,
        icon: Target
      });
    }

    // Check for missed medications
    const missedMeds = medicines.filter(med => {
      const medLogs = medicineLogs.filter(log => 
        log.medicineId === med.id && 
        new Date(log.timestamp) >= last7Days
      );
      return medLogs.length === 0;
    });

    if (missedMeds.length > 0) {
      insights.push({
        type: 'warning',
        category: 'adherence',
        title: 'Medications Not Taken Recently',
        description: `You haven't logged ${missedMeds.map(m => m.name).join(', ')} in the past 7 days.`,
        icon: Lightbulb
      });
    }

    return insights;
  };

  const analyzeGlucosePatterns = (): HealthInsight[] => {
    const insights: HealthInsight[] = [];
    
    if (glucoseReadings.length < 3) {
      return insights;
    }

    const recent = glucoseReadings.slice(-7);
    const avgGlucose = recent.reduce((sum, r) => sum + r.value, 0) / recent.length;
    
    const trend = calculateGlucoseTrend(recent);

    if (avgGlucose >= 70 && avgGlucose <= 100) {
      insights.push({
        type: 'positive',
        category: 'glucose',
        title: 'Glucose Levels in Optimal Range',
        description: `Your average glucose is ${avgGlucose.toFixed(1)} mg/dL - within the healthy range!`,
        metric: avgGlucose,
        icon: Heart
      });
    } else if (avgGlucose > 130) {
      insights.push({
        type: 'warning',
        category: 'glucose',
        title: 'Elevated Glucose Levels Detected',
        description: `Average glucose is ${avgGlucose.toFixed(1)} mg/dL. Consider consulting your healthcare provider.`,
        metric: avgGlucose,
        icon: TrendingUp
      });
    } else if (avgGlucose < 70) {
      insights.push({
        type: 'critical',
        category: 'glucose',
        title: 'Low Glucose Alert',
        description: `Average glucose is ${avgGlucose.toFixed(1)} mg/dL. Watch for hypoglycemia symptoms.`,
        metric: avgGlucose,
        icon: TrendingDown
      });
    }

    if (trend === 'improving') {
      insights.push({
        type: 'positive',
        category: 'glucose',
        title: 'Glucose Trend Improving',
        description: 'Your glucose levels show a positive downward trend over the past week.',
        icon: TrendingDown
      });
    } else if (trend === 'worsening') {
      insights.push({
        type: 'warning',
        category: 'glucose',
        title: 'Glucose Trend Rising',
        description: 'Your glucose levels are trending upward. Review your diet and medication timing.',
        icon: TrendingUp
      });
    }

    return insights;
  };

  const analyzeTimingPatterns = (): HealthInsight[] => {
    const insights: HealthInsight[] = [];
    
    // Analyze time-of-day patterns
    const hourCounts: { [hour: number]: number } = {};
    
    medicineLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostCommonHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0];

    if (mostCommonHour) {
      const hour = parseInt(mostCommonHour[0]);
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      insights.push({
        type: 'info',
        category: 'patterns',
        title: 'Medication Timing Pattern Detected',
        description: `You most frequently take medicines in the ${timeOfDay} (around ${hour}:00).`,
        icon: Activity
      });
    }

    // Check for consistency
    const last14Days = subDays(new Date(), 14);
    const recentLogs = medicineLogs.filter(log => new Date(log.timestamp) >= last14Days);
    
    if (recentLogs.length >= 10) {
      const times = recentLogs.map(log => new Date(log.timestamp).getHours());
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
      
      if (variance < 4) {
        insights.push({
          type: 'positive',
          category: 'patterns',
          title: 'Consistent Medication Schedule',
          description: 'You\'re taking medications at consistent times - great for effectiveness!',
          icon: Zap
          });
      }
    }

    return insights;
  };

  const generateRecommendations = (): HealthInsight[] => {
    const insights: HealthInsight[] = [];

    // Stock recommendations
    const lowStock = medicines.filter(m => 
      m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < 30
    );

    if (lowStock.length > 0) {
      insights.push({
        type: 'info',
        category: 'recommendations',
        title: 'Refill Recommendation',
        description: `Consider refilling: ${lowStock.map(m => m.name).join(', ')}`,
        icon: Lightbulb
      });
    }

    // Glucose monitoring recommendation
    const daysSinceLastGlucose = glucoseReadings.length > 0
      ? differenceInDays(new Date(), new Date(glucoseReadings[glucoseReadings.length - 1].timestamp))
      : 999;

    if (daysSinceLastGlucose > 3 && medicines.some(m => m.category === 'diabetes')) {
      insights.push({
        type: 'info',
        category: 'recommendations',
        title: 'Glucose Monitoring Reminder',
        description: `It's been ${daysSinceLastGlucose} days since your last glucose reading. Regular monitoring is important.`,
        icon: Activity
      });
    }

    return insights;
  };

  const calculateGlucoseTrend = (readings: GlucoseReading[]): 'improving' | 'stable' | 'worsening' => {
    if (readings.length < 3) return 'stable';

    const firstHalf = readings.slice(0, Math.floor(readings.length / 2));
    const secondHalf = readings.slice(Math.floor(readings.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.value, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change < -5) return 'improving';
    if (change > 5) return 'worsening';
    return 'stable';
  };

  const calculateHealthScore = (): number => {
    let score = 0;
    let weights = { adherence: 0, glucose: 0, consistency: 0, engagement: 0 };
    
    // 1. Medication Adherence Score (35 points)
    const last14Days = subDays(new Date(), 14);
    const recentLogs = medicineLogs.filter(log => new Date(log.timestamp) >= last14Days);
    const expectedDoses = medicines.length * 14;
    const adherenceRate = expectedDoses > 0 ? (recentLogs.length / expectedDoses) : 1;
    const adherenceScore = Math.min(35, adherenceRate * 35);
    score += adherenceScore;
    weights.adherence = adherenceScore;

    // 2. Glucose Control Score (25 points)
    if (glucoseReadings.length > 0) {
      const recentGlucose = glucoseReadings.slice(-7);
      const avgGlucose = recentGlucose.reduce((sum, r) => sum + r.value, 0) / recentGlucose.length;
      
      let glucoseScore = 0;
      if (avgGlucose >= 70 && avgGlucose <= 100) {
        glucoseScore = 25; // Optimal
      } else if (avgGlucose > 100 && avgGlucose <= 125) {
        glucoseScore = 20; // Good
      } else if (avgGlucose > 125 && avgGlucose <= 140) {
        glucoseScore = 15; // Fair
      } else if (avgGlucose >= 60 && avgGlucose < 70) {
        glucoseScore = 18; // Slightly low but acceptable
      } else {
        glucoseScore = 10; // Needs attention
      }
      
      score += glucoseScore;
      weights.glucose = glucoseScore;
    } else {
      score += 15; // Neutral if no glucose data
      weights.glucose = 15;
    }

    // 3. Consistency Score (25 points)
    if (recentLogs.length >= 7) {
      // Time consistency
      const times = recentLogs.map(log => new Date(log.timestamp).getHours());
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const timeVariance = times.reduce((sum, time) => 
        sum + Math.pow(time - avgTime, 2), 0) / times.length;
      
      const timeConsistency = Math.max(0, 12 - timeVariance); // Lower variance = higher score
      
      // Daily consistency - check if medicines are taken every day
      const datesSet = new Set(recentLogs.map(log => 
        format(new Date(log.timestamp), 'yyyy-MM-dd')
      ));
      const uniqueDays = datesSet.size;
      const dailyConsistency = (uniqueDays / 14) * 13; // 13 points max
      
      const consistencyScore = Math.min(25, timeConsistency + dailyConsistency);
      score += consistencyScore;
      weights.consistency = consistencyScore;
    } else {
      score += 10; // Partial credit for minimal data
      weights.consistency = 10;
    }

    // 4. Engagement Score (15 points)
    // Based on data recency and completeness
    const dataAge = medicineLogs.length > 0 
      ? differenceInDays(new Date(), new Date(medicineLogs[medicineLogs.length - 1].timestamp))
      : 999;
    
    let engagementScore = 15;
    if (dataAge > 7) engagementScore = 5;
    else if (dataAge > 3) engagementScore = 10;
    else if (dataAge > 1) engagementScore = 13;
    
    // Bonus for having glucose data
    if (glucoseReadings.length > 0) {
      const glucoseAge = differenceInDays(new Date(), new Date(glucoseReadings[glucoseReadings.length - 1].timestamp));
      if (glucoseAge <= 3) engagementScore = Math.min(15, engagementScore + 2);
    }
    
    score += engagementScore;
    weights.engagement = engagementScore;

    return Math.min(100, Math.round(score));
  };

  const calculateStreak = (): number => {
    const sortedLogs = [...medicineLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const logsOnDay = sortedLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === currentDate.getTime();
      });

      if (logsOnDay.length > 0) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const getInsightIcon = (IconComponent: any, type: string) => {
    const colorClass = 
      type === 'positive' ? 'text-green-600' :
      type === 'warning' ? 'text-orange-600' :
      type === 'critical' ? 'text-red-600' :
      'text-blue-600';
    
    return <IconComponent className={cn('h-5 w-5', colorClass)} />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Health Score Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Health Score
          </CardTitle>
          <CardDescription>
            Your overall health management score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className={cn('text-5xl font-bold', getScoreColor(healthScore))}>
                {healthScore}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {getScoreLabel(healthScore)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{streakDays}</p>
                  <p className="text-xs text-muted-foreground">day streak</p>
                </div>
              </div>
            </div>
          </div>
          <Progress value={healthScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Personalized Health Insights
          </CardTitle>
          <CardDescription>
            AI-powered analysis of your health data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Alert 
                  key={index}
                  variant={insight.type === 'critical' ? 'destructive' : 'default'}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.icon, insight.type)}
                    <div className="flex-1">
                      <AlertTitle className="mb-1">{insight.title}</AlertTitle>
                      <AlertDescription>{insight.description}</AlertDescription>
                      {insight.metric !== undefined && (
                        <Badge variant="outline" className="mt-2">
                          {insight.metric.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
                    </Badge>
                  </div>
                </Alert>
              ))}

              {insights.length === 0 && (
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertTitle>Building Your Health Profile</AlertTitle>
                  <AlertDescription>
                    Keep logging your medications and glucose readings to get personalized AI insights!
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
