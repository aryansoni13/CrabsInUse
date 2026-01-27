import { ArrowRight, Zap, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PricingCard from "@/components/PricingCard";

const Index = () => {
  const plans = [
    {
      name: "Starter",
      price: "$9",
      period: "month",
      description: "Perfect for freelancers and small projects",
      features: [
        "Up to 50 invoices/month",
        "Basic analytics",
        "Email support",
        "1 team member",
      ],
    },
    {
      name: "Professional",
      price: "$29",
      period: "month",
      description: "For growing businesses that need more",
      features: [
        "Unlimited invoices",
        "Advanced analytics",
        "Priority support",
        "5 team members",
        "Custom branding",
        "API access",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$79",
      period: "month",
      description: "For large teams with complex needs",
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Dedicated manager",
        "Custom integrations",
        "SLA guarantee",
      ],
    },
  ];

  const features = [
    {
      icon: Zap,
      title: "Instant Invoicing",
      description: "Create and send professional invoices in seconds",
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Bank-grade encryption for all transactions",
    },
    {
      icon: Clock,
      title: "Auto Reminders",
      description: "Never chase payments again with smart reminders",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(187_92%_45%/0.1),transparent_50%)]" />
        <div className="container mx-auto px-6 py-24 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 
              className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-6 opacity-0 animate-fade-up"
            >
              Billing made{" "}
              <span className="text-gradient">simple</span>
            </h1>
            <p 
              className="text-lg md:text-xl text-primary-foreground/70 mb-10 opacity-0 animate-fade-up"
              style={{ animationDelay: "100ms" }}
            >
              Streamline your invoicing, get paid faster, and focus on what matters most — growing your business.
            </p>
            <div 
              className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              <Button variant="accent" size="lg">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="hero" size="lg">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="text-center p-6 opacity-0 animate-fade-up"
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 text-accent mb-4">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 
              className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 opacity-0 animate-fade-up"
              style={{ animationDelay: "400ms" }}
            >
              Simple, transparent pricing
            </h2>
            <p 
              className="text-muted-foreground max-w-md mx-auto opacity-0 animate-fade-up"
              style={{ animationDelay: "500ms" }}
            >
              Choose the plan that fits your needs. No hidden fees, cancel anytime.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {plans.map((plan, index) => (
              <PricingCard
                key={plan.name}
                {...plan}
                delay={600 + index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 BillFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
