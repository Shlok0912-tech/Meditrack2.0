import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Droplets, LineChart, Bell, Download, Calculator } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}

const FeatureCard = ({ icon, title, description, delay }: FeatureCardProps) => (
  <Card className="etery-card animate-fade-in-up group hover:scale-105 transition-transform duration-300" style={{ animationDelay: delay }}>
    <CardHeader>
      <div className="mb-4 p-3 rounded-xl bg-foreground/5 w-fit group-hover:bg-foreground/10 transition-colors duration-300">
        {icon}
      </div>
      <CardTitle className="text-xl font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </CardContent>
  </Card>
);

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Pill className="h-6 w-6" />,
      title: "Medicine Tracking",
      description: "Manage your medication inventory with smart stock alerts and refill reminders.",
      delay: "0.1s"
    },
    {
      icon: <Droplets className="h-6 w-6" />,
      title: "Glucose Monitoring",
      description: "Log and track blood glucose levels with trend analysis and historical data.",
      delay: "0.2s"
    },
    {
      icon: <LineChart className="h-6 w-6" />,
      title: "Reports & Analytics",
      description: "Visualize your health data with comprehensive charts and insights.",
      delay: "0.3s"
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: "Smart Notifications",
      description: "Get timely reminders for low stock and medication schedules.",
      delay: "0.4s"
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Data Export",
      description: "Export your health records to CSV for backup or sharing with healthcare providers.",
      delay: "0.5s"
    },
    {
      icon: <Calculator className="h-6 w-6" />,
      title: "Dosage Calculator",
      description: "Calculate precise dosages based on weight and medical guidelines.",
      delay: "0.6s"
    }
  ];

  return (
    <section id="features" className="etery-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">
            Powerful Features
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage your health in one simple, elegant platform
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
