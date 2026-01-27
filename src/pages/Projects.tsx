import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Plus,
  Building2,
  Users,
  Eye,
  Trash2,
  DollarSign,
  FolderOpen,
  Edit,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  projectStorage,
  orderStorage,
  itemStorage,
  initializeSampleData,
} from "@/lib/storage";
import { ProjectWithCalculations } from "@/types";

export default function Projects() {
  const [projects, setProjects] = useState<ProjectWithCalculations[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<ProjectWithCalculations | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    projectId: string;
    projectName: string;
  }>({
    isOpen: false,
    projectId: "",
    projectName: "",
  });
  const [newProject, setNewProject] = useState({ name: "", clientName: "" });
  const [editProject, setEditProject] = useState({ name: "", clientName: "" });
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      loadProjects();
    }
  }, [currentUser]);

  const loadProjects = async () => {
    if (!currentUser) return;
    try {
      const [allProjects, allOrders, allItems] = await Promise.all([
        projectStorage.getAll(currentUser.id),
        orderStorage.getAll(currentUser.id),
        itemStorage.getAll(currentUser.id),
      ]);

      const projectsWithCalculations: ProjectWithCalculations[] =
        allProjects.map((project) => {
          const projectOrders = allOrders.filter(
            (order) => order.projectId === project.id
          );
          const projectItems = allItems.filter((item) =>
            projectOrders.some((order) => order.id === item.orderId)
          );

          const totalBudget = projectItems.reduce(
            (sum, item) => sum + item.amount,
            0
          );

          return {
            ...project,
            totalBudget,
            ordersCount: projectOrders.length,
          };
        });

      setProjects(projectsWithCalculations);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    }
  };

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
      loadProjects();

      toast({
        title: "Success",
        description: "Project created successfully",
      });
    } catch (error: any) {
      console.error("Project creation failed:", error);
      toast({
        title: "Error",
        description: `Failed to create project: ${
          error?.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProject = (project: ProjectWithCalculations) => {
    setEditingProject(project);
    setEditProject({ name: project.name, clientName: project.clientName });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProject = async () => {
    if (
      !editingProject ||
      !editProject.name.trim() ||
      !editProject.clientName.trim()
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await projectStorage.update(editingProject.id, {
        name: editProject.name.trim(),
        clientName: editProject.clientName.trim(),
      });

      setEditProject({ name: "", clientName: "" });
      setIsEditDialogOpen(false);
      setEditingProject(null);
      loadProjects();

      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    setDeleteDialog({
      isOpen: true,
      projectId,
      projectName: project.name,
    });
  };

  const confirmDeleteProject = async () => {
    try {
      const success = await projectStorage.delete(deleteDialog.projectId);
      if (success) {
        loadProjects();
        toast({
          title: "Success",
          description: "Project deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete project",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your construction projects and track progress
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md glass-card">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new construction project to your system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="projectName"
                  placeholder="e.g., Shivam Enterprises Project"
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
                  placeholder="e.g., Shivam Enterprises"
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
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md glass-card">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update the project information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editProjectName">Project Name *</Label>
                <Input
                  id="editProjectName"
                  value={editProject.name}
                  onChange={(e) =>
                    setEditProject((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editClientName">Client Name *</Label>
                <Input
                  id="editClientName"
                  value={editProject.clientName}
                  onChange={(e) =>
                    setEditProject((prev) => ({
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
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProject}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? "Updating..." : "Update Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/25 bg-secondary/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-secondary mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              No Projects Yet
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
              Get started by creating your first construction project workspace.
            </p>
            <Button
              className="mt-6 shadow-lg shadow-primary/20"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in [animation-delay:100ms]">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/60 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleEditProject(project)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="pb-3 pt-6">
                <div className="flex items-start justify-between pr-8">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                      <Link to={`/projects/${project.id}/orders`}>
                        {project.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="flex items-center text-sm font-medium">
                      <Users className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      {project.clientName}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-secondary/40">
                    <span className="text-muted-foreground flex items-center">
                      <FolderOpen className="w-3.5 h-3.5 mr-2" />
                      Orders
                    </span>
                    <span className="font-semibold">{project.ordersCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-secondary/40">
                    <span className="text-muted-foreground flex items-center">
                      <DollarSign className="w-3.5 h-3.5 mr-2" />
                      Budget
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(project.totalBudget)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to={`/projects/${project.id}/orders`}>
                    <Button className="w-full bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-foreground border-0 transition-all">
                      View Details <Eye className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="text-xs text-muted-foreground text-center border-t border-border/40 pt-3">
                  Started on {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, isOpen: open }))
        }
        title="Delete Project"
        description={`Are you sure you want to delete the project "${deleteDialog.projectName}"? This will also delete all associated orders and items. This action cannot be undone.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        onConfirm={confirmDeleteProject}
        variant="destructive"
      />
    </div>
  );
}
