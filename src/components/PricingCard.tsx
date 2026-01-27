import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  delay?: number;
}

const PricingCard = ({
  name,
  price,
  period,
  description,
  features,
  popular = false,
  delay = 0,
}: PricingCardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-8 transition-all duration-500 opacity-0 animate-fade-up",
        popular
          ? "bg-hero text-primary-foreground shadow-glow scale-105"
          : "bg-card shadow-card hover:shadow-card-hover"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-gradient text-accent-foreground text-xs font-bold px-4 py-1 rounded-full">
          Most Popular
        </span>
      )}
      
      <h3 className={cn(
        "text-xl font-bold mb-2",
        popular ? "text-primary-foreground" : "text-foreground"
      )}>
        {name}
      </h3>
      
      <p className={cn(
        "text-sm mb-6",
        popular ? "text-primary-foreground/70" : "text-muted-foreground"
      )}>
        {description}
      </p>
      
      <div className="mb-6">
        <span className={cn(
          "text-4xl font-extrabold",
          popular ? "text-primary-foreground" : "text-foreground"
        )}>
          {price}
        </span>
        <span className={cn(
          "text-sm ml-1",
          popular ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          /{period}
        </span>
      </div>
      
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <Check className={cn(
              "w-5 h-5 flex-shrink-0",
              popular ? "text-accent" : "text-accent"
            )} />
            <span className={cn(
              "text-sm",
              popular ? "text-primary-foreground/90" : "text-foreground"
            )}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      
      <Button
        variant={popular ? "accent" : "outline"}
        className="w-full"
        size="lg"
      >
        Get Started
      </Button>
    </div>
  );
};

export default PricingCard;
