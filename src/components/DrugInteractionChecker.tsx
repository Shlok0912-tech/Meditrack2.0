import { useState, useEffect } from 'react';
import { Medicine } from '@/lib/storage';
import { findInteractions, DrugInteraction, getSeverityColor, getSeverityVariant } from '@/lib/drugInteractions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ShieldAlert, Info, AlertCircle } from 'lucide-react';

interface DrugInteractionCheckerProps {
  medicines: Medicine[];
}

export function DrugInteractionChecker({ medicines }: DrugInteractionCheckerProps) {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [stats, setStats] = useState({ severe: 0, moderate: 0, mild: 0 });

  useEffect(() => {
    const medicineNames = medicines.map(m => m.name);
    const foundInteractions = findInteractions(medicineNames);
    setInteractions(foundInteractions);

    // Calculate stats
    const severe = foundInteractions.filter(i => i.severity === 'severe').length;
    const moderate = foundInteractions.filter(i => i.severity === 'moderate').length;
    const mild = foundInteractions.filter(i => i.severity === 'mild').length;
    setStats({ severe, moderate, mild });
  }, [medicines]);

  const getSeverityIcon = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'severe':
        return <ShieldAlert className="h-5 w-5 text-red-600" />;
      case 'moderate':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'mild':
        return <Info className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              AI Drug Interaction Checker
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Analyzing {medicines.length} medicines for potential interactions
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {stats.severe > 0 && (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {stats.severe} Severe
              </Badge>
            )}
            {stats.moderate > 0 && (
              <Badge variant="default" className="gap-1 bg-orange-600 text-xs">
                {stats.moderate} Moderate
              </Badge>
            )}
            {stats.mild > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {stats.mild} Mild
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {interactions.length === 0 ? (
          <Alert className="bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800">
            <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-900 dark:text-green-100 text-sm sm:text-base">No Interactions Detected</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300 text-xs sm:text-sm">
              No known interactions found between your current medicines. However, always consult
              your healthcare provider before combining medications.
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
            <div className="space-y-3 sm:space-y-4">
              {interactions.map((interaction, index) => (
                <div key={index}>
                  <Alert
                    variant={interaction.severity === 'severe' ? 'destructive' : 'default'}
                    className="relative"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      {getSeverityIcon(interaction.severity)}
                      <div className="flex-1 min-w-0">
                        <AlertTitle className="flex flex-wrap items-center gap-2 mb-2 text-sm sm:text-base">
                          <span className="font-semibold text-foreground">{interaction.drug1}</span>
                          <span className="text-muted-foreground">+</span>
                          <span className="font-semibold text-foreground">{interaction.drug2}</span>
                          <Badge variant={getSeverityVariant(interaction.severity)} className="ml-auto text-xs">
                            {interaction.severity.toUpperCase()}
                          </Badge>
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p className="text-xs sm:text-sm text-foreground">
                            <strong className="font-semibold">Risk:</strong> {interaction.description}
                          </p>
                          <p className="text-xs sm:text-sm text-foreground">
                            <strong className="font-semibold">Recommendation:</strong> {interaction.recommendation}
                          </p>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                  {index < interactions.length - 1 && <Separator className="my-3 sm:my-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <Separator className="my-3 sm:my-4" />
        
        <div className="text-[10px] sm:text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-2">
            <Info className="h-3 w-3 shrink-0" />
            <span>This checker uses AI-powered algorithms and a comprehensive drug interaction database.</span>
          </p>
          <p className="font-semibold text-foreground">
            ⚠️ Always consult your healthcare provider or pharmacist before making any changes to your medications.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
