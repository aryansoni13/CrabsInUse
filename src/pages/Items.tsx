import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  ArrowLeft,
  Package,
  Eye,
  Trash2,
  DollarSign,
  X,
  Edit,
  Filter,
  ChevronUp,
  ChevronDown,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  projectStorage,
  orderStorage,
  itemStorage,
  departmentStorage,
  measurementStorage,
  raBillStorage,
} from "@/lib/storage";
import {
  ItemWithCalculations,
  Project,
  Order,
  BillingBreakup,
  MeasurementRow,
} from "@/types";
import { OrderAbstractSheet } from "@/components/ui/order-abstract-sheet";

export default function Items() {
  const { projectId, orderId } = useParams<{
    projectId: string;
    orderId: string;
  }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<ItemWithCalculations[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemWithCalculations[]>(
    [],
  );
  const [departments, setDepartments] = useState<string[]>([]);
  const [allMeasurementRows, setAllMeasurementRows] = useState<
    MeasurementRow[]
  >([]);
  const [existingRACount, setExistingRACount] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithCalculations | null>(
    null,
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    itemId: string;
    itemDescription: string;
  }>({
    isOpen: false,
    itemId: "",
    itemDescription: "",
  });
  const [newItem, setNewItem] = useState({
    itemCode: "",
    description: "",
    shortDescription: "",
    unitOfMeasurement: "MT",
    quantity: 0,
    unitRate: 0,
    department: "",
    customDepartment: "",
    billingBreakup: [
      { id: "", name: "Advance Payment", percentage: 100 },
    ] as BillingBreakup[],
  });
  const [editItem, setEditItem] = useState({
    itemCode: "",
    description: "",
    shortDescription: "",
    unitOfMeasurement: "MT",
    quantity: 0,
    unitRate: 0,
    department: "",
    customDepartment: "",
    billingBreakup: [
      { id: "", name: "Advance Payment", percentage: 100 },
    ] as BillingBreakup[],
  });
  const [filters, setFilters] = useState({
    department: "__all__",
    sortBy: "description",
    sortOrder: "asc" as "asc" | "desc",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const unitOptions = [
    "MT",
    "KG",
    "PCS",
    "SQM",
    "CUM",
    "LTR",
    "SET",
    "NO",
    "RM",
    "INM",
    "IND",
  ];

  useEffect(() => {
    if (!projectId || !orderId || !currentUser) {
      if (!projectId || !orderId) navigate("/");
      return;
    }

    const loadAll = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadProject(),
          loadOrder(),
          loadDepartments(),
          loadItems(),
        ]);
        // Load these after items are loaded/concurrently but they depend on orderId
        await Promise.all([loadMeasurements(), loadRABills()]);
      } catch (error) {
        console.error("Failed to load data", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [projectId, orderId, navigate, currentUser]);

  useEffect(() => {
    applyFilters();
  }, [items, filters]);

  const loadProject = async () => {
    if (!projectId) return;
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
  };

  const loadOrder = async () => {
    if (!orderId) return;
    const orderData = await orderStorage.getById(orderId);
    if (!orderData) {
      toast({
        title: "Error",
        description: "Order not found",
        variant: "destructive",
      });
      navigate(`/projects/${projectId}/orders`);
      return;
    }
    setOrder(orderData);
  };

  const loadItems = async () => {
    if (!orderId || !currentUser) return;

    const orderItems = await itemStorage.getByOrderId(orderId, currentUser.id);
    const itemsWithCalculations: ItemWithCalculations[] = orderItems.map(
      (item) => ({
        ...item,
        totalMeasuredAmount: 0, // TODO: Calculate from measurement rows
        completedPercentage: 0, // TODO: Calculate from measurement progress
      }),
    );

    setItems(itemsWithCalculations);
  };

  const loadDepartments = async () => {
    if (!currentUser) return;
    const allDepartments = await departmentStorage.getAll(currentUser.id);
    setDepartments(allDepartments.map((d) => d.name));
  };

  const loadMeasurements = async () => {
    if (!orderId || !currentUser) return;
    const orderItems = await itemStorage.getByOrderId(orderId, currentUser.id);
    const measurements: MeasurementRow[] = [];

    // Process sequentially or use Promise.all
    const promises = orderItems.map((item) =>
      measurementStorage.getByItemId(item.id, currentUser.id),
    );

    const results = await Promise.all(promises);
    results.forEach((itemMeasurements) => {
      measurements.push(...itemMeasurements);
    });

    setAllMeasurementRows(measurements);
  };

  const loadRABills = async () => {
    if (!orderId || !currentUser) return;
    const bills = await raBillStorage.getByOrderId(orderId, currentUser.id);
    setExistingRACount(bills.length);
  };

  const handleGenerateRA = async (
    raNumber: string,
    lockedData: Array<{
      itemId: string;
      rowId: string;
      breakupKey: string;
      qty: number;
      weight: number;
      department: string;
      previousQty?: number;
      previousWeight?: number;
    }>,
  ) => {
    if (!orderId) return;

    // Create the RA bill
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await raBillStorage.create({
        orderId,
        raNumber,
        userId: currentUser.id,
        lockedData: lockedData.map((data) => ({
          itemId: data.itemId,
          rowId: data.rowId,
          breakupKey: data.breakupKey,
          executedQty: data.qty,
          executedWeight: data.weight,
          department: data.department,
          previousQty: data.previousQty || 0,
          previousWeight: data.previousWeight || 0,
        })),
      });

      // Update measurement rows to lock the quantities
      // Group all locks by rowId so we can update all milestones for a row at once
      const rowUpdates = new Map<
        string,
        {
          row: MeasurementRow;
          latestRow: MeasurementRow;
          milestones: Array<{
            breakupKey: string;
            qty: number;
            weight: number;
            itemId: string;
          }>;
        }
      >();

      // Get all latest rows once to reduce calls
      const allLatestRows = await measurementStorage.getAll(currentUser.id);

      // Group locks by rowId
      for (const data of lockedData) {
        const row = allMeasurementRows.find((r) => r.id === data.rowId);
        if (!row) continue;

        const latestRow = allLatestRows.find((r) => r.id === data.rowId);
        if (!latestRow) continue;

        if (!rowUpdates.has(data.rowId)) {
          rowUpdates.set(data.rowId, {
            row,
            latestRow,
            milestones: [],
          });
        }

        rowUpdates.get(data.rowId)!.milestones.push({
          breakupKey: data.breakupKey,
          qty: data.qty,
          weight: data.weight,
          itemId: data.itemId,
        });
      }

      // Now update each row with ALL its milestones at once
      for (const [rowId, updateData] of rowUpdates) {
        const { row, latestRow, milestones } = updateData;

        // Build the complete breakupStatus with all milestones locked
        const newBreakupStatus = { ...latestRow.breakupStatus };

        for (const milestone of milestones) {
          const currentStatus = newBreakupStatus[milestone.breakupKey] || {
            done: false,
            completedQty: 0,
            completedWeight: 0,
            lockedQty: 0,
            lockedWeight: 0,
            itemId: milestone.itemId,
          };

          const originalLockedQty = currentStatus.lockedQty || 0;
          const originalLockedWeight = currentStatus.lockedWeight || 0;
          const newLockedQty = originalLockedQty + milestone.qty;
          const newLockedWeight = originalLockedWeight + milestone.weight;

          // Mark as fully done if locked equals full row quantity
          const isFullyLocked = Math.abs(newLockedQty - row.qty) < 0.001;

          newBreakupStatus[milestone.breakupKey] = {
            done: isFullyLocked,
            completedQty: currentStatus.completedQty || row.qty,
            completedWeight: currentStatus.completedWeight || row.totalWeight,
            date: currentStatus.date || new Date().toISOString(),
            lockedInRA: raNumber,
            lockedQty: newLockedQty,
            lockedWeight: newLockedWeight,
            itemId: milestone.itemId,
            inputValue: currentStatus.inputValue,
          };
        }

        // Single update with all milestones for this row
        await measurementStorage.update(rowId, {
          breakupStatus: newBreakupStatus,
        });
      }

      // Reload data AFTER all updates are complete
      await loadMeasurements();
      await loadRABills();
      toast({
        title: "Success",
        description: "RA Bill generated successfully",
      });
    } catch (error) {
      console.error("Failed to generate RA", error);
      toast({
        title: "Error",
        description: "Failed to generate RA Bill",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Filter by department
    if (filters.department && filters.department !== "__all__") {
      filtered = filtered.filter(
        (item) => item.department === filters.department,
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "department":
          aValue = a.department;
          bValue = b.department;
          break;
        case "quantity":
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        default:
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
      }

      if (filters.sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredItems(filtered);
  };

  const addBillingBreakup = (isEdit = false) => {
    const setter = isEdit ? setEditItem : setNewItem;
    setter((prev) => ({
      ...prev,
      billingBreakup: [
        ...prev.billingBreakup,
        { id: generateId(), name: "", percentage: 0 },
      ],
    }));
  };

  const removeBillingBreakup = (index: number, isEdit = false) => {
    const item = isEdit ? editItem : newItem;
    const setter = isEdit ? setEditItem : setNewItem;

    if (item.billingBreakup.length === 1) return;
    setter((prev) => ({
      ...prev,
      billingBreakup: prev.billingBreakup.filter((_, i) => i !== index),
    }));
  };

  const updateBillingBreakup = (
    index: number,
    field: "name" | "percentage",
    value: string | number,
    isEdit = false,
  ) => {
    const setter = isEdit ? setEditItem : setNewItem;
    setter((prev) => ({
      ...prev,
      billingBreakup: prev.billingBreakup.map((breakup, i) =>
        i === index ? { ...breakup, [field]: value } : breakup,
      ),
    }));
  };

  const validateBillingBreakup = (breakup: BillingBreakup[]) => {
    const totalPercentage = breakup.reduce(
      (sum, breakup) => sum + breakup.percentage,
      0,
    );
    return (
      totalPercentage === 100 &&
      breakup.every((b) => b.name.trim() && b.percentage > 0)
    );
  };

  const handleCreateItem = async () => {
    if (
      !orderId ||
      !newItem.description.trim() ||
      !newItem.department.trim() ||
      newItem.quantity <= 0 ||
      newItem.unitRate <= 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values",
        variant: "destructive",
      });
      return;
    }

    if (!validateBillingBreakup(newItem.billingBreakup)) {
      toast({
        title: "Validation Error",
        description:
          "Billing breakup must total 100% and all fields must be filled",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalDepartment =
        newItem.department === "Others" && newItem.customDepartment
          ? newItem.customDepartment
          : newItem.department;

      // Create or get department
      if (!currentUser) return;
      await departmentStorage.getOrCreate(
        finalDepartment.trim(),
        currentUser.id,
      );

      await itemStorage.create({
        orderId,
        itemCode: newItem.itemCode?.trim(),
        description: newItem.description.trim(),
        shortDescription: newItem.shortDescription?.trim() || undefined,
        unitOfMeasurement: newItem.unitOfMeasurement,
        quantity: newItem.quantity,
        unitRate: newItem.unitRate,
        department: finalDepartment.trim(),
        billingBreakup: newItem.billingBreakup.map((b) => ({
          ...b,
          name: b.name.trim(),
        })),
        userId: currentUser.id,
      });

      setNewItem({
        itemCode: "",
        description: "",
        shortDescription: "",
        unitOfMeasurement: "MT",
        quantity: 0,
        unitRate: 0,
        department: "",
        customDepartment: "",
        billingBreakup: [
          { id: generateId(), name: "Advance Payment", percentage: 100 },
        ],
      });
      setIsCreateDialogOpen(false);
      await loadItems();
      await loadDepartments();

      toast({
        title: "Success",
        description: "Item created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item: ItemWithCalculations) => {
    const isStandardDepartment = [
      "Structure",
      "Piping-LHS",
      "Piping-Spool Status",
      "Piping Insulation",
      "Equipment Insulation",
    ].includes(item.department);

    setEditingItem(item);
    setEditItem({
      itemCode: item.itemCode || "",
      description: item.description,
      shortDescription: item.shortDescription || "",
      unitOfMeasurement: item.unitOfMeasurement,
      quantity: item.quantity,
      unitRate: item.unitRate,
      department: isStandardDepartment ? item.department : "Others",
      customDepartment: isStandardDepartment ? "" : item.department,
      billingBreakup: [...item.billingBreakup],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (
      !editingItem ||
      !editItem.description.trim() ||
      !editItem.department.trim() ||
      editItem.quantity <= 0 ||
      editItem.unitRate <= 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values",
        variant: "destructive",
      });
      return;
    }

    if (!validateBillingBreakup(editItem.billingBreakup)) {
      toast({
        title: "Validation Error",
        description:
          "Billing breakup must total 100% and all fields must be filled",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalDepartment =
        editItem.department === "Others" && editItem.customDepartment
          ? editItem.customDepartment
          : editItem.department;

      // Create or get department
      if (!currentUser) return;
      await departmentStorage.getOrCreate(
        finalDepartment.trim(),
        currentUser.id,
      );

      await itemStorage.update(editingItem.id, {
        itemCode: editItem.itemCode?.trim(),
        description: editItem.description.trim(),
        shortDescription: editItem.shortDescription?.trim() || undefined,
        unitOfMeasurement: editItem.unitOfMeasurement,
        quantity: editItem.quantity,
        unitRate: editItem.unitRate,
        department: finalDepartment.trim(),
        billingBreakup: editItem.billingBreakup.map((b) => ({
          ...b,
          name: b.name.trim(),
        })),
      });

      setIsEditDialogOpen(false);
      setEditingItem(null);
      await loadItems();
      await loadDepartments();

      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setDeleteDialog({
      isOpen: true,
      itemId,
      itemDescription: item.description,
    });
  };

  const confirmDeleteItem = async () => {
    const success = await itemStorage.delete(deleteDialog.itemId);
    if (success) {
      await loadItems();
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      // 1 crore
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      // 1 lakh
      return `₹${(amount / 100000).toFixed(2)}L`;
    } else if (amount >= 1000) {
      // 1 thousand
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (filters.sortBy !== field) return null;
    return filters.sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    );
  };

  const renderBillingBreakupForm = (item: any, setter: any, isEdit = false) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Billing Breakup *</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addBillingBreakup(isEdit)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Milestone
        </Button>
      </div>

      <div className="space-y-2">
        {item.billingBreakup.map((breakup: any, index: number) => (
          <div key={breakup.id} className="flex items-center space-x-2">
            <Input
              placeholder="Milestone name"
              value={breakup.name}
              onChange={(e) =>
                updateBillingBreakup(index, "name", e.target.value, isEdit)
              }
              className="flex-1"
            />
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Percentage"
              value={breakup.percentage || ""}
              onChange={(e) =>
                updateBillingBreakup(
                  index,
                  "percentage",
                  parseFloat(e.target.value) || 0,
                  isEdit,
                )
              }
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
            {item.billingBreakup.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeBillingBreakup(index, isEdit)}
                className="p-1 h-8 w-8 text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <div className="text-sm text-muted-foreground">
          Total:{" "}
          {item.billingBreakup.reduce(
            (sum: number, b: any) => sum + b.percentage,
            0,
          )}
          %
        </div>
      </div>
    </div>
  );

  if (!project || !order) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/orders`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{order.title}</h1>
          <p className="text-muted-foreground">
            Order #{order.orderCode || order.orderNumber} • {project.name}
          </p>
        </div>

        <div className="flex gap-2">
          {items.length > 0 && (
            <OrderAbstractSheet
              project={project}
              order={order}
              items={items}
              allMeasurementRows={allMeasurementRows}
              onGenerateRA={handleGenerateRA}
              existingRACount={existingRACount}
            />
          )}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="shadow-elegant">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Add a new work item to this order.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemCode">Item Code</Label>
                    <Input
                      id="itemCode"
                      placeholder="e.g., S00995413"
                      value={newItem.itemCode}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          itemCode: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="itemDescription">Item Description *</Label>
                    <Textarea
                      id="itemDescription"
                      placeholder="e.g., Structure Fabrication & Erection Work"
                      value={newItem.description}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewItem((prev) => ({
                          ...prev,
                          description: value,
                          // Auto-populate short description if it's empty or matches previous description
                          shortDescription:
                            !prev.shortDescription ||
                              prev.shortDescription === prev.description
                              ? value
                              : prev.shortDescription,
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="shortDescription">
                      Short Description (for milestone heading)
                    </Label>
                    <Input
                      id="shortDescription"
                      placeholder="Short name for milestone columns"
                      value={newItem.shortDescription}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          shortDescription: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Used as heading for milestones in measurement sheet
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unitOfMeasurement">
                      Unit of Measurement *
                    </Label>
                    <Select
                      value={newItem.unitOfMeasurement}
                      onValueChange={(value) =>
                        setNewItem((prev) => ({
                          ...prev,
                          unitOfMeasurement: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={newItem.department}
                      onValueChange={(value) =>
                        setNewItem((prev) => ({ ...prev, department: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Structure">Structure</SelectItem>
                        <SelectItem value="Piping-LHS">Piping-LHS</SelectItem>
                        <SelectItem value="Piping-Spool Status">
                          Piping-Spool Status
                        </SelectItem>
                        <SelectItem value="Piping Insulation">
                          Piping Insulation
                        </SelectItem>
                        <SelectItem value="Equipment Insulation">
                          Equipment Insulation
                        </SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                    {newItem.department === "Others" && (
                      <Input
                        placeholder="Enter Custom Department"
                        value={newItem.customDepartment}
                        onChange={(e) =>
                          setNewItem((prev) => ({
                            ...prev,
                            customDepartment: e.target.value,
                          }))
                        }
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.001"
                      min="0"
                      value={newItem.quantity || ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          quantity: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unitRate">Unit Rate (₹) *</Label>
                    <Input
                      id="unitRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItem.unitRate || ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          unitRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                {renderBillingBreakupForm(newItem, setNewItem)}

                {newItem.quantity > 0 && newItem.unitRate > 0 && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm font-medium">
                      Total Amount:{" "}
                      {formatCurrency(newItem.quantity * newItem.unitRate)}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateItem}
                  disabled={isLoading}
                  className="shadow-elegant"
                >
                  {isLoading ? "Creating..." : "Create Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
                <DialogDescription>
                  Update the item information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editItemCode">Item Code</Label>
                    <Input
                      id="editItemCode"
                      placeholder="e.g., S00995413"
                      value={editItem.itemCode}
                      onChange={(e) =>
                        setEditItem((prev) => ({
                          ...prev,
                          itemCode: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="editItemDescription">
                      Item Description *
                    </Label>
                    <Textarea
                      id="editItemDescription"
                      placeholder="e.g., Structure Fabrication & Erection Work"
                      value={editItem.description}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditItem((prev) => ({
                          ...prev,
                          description: value,
                          // Auto-populate short description if it's empty or matches previous description
                          shortDescription:
                            !prev.shortDescription ||
                              prev.shortDescription === prev.description
                              ? value
                              : prev.shortDescription,
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="editShortDescription">
                      Short Description (for milestone heading)
                    </Label>
                    <Input
                      id="editShortDescription"
                      placeholder="Short name for milestone columns"
                      value={editItem.shortDescription}
                      onChange={(e) =>
                        setEditItem((prev) => ({
                          ...prev,
                          shortDescription: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Used as heading for milestones in measurement sheet
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editUnitOfMeasurement">
                      Unit of Measurement *
                    </Label>
                    <Select
                      value={editItem.unitOfMeasurement}
                      onValueChange={(value) =>
                        setEditItem((prev) => ({
                          ...prev,
                          unitOfMeasurement: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editDepartment">Department *</Label>
                    <Select
                      value={editItem.department}
                      onValueChange={(value) =>
                        setEditItem((prev) => ({ ...prev, department: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Structure">Structure</SelectItem>
                        <SelectItem value="Piping-LHS">Piping-LHS</SelectItem>
                        <SelectItem value="Piping-Spool Status">
                          Piping-Spool Status
                        </SelectItem>
                        <SelectItem value="Piping Insulation">
                          Piping Insulation
                        </SelectItem>
                        <SelectItem value="Equipment Insulation">
                          Equipment Insulation
                        </SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                    {editItem.department === "Others" && (
                      <Input
                        placeholder="Enter Custom Department"
                        value={editItem.customDepartment}
                        onChange={(e) =>
                          setEditItem((prev) => ({
                            ...prev,
                            customDepartment: e.target.value,
                          }))
                        }
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editQuantity">Quantity *</Label>
                    <Input
                      id="editQuantity"
                      type="number"
                      step="0.001"
                      min="0"
                      value={editItem.quantity || ""}
                      onChange={(e) =>
                        setEditItem((prev) => ({
                          ...prev,
                          quantity: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editUnitRate">Unit Rate (₹) *</Label>
                    <Input
                      id="editUnitRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editItem.unitRate || ""}
                      onChange={(e) =>
                        setEditItem((prev) => ({
                          ...prev,
                          unitRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                {renderBillingBreakupForm(editItem, setEditItem, true)}

                {editItem.quantity > 0 && editItem.unitRate > 0 && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-sm font-medium">
                      Total Amount:{" "}
                      {formatCurrency(editItem.quantity * editItem.unitRate)}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateItem}
                  disabled={isLoading}
                  className="shadow-elegant"
                >
                  {isLoading ? "Updating..." : "Update Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">Filters & Sort</h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="departmentFilter">Department</Label>
              <Select
                value={filters.department}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, department: value }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="quantity">Quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Order</Label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value: "asc" | "desc") =>
                  setFilters((prev) => ({ ...prev, sortOrder: value }))
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              No Items Yet
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Add work items to this order to start tracking measurements and
              billing.
            </p>
            <Button
              className="mt-4 shadow-elegant"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("description")}
                  >
                    <div className="flex items-center">
                      Description
                      <SortIcon field="description" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center">
                      Department
                      <SortIcon field="department" />
                    </div>
                  </TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center justify-end">
                      Quantity
                      <SortIcon field="quantity" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Unit Rate</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end">
                      Amount
                      <SortIcon field="amount" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.itemCode && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.itemCode}
                          </div>
                        )}
                        <div className="font-medium line-clamp-2">
                          {item.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Milestones:{" "}
                          {item.billingBreakup
                            .map((b) => `${b.percentage}%`)
                            .join(", ")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.department}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.unitOfMeasurement}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.quantity.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className="truncate block"
                        title={formatCurrency(item.unitRate)}
                      >
                        {formatCurrency(item.unitRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      <span
                        className="truncate block"
                        title={formatCurrency(item.amount)}
                      >
                        {formatCurrency(item.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/projects/${projectId}/orders/${orderId}/items/${item.id}/measurement`}
                        >
                          <Button variant="outline" size="sm" className="h-8">
                            <Eye className="mr-1 h-3 w-3" />
                            Measure
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                          className="h-8"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, isOpen: open }))
        }
        title="Delete Item"
        description={`Are you sure you want to delete the item "${deleteDialog.itemDescription}"? This will also delete all associated measurement data. This action cannot be undone.`}
        confirmText="Delete Item"
        cancelText="Cancel"
        onConfirm={confirmDeleteItem}
        variant="destructive"
      />

      {/* Summary Stats */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{filteredItems.length}</p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
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
                      filteredItems.reduce((sum, item) => sum + item.amount, 0),
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
                <Badge className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Set(filteredItems.map((item) => item.department)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-info" />
                <div>
                  <p className="text-2xl font-bold">
                    {filteredItems.length > 0
                      ? formatCurrency(
                        filteredItems.reduce(
                          (sum, item) => sum + item.amount,
                          0,
                        ) / filteredItems.length,
                      )
                      : "₹0"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Average Amount
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
