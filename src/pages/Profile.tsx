import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Loader2,
  Trash2,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { clearUserData, userStorage } from "@/lib/storage";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";


export default function Profile() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(
    currentUser?.user_metadata?.display_name || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleUpdateProfile = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      await userStorage.update(currentUser.id, {
        displayName,
      });

      // Update local auth user metadata to reflect changes in UI
      const updatedUser = {
        ...currentUser,
        user_metadata: {
          ...currentUser.user_metadata,
          display_name: displayName,
        },
      };
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      
      toast({
        title: "Success",
        description: "Profile updated successfully (Local)",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleDeleteAllData = async () => {
    if (!currentUser) return;

    try {
      await clearUserData(currentUser.id);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Data Cleared",
        description:
          "All your data has been permanently deleted from the database.",
      });
      // Force reload to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete user data:", error);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Error",
        description: "Failed to delete your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const userEmail = currentUser?.email || "";
  const userDisplayName = currentUser?.user_metadata?.display_name || "User";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Card - Left Column */}
        <Card className="md:col-span-1 shadow-lg bg-card/80 backdrop-blur-sm border-border/60 animate-fade-in [animation-delay:100ms] h-fit">
          <CardHeader className="flex flex-col items-center text-center pb-2">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl mb-4">
              <AvatarImage src={"https://github.com/shadcn.png"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {userEmail.substring(0, 2).toUpperCase() || "US"}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-xl">{userDisplayName}</CardTitle>
            <CardDescription>{userEmail}</CardDescription>

            <div className="flex items-center gap-2 mt-4 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-medium border border-green-200">
              <Shield className="w-3 h-3" /> Verified Account
            </div>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">Dec 2024</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium text-primary">Pro Trial</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms - Right Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/60 animate-fade-in [animation-delay:200ms]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-primary" /> General Information
              </CardTitle>
              <CardDescription>
                Update your personal details here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={userEmail}
                      disabled
                      className="pl-10 bg-secondary/30"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email address is managed by your organization.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                    className="shadow-md shadow-primary/20"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5 animate-fade-in [animation-delay:300ms]">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions for your account data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-destructive/20 rounded-lg bg-background/50 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground">Reset Data</h4>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Permanently delete all projects, orders, and measurements
                    from this device.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="shrink-0"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete All Data?"
        description="This action cannot be undone. This will permanently delete all your projects, orders, items, and measurements stored in this browser."
        confirmText="Yes, Delete Everything"
        cancelText="Cancel"
        onConfirm={handleDeleteAllData}
        variant="destructive"
      />
    </div>
  );
}
