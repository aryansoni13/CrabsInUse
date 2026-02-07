import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  projectStorage,
  orderStorage,
  itemStorage,
  measurementStorage,
  initializeSampleData,
} from "@/lib/storage";
import { ProjectWithCalculations } from "@/types";
import DashboardStats, {
  StatData,
} from "@/components/dashboard/DashboardStats";
import RecentProjects, {
  ProjectWithProgress,
} from "@/components/dashboard/RecentProjects";
import QuickActions from "@/components/dashboard/QuickActions";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, LayoutDashboard } from "lucide-react";

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();
  const [stats, setStats] = useState<{
    activeProjects: StatData;
    totalOrders: StatData;
    pendingPayments: StatData;
    completedThisMonth: StatData;
  }>({
    activeProjects: { value: 0, trend: "0 this month", trendUp: true },
    totalOrders: { value: 0, trend: "0 this week", trendUp: true },
    pendingPayments: { value: "₹0", trend: "0 cleared", trendUp: true },
    completedThisMonth: { value: 0, trend: "0 from last month", trendUp: true },
  });

  // Create Project Dialog State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", clientName: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      const [allProjects, allOrders, allItems, allMeasurements] =
        await Promise.all([
          projectStorage.getAll(currentUser.id),
          orderStorage.getAll(currentUser.id),
          itemStorage.getAll(currentUser.id),
          measurementStorage.getAll(currentUser.id),
        ]);

      // --- Calculate Stats ---

      // 1. Active Projects
      const activeProjectsCount = allProjects.length;
      const projectsThisMonth = allProjects.filter((p) => {
        const date = new Date(p.createdAt);
        const now = new Date();
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }).length;

      // 2. Total Orders
      const totalOrdersCount = allOrders.length;
      const ordersThisWeek = allOrders.filter((o) => {
        const date = new Date(o.createdAt);
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= oneWeekAgo;
      }).length;

      // 3. Pending Payments (Value of Work Done)
      // Calculate value of all completed quantities in measurement rows
      let totalWorkDoneValue = 0;

      // Create a map of item unit rates for quick lookup
      const itemRates = new Map<string, number>();
      allItems.forEach((item) => itemRates.set(item.id, item.unitRate));

      allMeasurements.forEach((row) => {
        const rate = itemRates.get(row.itemId) || 0;
        // Sum up completed quantities from breakup status
        Object.entries(row.breakupStatus || {}).forEach(([key, status]) => {
          // Only include quantities that are NOT locked in any RA (Unbilled Amount)
          if (!status.lockedInRA) {
            // Extract percentage from key (format: itemId-percentage-name or percentage%-name)
            let percentage = 100;
            if (key.startsWith(`${row.itemId}-`)) {
              const parts = key.substring(row.itemId.length + 1).split("-");
              percentage = parseFloat(parts[0]) || 100;
            } else if (key.includes("%")) {
              percentage = parseFloat(key.split("%")[0]) || 100;
            } else {
              percentage = parseFloat(key.split("-")[0]) || 100;
            }

            // Use completedWeight if available, otherwise completedQty
            // Also remove strict 'done' check as we want to show value of any work recorded
            // This matches Abstract Sheet logic but weighted by percentage
            if (status.completedWeight && status.completedWeight > 0) {
              totalWorkDoneValue +=
                status.completedWeight * rate * (percentage / 100);
            } else if (status.completedQty && status.completedQty > 0) {
              // Fallback to qty if weight not available
              totalWorkDoneValue +=
                status.completedQty * rate * (percentage / 100);
            }
          }
        });
      });

      // 4. Completed This Month (Measurement Rows marked done)
      let completedRowsThisMonth = 0;
      const now = new Date();
      allMeasurements.forEach((row) => {
        Object.values(row.breakupStatus).forEach((status) => {
          if (status.done && status.date) {
            const date = new Date(status.date);
            if (
              date.getMonth() === now.getMonth() &&
              date.getFullYear() === now.getFullYear()
            ) {
              completedRowsThisMonth++;
            }
          }
        });
      });

      setStats({
        activeProjects: {
          value: activeProjectsCount,
          trend: `+${projectsThisMonth} this month`,
          trendUp: true,
        },
        totalOrders: {
          value: totalOrdersCount,
          trend: `+${ordersThisWeek} this week`,
          trendUp: true,
        },
        pendingPayments: {
          value: formatCurrency(totalWorkDoneValue),
          trend: "Based on work done",
          trendUp: true,
        },
        completedThisMonth: {
          value: completedRowsThisMonth,
          trend: "Items completed",
          trendUp: true,
        },
      });

      // --- Calculate Project Progress ---

      const projectsWithProgress: ProjectWithProgress[] = allProjects.map(
        (project) => {
          const projectOrders = allOrders.filter(
            (order) => order.projectId === project.id,
          );
          const projectItems = allItems.filter((item) =>
            projectOrders.some((order) => order.id === item.orderId),
          );

          const totalBudget = projectItems.reduce(
            (sum, item) => sum + item.amount,
            0,
          );

          // Calculate progress based on value of work done vs total budget
          let projectWorkDoneValue = 0;
          projectItems.forEach((item) => {
            const itemMeasurements = allMeasurements.filter(
              (m) => m.itemId === item.id,
            );
            itemMeasurements.forEach((row) => {
              Object.entries(row.breakupStatus || {}).forEach(
                ([key, status]) => {
                  // Determine executed quantity/weight to use for value calculation
                  // Matches Abstract Sheet logic: use weight if available
                  // Only include unlocked (unbilled) work
                  if (!status.lockedInRA) {
                    // Extract percentage from key
                    let percentage = 100;
                    if (key.startsWith(`${row.itemId}-`)) {
                      const parts = key
                        .substring(row.itemId.length + 1)
                        .split("-");
                      percentage = parseFloat(parts[0]) || 100;
                    } else if (key.includes("%")) {
                      percentage = parseFloat(key.split("%")[0]) || 100;
                    } else {
                      percentage = parseFloat(key.split("-")[0]) || 100;
                    }

                    if (status.completedWeight && status.completedWeight > 0) {
                      projectWorkDoneValue +=
                        status.completedWeight *
                        item.unitRate *
                        (percentage / 100);
                    } else if (status.completedQty && status.completedQty > 0) {
                      projectWorkDoneValue +=
                        status.completedQty *
                        item.unitRate *
                        (percentage / 100);
                    }
                  }
                },
              );
            });
          });

          const progress =
            totalBudget > 0 ? (projectWorkDoneValue / totalBudget) * 100 : 0;

          // Create search terms string
          const searchTerms = [
            project.name,
            project.clientName,
            ...projectOrders.map((o) => `${o.orderNumber} ${o.title}`),
          ]
            .join(" ")
            .toLowerCase();

          return {
            ...project,
            totalBudget,
            ordersCount: projectOrders.length,
            progress: Math.min(progress, 100), // Cap at 100%
            dueDate: "2024-12-31", // Still hardcoded as it's not in the data model
            searchTerms, // Add hidden field for searching
          };
        },
      );

      // Sort by creation date descending
      projectsWithProgress.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setProjects(projectsWithProgress);
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      toast({
        title: "Error",
        description: `Failed to load dashboard data: ${
          error?.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true;
    // We need to cast to any because searchTerms is not in the type definition yet
    // In a real app we'd update the type definition
    const terms = (project as any).searchTerms || "";
    return terms.includes(searchQuery.toLowerCase());
  });

  const handleCreateProject = async () => {
    if (!newProject.name.trim() || !newProject.clientName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!currentUser) return;
      await projectStorage.create({
        name: newProject.name.trim(),
        clientName: newProject.clientName.trim(),
        userId: currentUser.id,
      });

      setNewProject({ name: "", clientName: "" });
      setIsCreateDialogOpen(false);
      loadDashboardData();

      toast({
        title: "Success",
        description: "Project created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      // Crores
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      // Lakhs
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get recent projects (top 5)
  const recentProjects = filteredProjects.slice(0, 5);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-background min-h-[calc(100vh-4rem)]">
      {/* Welcome Section with animated gradient border bottom */}
      <div className="relative pb-8 border-b border-border/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm font-medium">Overview</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Track your projects, manage orders, and monitor your billing cycle
              efficiency.
            </p>
          </div>
          <Button
            className="shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 transition-all hover:scale-105"
            onClick={() => setIsCreateDialogOpen(true)}
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>
      </div>

      {/* Stats Grid - Now passing a prop to enable glassmorphism if supported by child */}
      <div className="animate-fade-in [animation-delay:100ms]">
        <DashboardStats
          activeProjects={stats.activeProjects}
          totalOrders={stats.totalOrders}
          pendingPayments={stats.pendingPayments}
          completedThisMonth={stats.completedThisMonth}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Recent Projects */}
        <div className="xl:col-span-2 space-y-6 animate-fade-in [animation-delay:200ms]">
          <h2 className="text-xl font-bold tracking-tight">Recent Projects</h2>
          <RecentProjects projects={recentProjects} />
        </div>

        {/* Right Column - Quick Actions */}
        <div className="xl:col-span-1 space-y-6 animate-fade-in [animation-delay:300ms]">
          <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
          <QuickActions onProjectCreated={loadDashboardData} />
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card border-white/20">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Project</DialogTitle>
            <DialogDescription>
              Launch a new project workspace. You can add orders and items
              later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="projectName"
                placeholder="e.g., Riverside Complex Phase 1"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject((prev) => ({ ...prev, name: e.target.value }))
                }
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">
                Client Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clientName"
                placeholder="e.g., Apex Constructions"
                value={newProject.clientName}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    clientName: e.target.value,
                  }))
                }
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
