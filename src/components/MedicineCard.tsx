import { Edit, Trash2 } from "lucide-react";
import { Medicine } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MedicineCardProps {
  medicine: Medicine;
  onTake: (medicine: Medicine) => void;
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
  lowStockThreshold?: number;
}

export const MedicineCard = ({ medicine, onTake, onEdit, onDelete, lowStockThreshold }: MedicineCardProps) => {
  const stockPercentage = (medicine.currentStock / medicine.totalStock) * 100;
  const threshold = typeof lowStockThreshold === 'number' ? lowStockThreshold : 20;
  const isLowStock = stockPercentage < threshold;
  
  return (
    <Card className="etery-card group overflow-hidden hover:scale-105 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-medium truncate transition-colors duration-300">{medicine.name}</CardTitle>
            {medicine.dosage && (
              <CardDescription className="text-sm mt-1.5">{medicine.dosage}</CardDescription>
            )}
            {medicine.schedule && (
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs font-normal border-0">
                  {(
                    {
                      morning: 'Morning',
                      noon: 'Noon',
                      night: 'Night',
                      morning_noon: 'Morning & Noon',
                      morning_night: 'Morning & Night',
                      noon_night: 'Noon & Night',
                      three_times: '3x daily',
                    } as const
                  )[medicine.schedule]}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(medicine)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(medicine.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stock Level</span>
            <span className={`font-medium tabular-nums ${isLowStock ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              {medicine.currentStock} / {medicine.totalStock}
            </span>
          </div>
          <div className="relative h-1.5 bg-secondary/40 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out ${
                isLowStock ? 'bg-destructive animate-pulse-glow' : 'bg-foreground'
              }`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {medicine.notes && (
          <p className="text-sm text-muted-foreground/80 line-clamp-2">{medicine.notes}</p>
        )}
        
        <Button 
          className="w-full h-10 text-sm font-normal" 
          onClick={() => onTake(medicine)}
          disabled={medicine.currentStock === 0}
        >
          {medicine.currentStock === 0 ? 'Out of Stock' : 'Take Medicine'}
        </Button>
      </CardContent>
    </Card>
  );
};
