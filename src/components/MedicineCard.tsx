import { Edit, Trash2, Pill, Sunrise, Sun, Moon, Clock, AlertTriangle, CheckCircle, Heart, Droplet, Shield, Tablets, Sparkles, Activity } from "lucide-react";
import { Medicine, MedicineLog } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MedicineCardProps {
  medicine: Medicine;
  onTake: (medicine: Medicine) => void;
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
  lowStockThreshold?: number;
  medicineLogs?: MedicineLog[];
}

export const MedicineCard = ({ medicine, onTake, onEdit, onDelete, lowStockThreshold, medicineLogs = [] }: MedicineCardProps) => {
  const stockPercentage = (medicine.currentStock / medicine.totalStock) * 100;
  const threshold = typeof lowStockThreshold === 'number' ? lowStockThreshold : 20;
  const isLowStock = stockPercentage < threshold;
  const isCriticalStock = stockPercentage < threshold / 2;

  // Check if medicine was taken today
  const wasTakenToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return medicineLogs.some(log => {
      if (log.medicineId !== medicine.id) return false;
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
  };

  const takenToday = wasTakenToday();

  const getScheduleIcon = (schedule: Medicine["schedule"]) => {
    switch (schedule) {
      case 'morning':
        return <Sunrise className="h-3.5 w-3.5" />;
      case 'noon':
        return <Sun className="h-3.5 w-3.5" />;
      case 'night':
        return <Moon className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const getScheduleLabel = (schedule: Medicine["schedule"]) => {
    const labels = {
      morning: 'Morning',
      noon: 'Noon',
      night: 'Night',
      morning_noon: 'Morning & Noon',
      morning_night: 'Morning & Night',
      noon_night: 'Noon & Night',
      three_times: '3x daily',
    } as const;
    return schedule ? labels[schedule] : '';
  };

  const getCategoryInfo = (category: Medicine["category"]) => {
    const categoryMap = {
      pain_relief: { label: 'Pain Relief', icon: Tablets, color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30' },
      diabetes: { label: 'Diabetes', icon: Droplet, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' },
      heart: { label: 'Heart', icon: Heart, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30' },
      blood_pressure: { label: 'Blood Pressure', icon: Activity, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
      antibiotic: { label: 'Antibiotic', icon: Shield, color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' },
      vitamin: { label: 'Vitamin', icon: Sparkles, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' },
      other: { label: 'Other', icon: Pill, color: 'text-gray-400', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/30' },
    };
    return category ? categoryMap[category] : null;
  };

  const categoryInfo = getCategoryInfo(medicine.category);
  
  return (
    <Card className="etery-card group overflow-hidden hover:scale-105 transition-all duration-300 relative mobile-optimized tap-highlight-none">
      {/* Status indicator badge */}
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10">
        {isCriticalStock ? (
          <div className="p-1 sm:p-1.5 rounded-full bg-red-500/20 border border-red-500/30">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400 animate-pulse" />
          </div>
        ) : isLowStock ? (
          <div className="p-1 sm:p-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
          </div>
        ) : takenToday ? (
          <div className="p-1 sm:p-1.5 rounded-full bg-green-500/20 border border-green-500/30">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
          </div>
        ) : null}
      </div>

      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                <Pill className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <CardTitle className="text-base sm:text-lg font-medium truncate transition-colors duration-300">{medicine.name}</CardTitle>
            </div>
            {medicine.dosage && (
              <CardDescription className="text-xs sm:text-sm mt-1.5 line-clamp-1">{medicine.dosage}</CardDescription>
            )}
            <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {medicine.schedule && (
                <Badge variant="secondary" className="text-xs font-normal border-0 gap-1">
                  {getScheduleIcon(medicine.schedule)}
                  <span className="hidden xs:inline">{getScheduleLabel(medicine.schedule)}</span>
                </Badge>
              )}
              {categoryInfo && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs font-normal border gap-1 ${categoryInfo.bgColor} ${categoryInfo.borderColor}`}
                >
                  <categoryInfo.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${categoryInfo.color}`} />
                  <span className={`${categoryInfo.color} hidden xs:inline`}>{categoryInfo.label}</span>
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 touch-target" onClick={() => onEdit(medicine)}>
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 touch-target" onClick={() => onDelete(medicine.id)}>
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="space-y-2 sm:space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Stock Level</span>
            <span className={`font-medium tabular-nums ${
              isCriticalStock ? 'text-red-400 animate-pulse' : 
              isLowStock ? 'text-yellow-400' : 
              'text-green-400'
            }`}>
              {medicine.currentStock} / {medicine.totalStock}
            </span>
          </div>
          <div className="relative h-1.5 bg-secondary/40 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isCriticalStock ? 'bg-red-500 animate-pulse-glow' : 
                isLowStock ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {medicine.notes && (
          <p className="text-xs sm:text-sm text-muted-foreground/80 line-clamp-2">{medicine.notes}</p>
        )}
        
        <Button 
          className="w-full h-9 sm:h-10 text-xs sm:text-sm font-normal touch-target" 
          onClick={() => onTake(medicine)}
          disabled={medicine.currentStock === 0}
        >
          {medicine.currentStock === 0 ? 'Out of Stock' : 'Take Medicine'}
        </Button>
      </CardContent>
    </Card>
  );
};
