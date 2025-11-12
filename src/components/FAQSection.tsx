import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQSection = () => {
  const faqs = [
    {
      question: "Is my health data secure?",
      answer: "Absolutely. All your data is stored locally on your device using browser storage. Nothing is sent to any server, ensuring complete privacy and security of your health information."
    },
    {
      question: "Can I use Meditrack on multiple devices?",
      answer: "Meditrack stores data locally on each device. You can export your data as CSV from one device and import it on another to keep everything in sync."
    },
    {
      question: "How do low stock notifications work?",
      answer: "Meditrack automatically monitors your medicine stock levels. When a medicine falls below your set threshold (default 20%), you'll receive a browser notification if enabled."
    },
    {
      question: "Can I track multiple family members?",
      answer: "Currently, Meditrack is designed for individual use. However, you can use different browser profiles or devices for each family member to maintain separate records."
    },
    {
      question: "What happens if I clear my browser data?",
      answer: "Clearing browser data will remove your Meditrack records. We recommend regularly exporting your data as CSV backup to prevent data loss."
    },
    {
      question: "Does Meditrack work offline?",
      answer: "Yes! Meditrack works completely offline since all data is stored locally. You don't need an internet connection to use any features."
    }
  ];

  return (
    <section id="faq" className="etery-section">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about Meditrack and how to get the most out of it
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto animate-scale-in animate-delay-200">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="etery-card border-0 px-6 overflow-hidden"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                  <span className="mr-4">{String(index + 1).padStart(2, '0')}.</span>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pl-10 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
