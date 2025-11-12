import { Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border/40 py-12 mt-20">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-medium tracking-tight">Meditrack</h3>
            <p className="text-sm text-muted-foreground">
              Your personal health companion for medicine and glucose tracking.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Features</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">Medicine Tracking</a></li>
              <li><a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">Glucose Monitor</a></li>
              <li><a href="#dashboard" className="text-foreground/80 hover:text-foreground transition-colors">Reports & Analytics</a></li>
              <li><a href="#dashboard" className="text-foreground/80 hover:text-foreground transition-colors">Dosage Calculator</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#dashboard" className="text-foreground/80 hover:text-foreground transition-colors">User Guide</a></li>
              <li><a href="#faq" className="text-foreground/80 hover:text-foreground transition-colors">FAQs</a></li>
              <li><a href="#home" className="text-foreground/80 hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#home" className="text-foreground/80 hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* About */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#home" className="text-foreground/80 hover:text-foreground transition-colors">About Meditrack</a></li>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-foreground transition-colors">Open Source</a></li>
              <li><a href="#home" className="text-foreground/80 hover:text-foreground transition-colors">Contact</a></li>
              <li><a href="#faq" className="text-foreground/80 hover:text-foreground transition-colors">Support</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} Meditrack.</span>
            <span className="hidden sm:inline">All rights reserved.</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 fill-red-500 text-red-500 animate-pulse" />
            <span>for better health</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
