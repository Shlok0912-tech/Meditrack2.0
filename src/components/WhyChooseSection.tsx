import { Card, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface ComparisonRowProps {
  feature: string;
  traditional: boolean;
  meditrack: boolean;
}

const ComparisonRow = ({ feature, traditional, meditrack }: ComparisonRowProps) => (
  <div className="grid grid-cols-3 gap-4 py-4 border-b border-border/40 last:border-0">
    <div className="text-sm font-medium">{feature}</div>
    <div className="flex justify-center">
      {traditional ? (
        <Check className="h-5 w-5 text-muted-foreground" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/40" />
      )}
    </div>
    <div className="flex justify-center">
      <Check className="h-5 w-5 text-foreground" />
    </div>
  </div>
);

export const WhyChooseSection = () => {
  const comparisons = [
    { feature: "Digital medicine tracking", traditional: false, meditrack: true },
    { feature: "Automatic stock calculations", traditional: false, meditrack: true },
    { feature: "Glucose trend analysis", traditional: false, meditrack: true },
    { feature: "Smart low-stock alerts", traditional: false, meditrack: true },
    { feature: "Data backup & export", traditional: false, meditrack: true },
    { feature: "Visual reports & charts", traditional: false, meditrack: true },
    { feature: "No subscription required", traditional: true, meditrack: true },
    { feature: "Complete privacy control", traditional: true, meditrack: true }
  ];

  return (
    <section id="why-choose" className="etery-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">
            Why Choose Meditrack?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Skip the manual tracking, scattered notes, and missed doses — get reliable, 
            comprehensive health management exactly when you need it most.
          </p>
        </div>
        
        <Card className="etery-card max-w-4xl mx-auto animate-scale-in animate-delay-200">
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-3 gap-4 pb-4 mb-4 border-b-2 border-border">
              <div className="text-sm font-semibold">Feature</div>
              <div className="text-sm font-semibold text-center">Traditional Method</div>
              <div className="text-sm font-semibold text-center">Meditrack</div>
            </div>
            
            {comparisons.map((comparison, index) => (
              <ComparisonRow key={index} {...comparison} />
            ))}
          </CardContent>
        </Card>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="etery-card text-center animate-fade-in-up animate-delay-300">
            <CardContent className="p-6">
              <div className="text-4xl font-semibold mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Free Forever</div>
            </CardContent>
          </Card>
          
          <Card className="etery-card text-center animate-fade-in-up animate-delay-400">
            <CardContent className="p-6">
              <div className="text-4xl font-semibold mb-2">Local</div>
              <div className="text-sm text-muted-foreground">Data Storage</div>
            </CardContent>
          </Card>
          
          <Card className="etery-card text-center animate-fade-in-up animate-delay-500">
            <CardContent className="p-6">
              <div className="text-4xl font-semibold mb-2">0</div>
              <div className="text-sm text-muted-foreground">Ads or Tracking</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
