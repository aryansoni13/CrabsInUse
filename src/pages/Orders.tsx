import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowLeft,
  FileText,
  Eye,
  Trash2,
  DollarSign,
  Edit,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { projectStorage, orderStorage, itemStorage } from "@/lib/storage";
import { OrderWithCalculations, Project } from "@/types";

export default function Orders() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [orders, setOrders] = useState<OrderWithCalculations[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<OrderWithCalculations | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    orderId: string;
    orderTitle: string;
  }>({
    isOpen: false,
    orderId: "",
    orderTitle: "",
  });
  const [newOrder, setNewOrder] = useState({
    orderCode: "",
    title: "",
    description: "",
  });
  const [editOrder, setEditOrder] = useState({
    orderCode: "",
    title: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!projectId || !currentUser) {
      if (!projectId) navigate("/");
      return;
    }

    loadProject();
    loadOrders();
  }, [projectId, navigate, currentUser]);

  const loadProject = async () => {
    if (!projectId) return;
    try {
      const projectData = await projectStorage.getById(projectId);
      if (!projectData) {
        toast({
          title: "Error",
          description: "Project not found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      setProject(projectData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const loadOrders = async () => {
    if (!projectId || !currentUser) return;

    try {
      const [projectOrders, allItems] = await Promise.all([
        orderStorage.getByProjectId(projectId, currentUser.id),
        itemStorage.getAll(currentUser.id),
      ]);

      const ordersWithCalculations: OrderWithCalculations[] = projectOrders.map(
        (order) => {
          const orderItems = allItems.filter(
            (item) => item.orderId === order.id
          );
          const totalAmount = orderItems.reduce(
            (sum, item) => sum + item.amount,
            0
          );

          return {
            ...order,
            totalAmount,
            itemsCount: orderItems.length,
            projectName: project?.name || "",
          };
        }
      );

      setOrders(ordersWithCalculations);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrder = async () => {
    if (!projectId || !newOrder.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in the order title",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!currentUser) return;
      await orderStorage.create({
        projectId,
        orderCode: newOrder.orderCode?.trim(),
        title: newOrder.title.trim(),
        description: newOrder.description.trim() || undefined,
        userId: currentUser.id,
      });

      setNewOrder({ orderCode: "", title: "", description: "" });
      setIsCreateDialogOpen(false);
      loadOrders();

      toast({
        title: "Success",
        description: "Order created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditOrder = (order: OrderWithCalculations) => {
    setEditingOrder(order);
    setEditOrder({
      orderCode: order.orderCode || "",
      title: order.title,
      description: order.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder || !editOrder.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in the order title",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await orderStorage.update(editingOrder.id, {
        orderCode: editOrder.orderCode?.trim(),
        title: editOrder.title.trim(),
        description: editOrder.description.trim() || undefined,
      });

      setEditOrder({ orderCode: "", title: "", description: "" });
      setIsEditDialogOpen(false);
      setEditingOrder(null);
      loadOrders();

      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setDeleteDialog({
      isOpen: true,
      orderId,
      orderTitle: order.title,
    });
  };

  const confirmDeleteOrder = async () => {
    try {
      const success = await orderStorage.delete(deleteDialog.orderId);
      if (success) {
        loadOrders();
        toast({
          title: "Success",
          description: "Order deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete order",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
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

  if (!project) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground">
            Orders for {project.clientName}
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-elegant">
              <Plus className="mr-2 h-4 w-4" />
              Add Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Add a new order to this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderCode">Order Code</Label>
                <Input
                  id="orderCode"
                  placeholder="e.g., PO-2024-001"
                  value={newOrder.orderCode}
                  onChange={(e) =>
                    setNewOrder((prev) => ({
                      ...prev,
                      orderCode: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderTitle">Order Title *</Label>
                <Input
                  id="orderTitle"
                  placeholder="e.g., Main Construction Work"
                  value={newOrder.title}
                  onChange={(e) =>
                    setNewOrder((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDescription">Order Description</Label>
                <Textarea
                  id="orderDescription"
                  placeholder="Optional description of the work to be done..."
                  value={newOrder.description}
                  onChange={(e) =>
                    setNewOrder((prev) => ({
                      ...prev,
                      description: e.target.value,
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
                onClick={handleCreateOrder}
                disabled={isLoading}
                className="shadow-elegant"
              >
                {isLoading ? "Creating..." : "Create Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
              <DialogDescription>
                Update the order information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editOrderCode">Order Code</Label>
                <Input
                  id="editOrderCode"
                  placeholder="e.g., PO-2024-001"
                  value={editOrder.orderCode}
                  onChange={(e) =>
                    setEditOrder((prev) => ({
                      ...prev,
                      orderCode: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrderTitle">Order Title *</Label>
                <Input
                  id="editOrderTitle"
                  placeholder="e.g., Main Construction Work"
                  value={editOrder.title}
                  onChange={(e) =>
                    setEditOrder((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrderDescription">Order Description</Label>
                <Textarea
                  id="editOrderDescription"
                  placeholder="Optional description of the work to be done..."
                  value={editOrder.description}
                  onChange={(e) =>
                    setEditOrder((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateOrder}
                disabled={isLoading}
                className="shadow-elegant"
              >
                {isLoading ? "Updating..." : "Update Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              No Orders Yet
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Create your first order to start tracking work items and
              measurements.
            </p>
            <Button
              className="mt-4 shadow-elegant"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="hover:shadow-elegant transition-shadow duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-1">
                      {order.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Order #{order.orderCode || order.orderNumber}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                </div>
                {order.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {order.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Items</p>
                    <p className="font-semibold">{order.itemsCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Amount</p>
                    <p
                      className="font-semibold text-primary truncate"
                      title={`${formatCurrency(order.totalAmount)}`}
                    >
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex space-x-2">
                    <Link
                      to={`/projects/${projectId}/orders/${order.id}/items`}
                    >
                      <Button variant="outline" size="sm" className="h-8">
                        <Eye className="mr-1 h-3 w-3" />
                        View Items
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOrder(order)}
                      className="h-8"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOrder(order.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Created {new Date(order.createdAt).toLocaleDateString()}
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
        title="Delete Order"
        description={`Are you sure you want to delete the order "${deleteDialog.orderTitle}"? This will also delete all associated items. This action cannot be undone.`}
        confirmText="Delete Order"
        cancelText="Cancel"
        onConfirm={confirmDeleteOrder}
        variant="destructive"
      />

      {/* Stats Cards */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{orders.length}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      orders.reduce((sum, o) => sum + o.totalAmount, 0)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">
                    {orders.reduce((sum, o) => sum + o.itemsCount, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
