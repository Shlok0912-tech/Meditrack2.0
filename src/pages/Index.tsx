import { useState, useEffect } from "react";
import { storage, Medicine, MedicineLog, GlucoseReading, isLocalStorageAvailable } from "@/lib/storage";
import { exportMedicinesCsv, importMedicinesCsv } from "@/lib/backup";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ReportsPanel } from "@/components/ReportsPanel";
import { showNotification } from "@/lib/notification";
import { MedicineCard } from "@/components/MedicineCard";
import { AddMedicineDialog } from "@/components/AddMedicineDialog";
import { TakeMedicineDialog } from "@/components/TakeMedicineDialog";
import { GlucoseCard } from "@/components/GlucoseCard";
import { AddGlucoseDialog } from "@/components/AddGlucoseDialog";
import { HistoryTab } from "@/components/HistoryTab";
import { EnhancedBackground } from "@/components/EnhancedBackground";
import { QuickStats } from "@/components/QuickStats";
import { MedicationReminders } from "@/components/MedicationReminders";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { DrugInteractionChecker } from "@/components/DrugInteractionChecker";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { PredictiveAnalyticsPanel } from "@/components/PredictiveAnalyticsPanel";
import { AIHealthInsights } from "@/components/AIHealthInsights";
import { MedicineScanner } from "@/components/MedicineScanner";
import { HealthReportExporter } from "@/components/HealthReportExporter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DosageCalculator from "@/components/DosageCalculator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { LayoutDashboard, History, BarChart3, Calculator, AlertTriangle, Settings, Activity, Brain, Mic, TrendingUp, ShieldAlert, ScanLine, FileText } from "lucide-react";

