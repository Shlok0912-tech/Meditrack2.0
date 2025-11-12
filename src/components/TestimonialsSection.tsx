import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface TestimonialProps {
  name: string;
  role: string;
  content: string;
  rating: number;
  delay: string;
}

const TestimonialCard = ({ name, role, content, rating, delay }: TestimonialProps) => (
  <Card className="etery-card animate-fade-in-up h-full" style={{ animationDelay: delay }}>
    <CardContent className="p-6 flex flex-col h-full">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-foreground text-foreground" />
        ))}
      </div>
      <p className="text-muted-foreground mb-6 flex-grow leading-relaxed">
        "{content}"
      </p>
      <div className="border-t border-border/40 pt-4">
        <div className="font-medium">{name}</div>
        <div className="text-sm text-muted-foreground">{role}</div>
      </div>
    </CardContent>
  </Card>
);

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Diabetes Patient",
      content: "Meditrack has transformed how I manage my medications. The glucose tracking and medicine reminders are incredibly helpful. I feel more in control of my health.",
      rating: 5,
      delay: "0.1s"
    },
    {
      name: "Michael Chen",
      role: "Elderly Care Provider",
      content: "Managing my father's medications used to be stressful. Meditrack's stock alerts and dosage calculator make everything so much easier. Highly recommended!",
      rating: 5,
      delay: "0.2s"
    },
    {
      name: "Emily Rodriguez",
      role: "Healthcare Professional",
      content: "I recommend Meditrack to all my patients who need medication tracking. It's simple, private, and doesn't require any complicated setup. Perfect for everyday use.",
      rating: 5,
      delay: "0.3s"
    }
  ];

  return (
    <section id="testimonials" className="etery-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">
            Trusted by Thousands
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See what users are saying about their experience with Meditrack
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-60">
          <div className="text-sm font-medium">TRUSTED BY</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold">1000+</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold">50K+</div>
            <div className="text-sm text-muted-foreground">Doses Tracked</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-semibold">4.9</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
};
