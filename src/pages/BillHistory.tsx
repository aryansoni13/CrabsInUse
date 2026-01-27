import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Download,
  Calendar,
  Building2,
  Hash,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  raBillStorage,
  projectStorage,
  orderStorage,
  itemStorage,
  measurementStorage,
} from "@/lib/storage";
import { RABill, Project, Order, Item, MeasurementRow } from "@/types";
import { BillDisplay } from "@/components/ui/bill-display";
import { generateSegmentedMultiPageBillPDF } from "@/lib/pdf-generator";

export default function BillHistory() {
  const [allRABills, setAllRABills] = useState<RABill[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedBill, setSelectedBill] = useState<RABill | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("all");
  const [billData, setBillData] = useState<{
    project: Project;
    order: Order;
    items: Item[];
    measurementRows: MeasurementRow[];
  } | null>(null);
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [bills, orders, projects] = await Promise.all([
        raBillStorage.getAll(currentUser.id),
        orderStorage.getAll(currentUser.id),
        projectStorage.getAll(currentUser.id),
      ]);

      // Sort by creation date (newest first)
      bills.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAllRABills(bills);
      setAllOrders(orders);
      setAllProjects(projects);
    } catch (error) {
      console.error("Failed to load bill history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewBill = async (bill: RABill) => {
    if (!currentUser) return;
    setSelectedBill(bill);

    // Load related data for the bill
    // We can use the already loaded orders/projects state
    const order = allOrders.find((o) => o.id === bill.orderId);
    if (!order) return;

    const project = allProjects.find((p) => p.id === order.projectId);
    if (!project) return;

    // Fetch items and measurements async
    try {
      const items = await itemStorage.getByOrderId(
        bill.orderId,
        currentUser.id
      );
      const allMeasurements = await measurementStorage.getAll(currentUser.id);
      const measurementRows = allMeasurements.filter((row) =>
        items.some((item) => item.id === row.itemId)
      );

      setBillData({
        project,
        order,
        items,
        measurementRows,
      });
    } catch (error) {
      console.error("Failed to load bill details:", error);
    }
  };

  const handlePrint = async () => {
    if (!selectedBill || !billData) return;

    try {
      const filename = `${
        selectedBill.raNumber
      }_${billData.project.name.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      await generateSegmentedMultiPageBillPDF(
        ["bill-abstract-section", "bill-measurement-section"],
        filename
      );
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF generation failed. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group bills by Order ID
  const groupedBills = allRABills.reduce((acc, bill) => {
    if (!acc[bill.orderId]) {
      acc[bill.orderId] = [];
    }
    acc[bill.orderId].push(bill);
    return acc;
  }, {} as Record<string, RABill[]>);

  // Convert to array and sort groups by most recent bill
  const billGroups = Object.entries(groupedBills)
    .map(([orderId, bills]) => {
      const order = allOrders.find((o) => o.id === orderId);
      const project = order
        ? allProjects.find((p) => p.id === order.projectId)
        : null;
      return {
        orderId,
        order,
        project,
        bills, // bills are already sorted by date descending from the useEffect
      };
    })
    .sort((a, b) => {
      // Sort groups by the date of the most recent bill in the group
      const dateA = new Date(a.bills[0].createdAt).getTime();
      const dateB = new Date(b.bills[0].createdAt).getTime();
      return dateB - dateA;
    });

  // Filter groups based on selection
  const filteredGroups =
    selectedOrderId === "all"
      ? billGroups
      : billGroups.filter((group) => group.orderId === selectedOrderId);

  if (selectedBill && billData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 print:hidden">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBill(null);
                  setBillData(null);
                }}
              >
                ← Back to History
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedBill.raNumber}
                </h1>
                <p className="text-muted-foreground">
                  Generated on {formatDate(selectedBill.createdAt)}
                </p>
              </div>
            </div>
            <Button onClick={handlePrint} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>

          {/* Bill Display */}
          <BillDisplay
            project={billData.project}
            order={billData.order}
            items={billData.items}
            measurementRows={billData.measurementRows}
            raBill={selectedBill}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Bill History
              </h1>
              <p className="text-muted-foreground">
                View and print all previously generated RA bills
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <Select
                value={selectedOrderId}
                onValueChange={setSelectedOrderId}
              >
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  {billGroups.map((group) => (
                    <SelectItem key={group.orderId} value={group.orderId}>
                      {group.order?.orderNumber || "Unknown"} -{" "}
                      {group.project?.name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge
              variant="secondary"
              className="text-sm h-10 px-4 flex items-center"
            >
              {allRABills.length} Bills Generated
            </Badge>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Bills List */}
        {filteredGroups.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Bills Found
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {allRABills.length === 0
                  ? "RA bills will appear here once they are generated from the measurement sheets."
                  : "No bills found for the selected order. Try selecting a different order."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {filteredGroups.map((group) => (
              <div key={group.orderId} className="space-y-4">
                <div className="flex items-center space-x-3 pb-2 border-b border-border/50">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Order {group.order?.orderNumber || "Unknown"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {group.project?.name || "Unknown Project"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {group.bills.map((bill) => {
                    return (
                      <Card
                        key={bill.id}
                        className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/20"
                      >
                        <CardHeader className="pb-3 space-y-0">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {bill.raNumber}
                              </CardTitle>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(bill.createdAt)}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="bg-secondary/50 text-xs font-normal"
                            >
                              Generated
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm py-2 border-t border-border/50 border-b">
                              <span className="text-muted-foreground">
                                Entries
                              </span>
                              <span className="font-medium">
                                {bill.lockedData.length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm pb-2 border-b border-border/50">
                              <span className="text-muted-foreground">
                                Total Weight
                              </span>
                              <span className="font-medium">
                                {bill.lockedData
                                  .reduce(
                                    (sum, item) => sum + item.executedWeight,
                                    0
                                  )
                                  .toFixed(3)}{" "}
                                MT
                              </span>
                            </div>

                            <Button
                              onClick={() => handleViewBill(bill)}
                              className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                              variant="secondary"
                              size="sm"
                            >
                              View Bill Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