const Index = () => {
  const isMobile = useIsMobile();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<MedicineLog[]>([]);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [takeMedicineOpen, setTakeMedicineOpen] = useState(false);
  const { toast } = useToast();
  const [lowStockThreshold, setLowStockThreshold] = useState(20);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [scheduleFilter, setScheduleFilter] = useState<"all" | NonNullable<Medicine["schedule"]>>("all");
  const [editMedicineForDialog, setEditMedicineForDialog] = useState<Medicine | null>(null);
  const [lowStockSearch, setLowStockSearch] = useState("");
  const [lowStockSort, setLowStockSort] = useState<"percent_desc" | "percent_asc" | "name">("percent_desc");
  const [refillForId, setRefillForId] = useState<string | null>(null);
  const [refillQuantity, setRefillQuantity] = useState<number>(0);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const primaryTabsTriggerClasses =
    "flex-shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:px-6 sm:py-2.5 sm:text-sm transition-all duration-300 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground tap-highlight-none touch-target";

  const deriveSchedule = (m: Medicine): Medicine["schedule"] | undefined => {
    if (m.schedule) return m.schedule;
    const text = `${m.dosage || ''} ${m.notes || ''}`.toLowerCase();
    const hasMorning = /\b(morning|breakfast|am)\b/.test(text);
    const hasNoon = /\b(noon|lunch|afternoon|midday)\b/.test(text);
    const hasNight = /\b(night|evening|dinner|bed\s*time|pm)\b/.test(text);
    if (/\b(thrice|3\s*times|three\s*times)\b/.test(text)) return 'three_times';
    if (/\b(twice|2\s*times|two\s*times|bid)\b/.test(text)) return 'morning_night';
    if (hasMorning && hasNoon && hasNight) return 'three_times';
    if (hasMorning && hasNoon) return 'morning_noon';
    if (hasMorning && hasNight) return 'morning_night';
    if (hasNoon && hasNight) return 'noon_night';
    if (hasMorning) return 'morning';
    if (hasNoon) return 'noon';
    if (hasNight) return 'night';
    return undefined;
  };

  const matchesScheduleFilter = (m: Medicine, filter: typeof scheduleFilter): boolean => {
    if (filter === 'all') return true;
    const s = m.schedule ?? deriveSchedule(m);
    if (!s) return false;
    if (filter === 'morning') return s === 'morning' || s === 'morning_noon' || s === 'morning_night' || s === 'three_times';
    if (filter === 'noon') return s === 'noon' || s === 'morning_noon' || s === 'noon_night' || s === 'three_times';
    if (filter === 'night') return s === 'night' || s === 'morning_night' || s === 'noon_night' || s === 'three_times';
    return true;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!isLocalStorageAvailable()) {
          toast({ title: 'Storage unavailable', description: 'Local Storage is disabled. Data will not persist.', variant: 'destructive' });
        }
        const [medicinesData, logsData, readingsData, settings] = await Promise.all([
          storage.getMedicines(),
          storage.getMedicineLogs(),
          storage.getGlucoseReadings(),
          storage.getUserSettings(),
        ]);
        setMedicines(medicinesData);
        setMedicineLogs(logsData);
        setGlucoseReadings(readingsData);
        setLowStockThreshold(settings.lowStockThresholdPercent ?? 20);
        setNotificationsEnabled(settings.notificationsEnabled ?? true);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: "Error", description: "Failed to load local data.", variant: "destructive" });
      }
    };
    
    loadData();
  }, []);

  // Notify on low stock (deduplicated using localStorage)
  useEffect(() => {
    const key = 'med_tracker_low_stock_notified_ids';
    const parseSet = (): Set<string> => {
      try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
    };
    const saveSet = (s: Set<string>) => localStorage.setItem(key, JSON.stringify(Array.from(s)));

    const notified = parseSet();
    const lowMeds = medicines.filter(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < lowStockThreshold);
    const lowIds = new Set(lowMeds.map(m => m.id));

    // Remove from notified if recovered
    const updatedNotified = new Set(Array.from(notified).filter(id => lowIds.has(id)));

    if (notificationsEnabled) {
      // Notify for new low-stock meds
      lowMeds.forEach(m => {
        if (!updatedNotified.has(m.id)) {
          showNotification('Low stock alert', `${m.name}: ${m.currentStock} remaining`);
          updatedNotified.add(m.id);
        }
      });
    }

    saveSet(updatedNotified);
  }, [medicines, lowStockThreshold, notificationsEnabled]);

  const handleAddMedicine = async (medicine: Omit<Medicine, 'id' | 'createdAt'>) => {
    try {
      await storage.addMedicine(medicine);
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      toast({
        title: "Medicine Added",
        description: `${medicine.name} has been added to your inventory.`,
      });
    } catch (error) {
      console.error('Error adding medicine:', error);
      toast({
        title: "Error",
        description: "Failed to add medicine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMedicine = async (id: string, updates: Partial<Medicine>) => {
    try {
      await storage.updateMedicine(id, updates);
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      toast({
        title: "Medicine Updated",
        description: "Medicine details have been updated.",
      });
    } catch (error) {
      console.error('Error updating medicine:', error);
      toast({
        title: "Error",
        description: "Failed to update medicine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    try {
      await storage.deleteMedicine(id);
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      toast({
        title: "Medicine Deleted",
        description: "Medicine has been removed from your inventory.",
      });
    } catch (error) {
      console.error('Error deleting medicine:', error);
      toast({
        title: "Error",
        description: "Failed to delete medicine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTakeMedicine = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setTakeMedicineOpen(true);
  };

  const handleTakeAllMedicines = async (medicines: Medicine[]) => {
    if (medicines.length === 0) return;

    try {
      // Record each medicine with default quantity (1)
      const updates = medicines.map(async (medicine) => {
        const quantity = 1; // Default quantity for batch take
        const prevPercent = medicine.totalStock > 0 ? (medicine.currentStock / medicine.totalStock) * 100 : 100;
        
        await storage.addMedicineLog({
          medicineId: medicine.id,
          medicineName: medicine.name,
          quantity,
          notes: 'Taken via Take All',
        });
        
        await storage.updateMedicine(medicine.id, {
          currentStock: medicine.currentStock - quantity,
        });

        return { medicine, prevPercent };
      });

      await Promise.all(updates);

      // Refresh data
      const [updatedMedicines, updatedLogs] = await Promise.all([
        storage.getMedicines(),
        storage.getMedicineLogs()
      ]);
      
      setMedicines(updatedMedicines);
      setMedicineLogs(updatedLogs);

      // Check for low stock notifications
      if (notificationsEnabled) {
        const results = await Promise.all(updates);
        results.forEach(({ medicine, prevPercent }) => {
          const updated = updatedMedicines.find(m => m.id === medicine.id);
          if (updated && updated.totalStock > 0) {
            const newPercent = (updated.currentStock / updated.totalStock) * 100;
            if (prevPercent >= lowStockThreshold && newPercent < lowStockThreshold) {
              showNotification('Low stock alert', `${updated.name}: ${updated.currentStock} remaining`);
            }
          }
        });
      }
      
      toast({
        title: "All Medicines Taken",
        description: `Recorded ${medicines.length} ${medicines.length === 1 ? 'medication' : 'medications'} at ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error('Error taking all medicines:', error);
      toast({
        title: "Error",
        description: "Failed to record all medicines. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmTakeMedicine = async (quantity: number, notes?: string) => {
    if (!selectedMedicine) return;
    
    try {
      const prevPercent = selectedMedicine.totalStock > 0 ? (selectedMedicine.currentStock / selectedMedicine.totalStock) * 100 : 100;
      await storage.addMedicineLog({
        medicineId: selectedMedicine.id,
        medicineName: selectedMedicine.name,
        quantity,
        notes,
      });
      
      await storage.updateMedicine(selectedMedicine.id, {
        currentStock: selectedMedicine.currentStock - quantity,
      });
      
      const [updatedMedicines, updatedLogs] = await Promise.all([
        storage.getMedicines(),
        storage.getMedicineLogs()
      ]);
      
      setMedicines(updatedMedicines);
      setMedicineLogs(updatedLogs);
      // After update, if crossing threshold, notify
      const updated = updatedMedicines.find(m => m.id === selectedMedicine.id);
      if (updated && updated.totalStock > 0) {
        const newPercent = (updated.currentStock / updated.totalStock) * 100;
        if (notificationsEnabled && prevPercent >= lowStockThreshold && newPercent < lowStockThreshold) {
          showNotification('Low stock alert', `${updated.name}: ${updated.currentStock} remaining`);
        }
      }
      
      toast({
        title: "Medicine Taken",
        description: `${quantity} ${selectedMedicine.name} recorded at ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error('Error taking medicine:', error);
      toast({
        title: "Error",
        description: "Failed to record medicine intake. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddGlucose = async (value: number, notes?: string) => {
    try {
      await storage.addGlucoseReading({ value, notes });
      const updatedReadings = await storage.getGlucoseReadings();
      setGlucoseReadings(updatedReadings);
      toast({
        title: "Glucose Recorded",
        description: `Reading of ${value} mg/dL has been saved.`,
      });
    } catch (error) {
      console.error('Error adding glucose reading:', error);
      toast({
        title: "Error",
        description: "Failed to record glucose reading. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGlucose = async (id: string) => {
    try {
      await storage.deleteGlucoseReading(id);
      const updatedReadings = await storage.getGlucoseReadings();
      setGlucoseReadings(updatedReadings);
      toast({
        title: "Reading Deleted",
        description: "Glucose reading has been removed.",
      });
    } catch (error) {
      console.error('Error deleting glucose reading:', error);
      toast({
        title: "Error",
        description: "Failed to delete glucose reading. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMedicineLog = async (id: string) => {
    try {
      await storage.deleteMedicineLog(id);
      const updatedLogs = await storage.getMedicineLogs();
      setMedicineLogs(updatedLogs);
      toast({ title: 'Entry Deleted', description: 'Medicine history entry removed.' });
    } catch (error) {
      console.error('Error deleting medicine log:', error);
      toast({ title: 'Error', description: 'Failed to delete entry. Please try again.', variant: 'destructive' });
    }
  };

  const handleRefill = async (medicine: Medicine, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    try {
      await storage.updateMedicine(medicine.id, { currentStock: medicine.currentStock + quantity, totalStock: Math.max(medicine.totalStock, medicine.currentStock + quantity) });
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      setRefillForId(null);
      setRefillQuantity(0);
      toast({ title: "Stock Refilled", description: `${medicine.name} increased by ${quantity}.` });
    } catch (error) {
      console.error('Error refilling medicine:', error);
      toast({ title: 'Error', description: 'Failed to refill stock.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-0 safe-area-bottom">
      {/* Enhanced Background with Silk Shader */}
      <EnhancedBackground />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 tap-highlight-none">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <div className="text-lg sm:text-xl font-semibold tracking-tight">
                Meditrack
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="py-6 sm:py-8 lg:py-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="dashboard" className="space-y-8 sm:space-y-10 lg:space-y-12">
            <div className="flex justify-center">
              <div className="overflow-x-auto scrollbar-hide touch-pan-x smooth-scroll">
                <TabsList
                  className={cn(
                    "liquid-glass inline-flex items-center rounded-full gap-1 animate-scale-in animate-glow mobile-optimized",
                    isMobile ? "justify-start px-2 py-1.5" : "justify-center p-1.5"
                  )}
                >
                  <TabsTrigger value="dashboard" className={primaryTabsTriggerClasses}>
                    <LayoutDashboard className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className={primaryTabsTriggerClasses}>
                    <History className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                  <TabsTrigger value="reports" className={primaryTabsTriggerClasses}>
                    <BarChart3 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Reports</span>
                  </TabsTrigger>
                  <TabsTrigger value="calculator" className={primaryTabsTriggerClasses}>
                    <Calculator className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Calculator</span>
                  </TabsTrigger>
                  <TabsTrigger value="low-stock" className={primaryTabsTriggerClasses}>
                    <AlertTriangle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Low Stock</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-insights" className={primaryTabsTriggerClasses}>
                    <Brain className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">AI Insights</span>
                  </TabsTrigger>
                  <TabsTrigger value="predictions" className={primaryTabsTriggerClasses}>
                    <TrendingUp className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Predictions</span>
                  </TabsTrigger>
                  <TabsTrigger value="interactions" className={primaryTabsTriggerClasses}>
                    <ShieldAlert className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Interactions</span>
                  </TabsTrigger>
                  <TabsTrigger value="voice" className={primaryTabsTriggerClasses}>
                    <Mic className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Voice</span>
                  </TabsTrigger>
                  <TabsTrigger value="scanner" className={primaryTabsTriggerClasses}>
                    <ScanLine className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Scanner</span>
                  </TabsTrigger>
                  <TabsTrigger value="export" className={primaryTabsTriggerClasses}>
                    <FileText className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Export</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className={primaryTabsTriggerClasses}>
                    <Settings className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="dashboard" className="space-y-8 sm:space-y-12 lg:space-y-16">
              {/* Quick Stats Section */}
              <div className="space-y-6 sm:space-y-8">
                <div className="text-center space-y-2 animate-fade-in-up">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium">Dashboard Overview</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">Your health metrics at a glance</p>
                </div>
                <QuickStats 
                  medicines={medicines}
                  medicineLogs={medicineLogs}
                  glucoseReadings={glucoseReadings}
                  lowStockThreshold={lowStockThreshold}
                />
              </div>

              {/* Medication Reminders */}
              <div className="max-w-3xl mx-auto animate-fade-in-up animate-delay-300">
                <MedicationReminders 
                  medicines={medicines}
                  onTakeMedicine={handleTakeMedicine}
                  onTakeAll={handleTakeAllMedicines}
                />
              </div>

              {/* Glucose Section */}
              <div className="space-y-6 sm:space-y-8">
                <div className="text-center space-y-2 animate-fade-in-up">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium">Glucose Monitor</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">Track your blood glucose levels</p>
                </div>
                <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
                  <div className="animate-fade-in-up animate-delay-100">
                    <GlucoseCard readings={glucoseReadings} />
                  </div>
                  <div className="flex items-center justify-center animate-fade-in-up animate-delay-200">
                    <AddGlucoseDialog onAdd={handleAddGlucose} />
                  </div>
                </div>
              </div>

              {/* Medicine Section */}
              <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium mb-2">Medicine Inventory</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">Manage your medications</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto animate-slide-in-left animate-delay-200">
                    <AddMedicineDialog 
                      onAdd={handleAddMedicine} 
                      editMedicine={editMedicineForDialog || undefined}
                      onUpdate={handleUpdateMedicine}
                      onClose={() => setEditMedicineForDialog(null)}
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                      try {
                        exportMedicinesCsv();
                        toast({
                          title: "Export Successful",
                          description: "Medicines exported to CSV file",
                        });
                      } catch (error) {
                        console.error('Export error:', error);
                        toast({
                          title: "Export Failed",
                          description: "Failed to export medicines",
                          variant: "destructive",
                        });
                      }
                    }} className="hover:animate-glow touch-target">
                      Export
                    </Button>
                    <input id="import-medicines" type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      try {
                        const count = await importMedicinesCsv(file);
                        const [updatedMedicines, updatedLogs] = await Promise.all([
                          storage.getMedicines(),
                          storage.getMedicineLogs()
                        ]);
                        setMedicines(updatedMedicines);
                        setMedicineLogs(updatedLogs);
                        toast({
                          title: "Import Successful",
                          description: `Imported ${count} medicines from CSV`,
                        });
                        e.currentTarget.value = ''; // Reset input
                      } catch (error) {
                        console.error('Import error:', error);
                        toast({
                          title: "Import Failed",
                          description: "Failed to import medicines. Please check CSV format.",
                          variant: "destructive",
                        });
                      }
                    }} />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('import-medicines')?.click()} className="hover:animate-glow touch-target">
                      Import
                    </Button>
                  </div>
                </div>

                {/* Advanced Search */}
                <div className="animate-fade-in-up animate-delay-100">
                  <AdvancedSearch 
                    medicines={medicines}
                    onFilteredResults={setFilteredMedicines}
                    lowStockThreshold={lowStockThreshold}
                  />
                </div>

                {medicines.length === 0 ? (
                  <div className="text-center py-12 sm:py-20 animate-scale-in">
                    <div className="etery-card rounded-2xl p-8 sm:p-12 inline-block max-w-md animate-glow">
                      <p className="text-sm sm:text-base text-muted-foreground">No medicines yet. Add your first medicine to get started.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {(filteredMedicines.length > 0 ? filteredMedicines : medicines)
                      .map((medicine, index) => (
                      <div 
                        key={medicine.id} 
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <MedicineCard
                          medicine={medicine}
                          lowStockThreshold={lowStockThreshold}
                          onTake={handleTakeMedicine}
                          onEdit={(med) => {
                            setEditMedicineForDialog(med);
                          }}
                          onDelete={handleDeleteMedicine}
                          medicineLogs={medicineLogs}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

          <TabsContent value="history">
            <HistoryTab
              medicineLogs={medicineLogs}
              glucoseReadings={glucoseReadings}
              onDeleteGlucose={handleDeleteGlucose}
              onDeleteMedicineLog={handleDeleteMedicineLog}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsPanel glucoseReadings={glucoseReadings} />
          </TabsContent>

          <TabsContent value="calculator">
            <DosageCalculator medicines={medicines} />
          </TabsContent>

          <TabsContent value="low-stock" className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium mb-2">Low Stock</h2>
                <p className="text-muted-foreground">Monitor medicines running low</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Input
                  placeholder="Search..."
                  value={lowStockSearch}
                  onChange={(e) => setLowStockSearch(e.target.value)}
                  className="max-w-xs etery-card"
                />
                <Select value={lowStockSort} onValueChange={(v) => setLowStockSort(v as any)}>
                  <SelectTrigger className="w-[160px] etery-card"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent_desc">Lowest first</SelectItem>
                    <SelectItem value="percent_asc">Highest first</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(() => {
              const filtered = medicines
                .filter(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < lowStockThreshold)
                .filter(m => m.name.toLowerCase().includes(lowStockSearch.toLowerCase().trim()));

              const sorted = filtered.slice().sort((a, b) => {
                const pa = (a.currentStock / a.totalStock) * 100;
                const pb = (b.currentStock / b.totalStock) * 100;
                if (lowStockSort === 'percent_desc') return pa - pb;
                if (lowStockSort === 'percent_asc') return pb - pa;
                return a.name.localeCompare(b.name);
              });

              if (!sorted.length) {
                return (
                  <div className="text-center py-20">
                    <div className="etery-card rounded-2xl p-12 inline-block max-w-md">
                      <p className="text-muted-foreground">No low stock medicines found.</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {sorted.map(m => {
                    const pct = Math.max(0, Math.round((m.currentStock / m.totalStock) * 100));
                    const critical = pct < Math.max(5, Math.floor(lowStockThreshold / 2));
                    return (
                      <div key={m.id} className="etery-card rounded-2xl p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-base">{m.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{m.currentStock} of {m.totalStock} remaining</div>
                          </div>
                          <Badge variant={critical ? "destructive" : "secondary"} className="text-xs">
                            {pct}%
                          </Badge>
                        </div>

                        <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${critical ? 'bg-destructive' : 'bg-foreground'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => handleTakeMedicine(m)}>Take</Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => { setRefillForId(m.id); setRefillQuantity(0); }}>Refill</Button>
                        </div>

                        {refillForId === m.id && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                            <Input
                              type="number"
                              min={1}
                              placeholder="Quantity"
                              value={refillQuantity || ''}
                              onChange={(e) => setRefillQuantity(parseInt(e.target.value || '0') || 0)}
                              className="h-9 etery-card"
                            />
                            <Button size="sm" onClick={() => handleRefill(m, refillQuantity)} disabled={!refillQuantity || refillQuantity <= 0}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setRefillForId(null); setRefillQuantity(0); }}>Cancel</Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            <div className="text-center space-y-2 animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-medium">AI Health Insights</h2>
              <p className="text-muted-foreground">Personalized health recommendations powered by AI</p>
            </div>
            <AIHealthInsights 
              medicines={medicines}
              medicineLogs={medicineLogs}
              glucoseReadings={glucoseReadings}
            />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <div className="text-center space-y-2 animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-medium">Predictive Analytics</h2>
              <p className="text-muted-foreground">AI-powered predictions for medicine consumption</p>
            </div>
            <PredictiveAnalyticsPanel 
              medicines={medicines}
              medicineLogs={medicineLogs}
            />
          </TabsContent>

          <TabsContent value="interactions" className="space-y-6">
            <div className="text-center space-y-2 animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-medium">Drug Interaction Checker</h2>
              <p className="text-muted-foreground">AI analysis of potential medicine interactions</p>
            </div>
            <DrugInteractionChecker medicines={medicines} />
          </TabsContent>

          <TabsContent value="voice" className="space-y-6">
            <div className="text-center space-y-2 animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-medium">Voice Assistant</h2>
              <p className="text-muted-foreground">Control MediTrack with voice commands</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <VoiceAssistant 
                medicines={medicines}
                onTakeMedicine={async (medicineName, quantity) => {
                  const medicine = medicines.find(m => m.name === medicineName);
                  if (medicine) {
                    try {
                      const prevPercent = medicine.totalStock > 0 ? (medicine.currentStock / medicine.totalStock) * 100 : 100;
                      await storage.addMedicineLog({
                        medicineId: medicine.id,
                        medicineName: medicine.name,
                        quantity,
                        notes: 'Taken via Voice Command',
                      });
                      
                      await storage.updateMedicine(medicine.id, {
                        currentStock: medicine.currentStock - quantity,
                      });
                      
                      const [updatedMedicines, updatedLogs] = await Promise.all([
                        storage.getMedicines(),
                        storage.getMedicineLogs()
                      ]);
                      
                      setMedicines(updatedMedicines);
                      setMedicineLogs(updatedLogs);
                      
                      const updated = updatedMedicines.find(m => m.id === medicine.id);
                      if (updated && updated.totalStock > 0) {
                        const newPercent = (updated.currentStock / updated.totalStock) * 100;
                        if (notificationsEnabled && prevPercent >= lowStockThreshold && newPercent < lowStockThreshold) {
                          showNotification('Low stock alert', `${updated.name}: ${updated.currentStock} remaining`);
                        }
                      }
                      
                      toast({
                        title: "Medicine Taken",
                        description: `${quantity} ${medicine.name} recorded via voice command`,
                      });
                    } catch (error) {
                      console.error('Error taking medicine:', error);
                      toast({
                        title: "Error",
                        description: "Failed to record medicine intake.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                onAddGlucose={handleAddGlucose}
              />
            </div>
          </TabsContent>

          <TabsContent value="scanner" className="space-y-6">
            <div className="text-center space-y-2 animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-medium">Medicine Scanner</h2>
              <p className="text-muted-foreground">Scan medicine labels to extract information</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <MedicineScanner 
                onMedicineExtracted={async (data) => {
                  // Auto-populate add medicine dialog with scanned data
                  try {
                    await handleAddMedicine({
                      name: data.name,
                      totalStock: 0,
                      currentStock: 0,
                      dosage: data.dosage || '',
                      notes: data.notes
                    });
                    
                    toast({
                      title: "Medicine Scanned",
                      description: `${data.name} has been added. Please update stock levels.`,
                    });
                  } catch (error) {
                    console.error('Error adding scanned medicine:', error);
                  }
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <div className="text-center space-y-2 animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl font-medium">Health Reports</h2>
              <p className="text-muted-foreground">Generate comprehensive reports for healthcare providers</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <HealthReportExporter 
                medicines={medicines}
                medicineLogs={medicineLogs}
                glucoseReadings={glucoseReadings}
              />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel onSaved={(s) => setLowStockThreshold(s.lowStockThresholdPercent)} />
          </TabsContent>
        </Tabs>
        </div>
      </section>

      <TakeMedicineDialog
        medicine={selectedMedicine}
        open={takeMedicineOpen}
        onOpenChange={setTakeMedicineOpen}
        onConfirm={handleConfirmTakeMedicine}
      />
    </div>
  );
};

export default Index;
