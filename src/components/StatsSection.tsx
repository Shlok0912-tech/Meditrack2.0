import { Card, CardContent } from "@/components/ui/card";
import { Activity, TrendingUp, Clock, Shield } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: string;
}

const StatCard = ({ icon, value, label, delay }: StatCardProps) => (
  <Card className="etery-card animate-fade-in-up" style={{ animationDelay: delay }}>
    <CardContent className="p-6">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="p-3 rounded-xl bg-foreground/5">
          {icon}
        </div>
        <div>
          <div className="text-4xl font-semibold mb-1">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface StatsSectionProps {
  totalMedicines: number;
  totalLogs: number;
  totalGlucoseReadings: number;
}

export const StatsSection = ({ totalMedicines, totalLogs, totalGlucoseReadings }: StatsSectionProps) => {
  return (
    <section className="etery-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">
            Your Health at a Glance
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Track your progress and maintain your health routine with comprehensive insights
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Activity className="h-6 w-6" />}
            value={totalMedicines.toString()}
            label="Active Medicines"
            delay="0.1s"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            value={totalLogs.toString()}
            label="Doses Recorded"
            delay="0.2s"
          />
          <StatCard
            icon={<Clock className="h-6 w-6" />}
            value={totalGlucoseReadings.toString()}
            label="Glucose Readings"
            delay="0.3s"
          />
          <StatCard
            icon={<Shield className="h-6 w-6" />}
            value="100%"
            label="Data Privacy"
            delay="0.4s"
          />
        </div>
      </div>
    </section>
  );
};
