import { Link } from "react-router-dom";
import { ArrowRight, Building2, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectWithCalculations } from "@/types";

export interface ProjectWithProgress extends ProjectWithCalculations {
  progress: number;
  dueDate?: string;
  displayId?: string;
}

interface RecentProjectsProps {
  projects: ProjectWithProgress[];
}

export default function RecentProjects({ projects }: RecentProjectsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="border-dashed bg-secondary/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-secondary rounded-full mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">
                No Projects running
              </h3>
              <p className="text-muted-foreground text-sm text-center max-w-xs">
                Start by creating a new project from the quick actions menu.
              </p>
            </CardContent>
          </Card>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="group relative bg-card/60 hover:bg-card border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/projects/${project.id}/orders`}
                        className="hover:underline"
                      >
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                      </Link>
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                      >
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center">
                      <Building2 className="w-3 h-3 mr-1" />
                      {project.clientName}
                    </p>
                  </div>
                  <Link to={`/projects/${project.id}/orders`}>
                    <div className="p-2 rounded-full bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                  <div className="bg-secondary/40 p-2.5 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Project Value
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(project.totalBudget)}
                    </p>
                  </div>
                  <div className="bg-secondary/40 p-2.5 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Orders</p>
                    <div className="flex items-center text-sm font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                      {project.ordersCount || 0} Orders
                    </div>
                  </div>
                  <div className="bg-secondary/40 p-2.5 rounded-lg hidden lg:block">
                    <p className="text-xs text-muted-foreground mb-1">
                      Timeline
                    </p>
                    <div className="flex items-center text-sm font-medium">
                      <Clock className="w-3 h-3 mr-1.5 text-orange-500" />
                      On Track
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="text-primary">
                      {Math.round(project.progress)}%
                    </span>
                  </div>
                  <Progress
                    value={project.progress}
                    className="h-1.5 bg-secondary"
                    // Note: The indicator color is handled by the Shadcn component or global CSS variable for primary
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
