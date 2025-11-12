import { Medicine, MedicineLog, GlucoseReading } from "@/lib/storage";
import { Pill, TrendingUp, Calendar, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuickStatsProps {
  medicines: Medicine[];
  medicineLogs: MedicineLog[];
  glucoseReadings: GlucoseReading[];
  lowStockThreshold?: number;
}

export const QuickStats = ({ medicines, medicineLogs, glucoseReadings, lowStockThreshold = 20 }: QuickStatsProps) => {
  // Calculate stats
  const totalMedicines = medicines.length;
  const lowStockCount = medicines.filter(m => 
    m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < lowStockThreshold
  ).length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysLogs = medicineLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime();
  });
  const medicinesTakenToday = todaysLogs.length;

  const last7Days = glucoseReadings.filter(r => {
    const readingDate = new Date(r.timestamp);
    const daysDiff = (Date.now() - readingDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  });
  const avgGlucose = last7Days.length > 0 
    ? Math.round(last7Days.reduce((sum, r) => sum + r.value, 0) / last7Days.length)
    : 0;

  const last30DaysLogs = medicineLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    const daysDiff = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  });
  const adherenceRate = medicines.length > 0 && last30DaysLogs.length > 0 
    ? Math.min(100, Math.round((last30DaysLogs.length / (medicines.length * 30)) * 100))
    : 0;

  const stats = [
    {
      title: "Total Medicines",
      value: totalMedicines,
      icon: Pill,
      gradient: "bg-gradient-primary",
      iconColor: "text-blue-400",
      description: "in inventory"
    },
    {
      title: "Taken Today",
      value: medicinesTakenToday,
      icon: CheckCircle2,
      gradient: "bg-gradient-success",
      iconColor: "text-green-400",
      description: "doses recorded"
    },
    {
      title: "Avg Glucose (7d)",
      value: avgGlucose > 0 ? avgGlucose : "-",
      icon: Activity,
      gradient: avgGlucose > 0 && avgGlucose < 180 ? "bg-gradient-success" : "bg-gradient-warning",
      iconColor: avgGlucose > 0 && avgGlucose < 180 ? "text-green-400" : "text-yellow-400",
      description: avgGlucose > 0 ? "mg/dL" : "no data",
      unit: avgGlucose > 0 ? "mg/dL" : ""
    },
    {
      title: "Low Stock Alert",
      value: lowStockCount,
      icon: AlertCircle,
      gradient: lowStockCount > 0 ? "bg-gradient-danger" : "bg-gradient-success",
      iconColor: lowStockCount > 0 ? "text-red-400" : "text-green-400",
      description: lowStockCount > 0 ? "needs refill" : "all good"
    },
    {
      title: "Adherence Rate",
      value: `${adherenceRate}%`,
      icon: TrendingUp,
      gradient: adherenceRate >= 80 ? "bg-gradient-success" : adherenceRate >= 60 ? "bg-gradient-warning" : "bg-gradient-danger",
      iconColor: adherenceRate >= 80 ? "text-green-400" : adherenceRate >= 60 ? "text-yellow-400" : "text-red-400",
      description: "last 30 days"
    },
    {
      title: "This Month",
      value: last30DaysLogs.length,
      icon: Calendar,
      gradient: "bg-gradient-primary",
      iconColor: "text-blue-400",
      description: "doses taken"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {stats.map((stat, index) => (
        <Card 
          key={stat.title}
          className={`stat-card group overflow-hidden relative animate-fade-in-up border-0 mobile-optimized tap-highlight-none`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                  {stat.title}
                </p>
                <p className="text-2xl sm:text-3xl font-bold mb-1 tabular-nums truncate">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground/70 truncate">
                  {stat.description}
                </p>
              </div>
              <div className={`p-2 sm:p-3 rounded-xl ${stat.gradient} transition-transform group-hover:scale-110 flex-shrink-0`}>
                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor}`} />
              </div>
            </div>
            
            {/* Decorative gradient overlay */}
            <div className={`absolute -bottom-12 -right-12 w-32 h-32 ${stat.gradient} opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 hidden sm:block`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
