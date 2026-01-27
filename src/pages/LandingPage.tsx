import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  FileText,
  Ruler,
  ShieldCheck,
  Zap,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20">
      {/* Navbar with Glassmorphism */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 transition-all duration-300">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-foreground group cursor-pointer">
            <div className="bg-gradient-to-tr from-primary to-violet-600 text-white p-1.5 rounded-lg shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              CRABS
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/login">
              <Button
                variant="ghost"
                className="text-base font-medium hover:bg-primary/5 hover:text-primary transition-colors"
              >
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full px-6 transition-all hover:scale-105 active:scale-95">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Dynamic Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
          {/* Animated Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float opacity-70" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-violet-500/10 rounded-full blur-[100px] -z-10" />

          <div className="container px-4 md:px-6 flex flex-col items-center text-center space-y-10">
            <div className="space-y-6 max-w-4xl relative animate-fade-in">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                The Future of Construction ERP
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-tight">
                Build smarter with <br />
                <span className="text-gradient">Intelligent Management</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-[800px] mx-auto leading-relaxed">
                Streamline projects, automate measurements, and master your
                billing cycle with the most advanced platform for modern
                contractors.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in [animation-delay:200ms]">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="h-14 px-10 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-r from-primary to-violet-600 border-0"
                >
                  Start Building Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 text-lg rounded-full border-2 hover:bg-secondary/50 backdrop-blur-sm transition-all duration-300"
                >
                  View Live Demo
                </Button>
              </Link>
            </div>

            {/* Dashboard Preview / Abstract Visual */}
            <div className="relative mt-16 mx-auto max-w-5xl w-full perspective-1000 animate-fade-in [animation-delay:400ms]">
              <div className="glass-card rounded-xl p-2 md:p-4 bg-white/40 dark:bg-black/40 border border-white/20 shadow-2xl transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out">
                <img
                  src="/details-dashboard.png"
                  alt="Dashboard Preview"
                  className="rounded-lg shadow-inner w-full h-auto opacity-90 hidden"
                  // Placeholder for actual image if available, using strict div structure for now
                />
                {/* Decorative placeholder since we can't generate image easily right now without extensive context */}
                <div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                  <div className="text-center z-10 transition-transform duration-500 group-hover:scale-105">
                    <BarChart3 className="w-24 h-24 text-primary/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                      Interactive Dashboard Preview
                    </p>
                  </div>
                  {/* Floating UI Elements */}
                  <div className="absolute top-10 left-10 p-4 glass-panel rounded-lg shadow-lg animate-float [animation-delay:1000ms]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Project Status
                        </p>
                        <p className="font-bold text-foreground">On Track</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-10 right-10 p-4 glass-panel rounded-lg shadow-lg animate-float [animation-delay:2000ms]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Efficiency
                        </p>
                        <p className="font-bold text-foreground">+124% Boost</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-32 bg-secondary/30 relative">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-20 max-w-3xl mx-auto space-y-4">
              <h2 className="text-4xl font-bold tracking-tight mb-4">
                Everything you need to{" "}
                <span className="text-gradient">scale up</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Powerful tools wrapped in a beautiful interface. Designed for
                speed, built for accuracy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Ruler className="h-8 w-8 text-white" />}
                title="Precise Measurements"
                description="Record detailed measurements with automated calculations for areas and weights."
                color="bg-blue-500"
              />
              <FeatureCard
                icon={<FileText className="h-8 w-8 text-white" />}
                title="Automated Billing"
                description="Generate professional RA bills instantly from your verified measurement sheets."
                color="bg-violet-500"
              />
              <FeatureCard
                icon={<BarChart3 className="h-8 w-8 text-white" />}
                title="Real-time Analytics"
                description="Track project progress, cash flow, and completion rates with live dashboards."
                color="bg-indigo-500"
              />
              <FeatureCard
                icon={<ShieldCheck className="h-8 w-8 text-white" />}
                title="Secure Data"
                description="Enterprise-grade isolation ensures your sensitive project data remains private."
                color="bg-emerald-500"
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-white" />}
                title="Lightning Fast"
                description="Built on modern tech for zero-latency performance across all your devices."
                color="bg-amber-500"
              />
              <FeatureCard
                icon={<Building2 className="h-8 w-8 text-white" />}
                title="Multi-Site Management"
                description="Seamlessly switch between multiple ongoing projects without losing context."
                color="bg-rose-500"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="container px-4 text-center">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

              <h2 className="text-3xl md:text-5xl font-bold mb-8 relative z-10">
                Ready to transform your workflow?
              </h2>
              <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto relative z-10">
                Join thousands of contractors who have switched to a smarter way
                of managing construction projects.
              </p>
              <Link to="/signup" className="relative z-10">
                <Button
                  size="lg"
                  className="h-16 px-12 text-lg font-semibold bg-white text-slate-900 hover:bg-slate-100 rounded-full"
                >
                  Get Started Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background pt-16 pb-8">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 font-bold text-xl text-primary mb-6">
                <Building2 className="h-6 w-6" />
                <span>CRABS</span>
              </div>
              <p className="text-muted-foreground max-w-xs">
                The complete ERP solution for modern construction management.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 CRABS Construction ERP. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary">
                Twitter
              </a>
              <a href="#" className="hover:text-primary">
                LinkedIn
              </a>
              <a href="#" className="hover:text-primary">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="group relative bg-card p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden">
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:opacity-20 transition-opacity`}
      ></div>

      <div
        className={`mb-6 ${color} w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>

      <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
