import {
  Building2,
  ShoppingCart,
  Wallet,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatData {
  value: string | number;
  trend: string;
  trendUp: boolean;
}

interface DashboardStatsProps {
  activeProjects: StatData;
  totalOrders: StatData;
  pendingPayments: StatData;
  completedThisMonth: StatData;
}

export default function DashboardStats({
  activeProjects,
  totalOrders,
  pendingPayments,
  completedThisMonth,
}: DashboardStatsProps) {
  const stats = [
    {
      label: "Active Projects",
      ...activeProjects,
      icon: Building2,
      gradient: "from-blue-500/10 to-blue-600/5 hover:to-blue-600/10",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
      trendColor: "text-blue-600",
    },
    {
      label: "Total Orders",
      ...totalOrders,
      icon: ShoppingCart,
      gradient: "from-violet-500/10 to-violet-600/5 hover:to-violet-600/10",
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100",
      trendColor: "text-violet-600",
    },
    {
      label: "Work Done Value",
      ...pendingPayments,
      icon: Wallet,
      gradient: "from-emerald-500/10 to-emerald-600/5 hover:to-emerald-600/10",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
      trendColor: "text-emerald-600",
    },
    {
      label: "Items Completed",
      ...completedThisMonth,
      icon: Activity,
      gradient: "from-amber-500/10 to-amber-600/5 hover:to-amber-600/10",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
      trendColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group backdrop-blur-sm",
            "bg-gradient-to-br",
            stat.gradient
          )}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className={cn("inline-flex p-2.5 rounded-lg", stat.iconBg)}>
                <stat.icon className={cn("w-5 h-5", stat.iconColor)} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <h4 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {stat.value}
                </h4>
              </div>
            </div>

            {/* Trend Badge */}
            <div
              className={cn(
                "flex items-center text-xs font-medium px-2 py-1 rounded-full bg-white/50 border border-white/40 shadow-sm",
                stat.trendUp ? "text-green-600" : "text-red-600"
              )}
            >
              {stat.trendUp ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {stat.trend}
            </div>
          </div>

          {/* Decorative background circle */}
          <div
            className={cn(
              "absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 blur-2xl transition-all group-hover:scale-150",
              stat.iconBg
            )}
          />
        </div>
      ))}
    </div>
  );
}
