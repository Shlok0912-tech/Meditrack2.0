import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  onGetStarted: () => void;
}

export const CTASection = ({ onGetStarted }: CTASectionProps) => {
  return (
    <section className="etery-section">
      <div className="container mx-auto px-4">
        <div className="etery-card max-w-4xl mx-auto p-12 md:p-16 text-center animate-scale-in">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-foreground/5 text-xs uppercase tracking-wider mb-2">
              Get Started Today
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Take Control of Your Health
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start tracking your medicines and glucose levels today. No signup required, 
              completely free, and your data stays private on your device.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="group"
                onClick={onGetStarted}
              >
                Start Tracking Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
