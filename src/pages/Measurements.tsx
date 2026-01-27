import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Ruler,
  Building2,
  Hash,
  ArrowRight,
  FileText,
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
  projectStorage,
  orderStorage,
  itemStorage,
  measurementStorage,
} from "@/lib/storage";
import { Project, Order, Item } from "@/types";

export default function Measurements() {
  const navigate = useNavigate();
  const [data, setData] = useState<
    {
      project: Project;
      order: Order;
      items: (Item & { measurementCount: number })[];
    }[]
  >([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("all");
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        const projects = await projectStorage.getAll(currentUser.id);

        const allDataPromises = projects.map(async (project) => {
          const orders = await orderStorage.getByProjectId(
            project.id,
            currentUser.id
          );

          const orderPromises = orders.map(async (order) => {
            const items = await itemStorage.getByOrderId(
              order.id,
              currentUser.id
            );

            // Calc counts
            const itemsWithCounts = await Promise.all(
              items.map(async (item) => {
                // We could optimize this by fetching all measurements for the order or user once
                // But for now, let's just await the getByItemId count
                const measurements = await measurementStorage.getByItemId(
                  item.id,
                  currentUser.id
                );
                return {
                  ...item,
                  measurementCount: measurements.length,
                };
              })
            );

            return {
              project,
              order,
              items: itemsWithCounts,
            };
          });

          return Promise.all(orderPromises);
        });

        const nestedData = await Promise.all(allDataPromises);
        setData(nestedData.flat());
      } catch (error) {
        console.error("Failed to load measurements data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const filteredData =
    selectedOrderId === "all"
      ? data
      : data.filter((group) => group.order.id === selectedOrderId);

  // Get unique orders for the dropdown
  const uniqueOrders = data.map(({ order, project }) => ({
    id: order.id,
    label: `${order.orderNumber} - ${project.name}`,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex items-center space-x-3">
            <Ruler className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Measurements
              </h1>
              <p className="text-muted-foreground">
                Manage measurement sheets for all orders
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
                  {uniqueOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge
              variant="secondary"
              className="text-sm h-10 px-4 flex items-center"
            >
              {data.reduce((acc, curr) => acc + curr.items.length, 0)} Items
            </Badge>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Orders List */}
        {filteredData.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Ruler className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Orders Found
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {data.length === 0
                  ? "Create projects and orders to start adding measurements."
                  : "No orders found for the selected filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {filteredData.map(({ project, order, items }) => (
              <div key={order.id} className="space-y-4">
                <div className="flex items-center space-x-3 pb-2 border-b border-border/50">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Order {order.orderNumber}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {project.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((item) => {
                    return (
                      <Card
                        key={item.id}
                        className="group hover:shadow-md transition-all duration-300 border-border/60 hover:border-primary/20"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <CardTitle
                                className="text-base font-medium text-foreground line-clamp-1"
                                title={item.description}
                              >
                                {item.description}
                              </CardTitle>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <FileText className="h-3 w-3 mr-1" />
                                {item.itemCode || "No Code"}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {item.department}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm py-2 border-t border-border/50">
                              <span className="text-muted-foreground">
                                Measurements
                              </span>
                              <span className="font-medium">
                                {item.measurementCount} entries
                              </span>
                            </div>
                            <Button
                              onClick={() =>
                                navigate(
                                  `/projects/${project.id}/orders/${order.id}/items/${item.id}/measurement`
                                )
                              }
                              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                              variant="outline"
                              size="sm"
                            >
                              Open Sheet <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground text-sm italic">
                      No items found in this order.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
