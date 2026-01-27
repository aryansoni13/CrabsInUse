import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { projectStorage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

export default function QuickActions({
  onProjectCreated,
}: {
  onProjectCreated: () => void;
}) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", clientName: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

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
      await projectStorage.create({
        name: newProject.name.trim(),
        clientName: newProject.clientName.trim(),
        userId: currentUser.id,
      });

      setNewProject({ name: "", clientName: "" });
      setIsCreateDialogOpen(false);
      onProjectCreated();

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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Frequently used functions for faster workflow
      </p>

      <div className="space-y-4">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <CardContent className="p-4 flex items-start space-x-4">
            <div className="p-3 rounded-lg bg-blue-900 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Add New Project</h3>
              <p className="text-sm text-muted-foreground">
                Start a new construction project
              </p>
            </div>
          </CardContent>
        </Card>

        <Link to="/">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-none shadow-sm mt-4">
            <CardContent className="p-4 flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-orange-500 text-white">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Create Order</h3>
                <p className="text-sm text-muted-foreground">
                  Add new order to any project
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new construction project to your system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g., Shivam Enterprises Project"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={isLoading}
              className="shadow-elegant"
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
