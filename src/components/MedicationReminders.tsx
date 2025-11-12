import { Medicine } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Sunrise, Sun, Moon, Clock, Pill, X, CheckCheck } from "lucide-react";
import { useState, useEffect } from "react";

interface MedicationRemindersProps {
  medicines: Medicine[];
  onTakeMedicine: (medicine: Medicine) => void;
  onTakeAll?: (medicines: Medicine[]) => void;
}

export const MedicationReminders = ({ medicines, onTakeMedicine, onTakeAll }: MedicationRemindersProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dismissedMedicines, setDismissedMedicines] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Reset dismissed medicines when period changes
  useEffect(() => {
    const period = getCurrentPeriod();
    const storageKey = `dismissed_medicines_${period}_${new Date().toDateString()}`;
    
    // Load dismissed medicines for current period
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setDismissedMedicines(new Set(JSON.parse(saved)));
    } else {
      setDismissedMedicines(new Set());
    }
  }, [currentTime]);

  const getCurrentPeriod = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'noon';
    return 'night';
  };

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case 'morning':
        return <Sunrise className="h-4 w-4" />;
      case 'noon':
        return <Sun className="h-4 w-4" />;
      case 'night':
        return <Moon className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPeriodLabel = (period: string) => {
    const labels: { [key: string]: string } = {
      morning: 'Morning',
      noon: 'Afternoon',
      night: 'Evening',
    };
    return labels[period] || 'Now';
  };

  const currentPeriod = getCurrentPeriod();

  const getDueMedicines = () => {
    return medicines.filter(medicine => {
      // Skip if already dismissed
      if (dismissedMedicines.has(medicine.id)) return false;
      
      if (!medicine.schedule || medicine.currentStock === 0) return false;
      
      const schedule = medicine.schedule;
      
      if (currentPeriod === 'morning' && 
          (schedule === 'morning' || schedule === 'morning_noon' || schedule === 'morning_night' || schedule === 'three_times')) {
        return true;
      }
      if (currentPeriod === 'noon' && 
          (schedule === 'noon' || schedule === 'morning_noon' || schedule === 'noon_night' || schedule === 'three_times')) {
        return true;
      }
      if (currentPeriod === 'night' && 
          (schedule === 'night' || schedule === 'morning_night' || schedule === 'noon_night' || schedule === 'three_times')) {
        return true;
      }
      
      return false;
    });
  };

  const handleDismiss = (medicineId: string) => {
    const newDismissed = new Set(dismissedMedicines);
    newDismissed.add(medicineId);
    setDismissedMedicines(newDismissed);
    
    // Save to localStorage for current period and date
    const storageKey = `dismissed_medicines_${currentPeriod}_${new Date().toDateString()}`;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(newDismissed)));
  };

  const handleTake = (medicine: Medicine) => {
    // Dismiss from reminders
    handleDismiss(medicine.id);
    // Call the original take medicine handler
    onTakeMedicine(medicine);
  };

  const handleTakeAll = () => {
    if (dueMedicines.length === 0) return;
    
    // Dismiss all medicines from reminders
    const newDismissed = new Set(dismissedMedicines);
    dueMedicines.forEach(medicine => {
      newDismissed.add(medicine.id);
    });
    setDismissedMedicines(newDismissed);
    
    // Save to localStorage
    const storageKey = `dismissed_medicines_${currentPeriod}_${new Date().toDateString()}`;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(newDismissed)));
    
    // Call the take all handler if provided
    if (onTakeAll) {
      onTakeAll(dueMedicines);
    } else {
      // Fallback: call onTakeMedicine for each medicine
      dueMedicines.forEach(medicine => {
        onTakeMedicine(medicine);
      });
    }
  };

  const dueMedicines = getDueMedicines();

  if (dueMedicines.length === 0) {
    return (
      <Card className="etery-card border-0 mobile-optimized">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
            </div>
            <CardTitle className="text-base sm:text-lg font-medium">Medication Reminders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="text-center py-6 sm:py-8">
            <div className="p-3 sm:p-4 rounded-full bg-green-500/10 border border-green-500/20 inline-block mb-3">
              {getPeriodIcon(currentPeriod)}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">No medications scheduled for {getPeriodLabel(currentPeriod).toLowerCase()}</p>
            <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1">You're all caught up! 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="etery-card border-0 mobile-optimized">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 animate-pulse flex-shrink-0">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            </div>
            <CardTitle className="text-base sm:text-lg font-medium truncate">Medication Reminders</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 flex-shrink-0 text-xs">
              {getPeriodIcon(currentPeriod)}
              <span className="hidden sm:inline">{getPeriodLabel(currentPeriod)}</span>
            </Badge>
            {dueMedicines.length > 1 && (
              <Button 
                size="sm" 
                onClick={handleTakeAll}
                className="gap-1.5 touch-target"
              >
                <CheckCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Take All</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-6">
        {dueMedicines.map((medicine, index) => (
          <div
            key={medicine.id}
            className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-primary border border-primary/20 hover:border-primary/30 transition-all animate-fade-in-up tap-highlight-none"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-primary/20 flex-shrink-0">
                <Pill className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm sm:text-base">{medicine.name}</p>
                {medicine.dosage && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{medicine.dosage}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-2 sm:ml-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDismiss(medicine.id)}
                className="touch-target"
                title="Skip this reminder"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Skip</span>
              </Button>
              <Button
                size="sm"
                onClick={() => handleTake(medicine)}
                className="touch-target"
              >
                Take
              </Button>
            </div>
          </div>
        ))}
        <div className="pt-2 text-xs text-center text-muted-foreground/70">
          {dueMedicines.length} {dueMedicines.length === 1 ? 'medication' : 'medications'} due for {getPeriodLabel(currentPeriod).toLowerCase()}
        </div>
      </CardContent>
    </Card>
  );
};
