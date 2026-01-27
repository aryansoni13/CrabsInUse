import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Layers, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { columnGroupStorage } from "@/lib/columnGroupStorage";
import { ColumnGroup } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ColumnGroupConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableColumns: string[];
  orderId: string;
  department: string;
  onGroupsChange?: (groups: ColumnGroup[]) => void;
}

export function ColumnGroupConfig({
  open,
  onOpenChange,
  availableColumns,
  orderId,
  department,
  onGroupsChange,
}: ColumnGroupConfigProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ColumnGroup[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load groups from Firebase
  useEffect(() => {
    if (open && currentUser && orderId && department) {
      loadGroups();
    }
  }, [open, currentUser, orderId, department]);

  const loadGroups = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const loadedGroups = await columnGroupStorage.getByOrderAndDepartment(
        orderId,
        department,
        currentUser.id
      );
      setGroups(loadedGroups);
      onGroupsChange?.(loadedGroups);
    } catch (error) {
      console.error("Failed to load groups:", error);
      toast({
        title: "Error",
        description: "Failed to load column groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!currentUser) return;
    try {
      const newGroup = await columnGroupStorage.create({
        name: `Group ${groups.length + 1}`,
        isActive: false,
        selectedColumns: [],
        department,
        orderId,
        userId: currentUser.id,
      });
      const updatedGroups = [...groups, newGroup];
      setGroups(updatedGroups);
      setExpandedGroupId(newGroup.id);
      onGroupsChange?.(updatedGroups);
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    } catch (error) {
      console.error("Failed to create group:", error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await columnGroupStorage.delete(id);
      const updatedGroups = groups.filter((g) => g.id !== id);
      setGroups(updatedGroups);
      if (expandedGroupId === id) setExpandedGroupId(null);
      onGroupsChange?.(updatedGroups);
      toast({
        title: "Success",
        description: "Group deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const toggleGroupActive = async (id: string, checked: boolean) => {
    try {
      await columnGroupStorage.update(id, { isActive: checked });
      const updatedGroups = groups.map((g) =>
        g.id === id ? { ...g, isActive: checked } : g
      );
      setGroups(updatedGroups);
      onGroupsChange?.(updatedGroups);
    } catch (error) {
      console.error("Failed to update group:", error);
      toast({
        title: "Error",
        description: "Failed to update group status",
        variant: "destructive",
      });
    }
  };

  const toggleColumnSelection = async (groupId: string, column: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const exists = group.selectedColumns.includes(column);
    const newSelectedColumns = exists
      ? group.selectedColumns.filter((c) => c !== column)
      : [...group.selectedColumns, column];

    try {
      await columnGroupStorage.update(groupId, {
        selectedColumns: newSelectedColumns,
      });
      const updatedGroups = groups.map((g) =>
        g.id === groupId ? { ...g, selectedColumns: newSelectedColumns } : g
      );
      setGroups(updatedGroups);
      onGroupsChange?.(updatedGroups);
    } catch (error) {
      console.error("Failed to update group columns:", error);
      toast({
        title: "Error",
        description: "Failed to update column selection",
        variant: "destructive",
      });
    }
  };

  const updateGroupName = async (id: string, name: string) => {
    try {
      await columnGroupStorage.update(id, { name });
      setGroups(groups.map((g) => (g.id === id ? { ...g, name } : g)));
    } catch (error) {
      console.error("Failed to update group name:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 bg-background">
        <div className="p-6 pb-4 border-b">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-xl">
              Column Group Configuration
            </SheetTitle>
            <SheetDescription>
              Create and manage groups with single-entry rules for different
              column combinations
            </SheetDescription>
          </SheetHeader>
          <Button
            className="w-full border-dashed"
            variant="outline"
            onClick={handleAddGroup}
            disabled={loading}
          >
            <Plus className="mr-2 h-4 w-4" /> Add New Group
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 pt-4 flex flex-col gap-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No groups yet. Create one to get started.
              </div>
            ) : (
              groups.map((group) => {
                const isExpanded = expandedGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "rounded-lg border bg-card text-card-foreground shadow-sm transition-all",
                      isExpanded ? "ring-1 ring-primary/20" : ""
                    )}
                  >
                    {/* Header Row */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
                      onClick={() =>
                        setExpandedGroupId(isExpanded ? null : group.id)
                      }
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={group.isActive}
                          onCheckedChange={(c) =>
                            toggleGroupActive(group.id, c)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary">
                        <Layers className="h-4 w-4" />
                      </div>

                      <Input
                        value={group.name}
                        onChange={(e) =>
                          updateGroupName(group.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) =>
                          updateGroupName(group.id, e.target.value)
                        }
                        className="h-8 flex-1"
                      />

                      {group.isActive && (
                        <Badge
                          variant="outline"
                          className="text-primary border-primary/20 bg-primary/5 hidden sm:flex gap-1"
                        >
                          <AlertCircle className="h-3 w-3" /> Active
                        </Badge>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteGroup(group.id, e)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t bg-muted/5">
                        <p className="text-xs text-muted-foreground mb-3 font-medium">
                          Select columns for this group
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {availableColumns.map((col) => {
                            const isSelected =
                              group.selectedColumns.includes(col);
                            return (
                              <div
                                key={col}
                                className="flex items-center space-x-2 bg-background p-2 rounded border hover:border-primary/50 transition-colors"
                              >
                                <Checkbox
                                  id={`${group.id}-${col}`}
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleColumnSelection(group.id, col)
                                  }
                                />
                                <label
                                  htmlFor={`${group.id}-${col}`}
                                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                >
                                  {col}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
