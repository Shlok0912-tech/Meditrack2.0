import { Droplets, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlucoseReading } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";

interface GlucoseCardProps {
  readings: GlucoseReading[];
}

export const GlucoseCard = ({ readings }: GlucoseCardProps) => {
  const latestReading = readings[0];
  const previousReading = readings[1];
  
  const getTrend = () => {
    if (!latestReading || !previousReading) return null;
    const diff = latestReading.value - previousReading.value;
    return diff > 0 ? "up" : diff < 0 ? "down" : "stable";
  };
  
  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { label: "Low", variant: "destructive" as const };
    if (value > 140) return { label: "High", variant: "destructive" as const };
    return { label: "Normal", variant: "secondary" as const };
  };
  
  const trend = getTrend();
  const status = latestReading ? getGlucoseStatus(latestReading.value) : null;
  
  return (
    <Card className="etery-card animate-float-subtle">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          <span>Latest Reading</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {latestReading ? (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-medium tabular-nums animate-scale-in">
                {latestReading.value}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">mg/dL</span>
                {status && (
                  <Badge variant={status.variant} className={`text-xs ${status.variant === 'destructive' ? 'animate-pulse' : ''}`}>
                    {status.label}
                  </Badge>
                )}
              </div>
            </div>
            
            {trend && (
              <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-secondary/30 animate-slide-in-right">
                {trend === "up" && (
                  <>
                    <TrendingUp className="h-4 w-4 text-destructive animate-bounce-subtle" />
                    <span className="text-muted-foreground">
                      Increased from previous
                    </span>
                  </>
                )}
                {trend === "down" && (
                  <>
                    <TrendingDown className="h-4 w-4 animate-bounce-subtle" />
                    <span className="text-muted-foreground">
                      Decreased from previous
                    </span>
                  </>
                )}
                {trend === "stable" && (
                  <span className="text-muted-foreground">Stable from previous</span>
                )}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              {new Date(latestReading.timestamp).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No readings recorded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
