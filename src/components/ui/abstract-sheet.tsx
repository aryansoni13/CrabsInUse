import { useState } from 'react';
import { FileText, Download, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Item, MeasurementRow, Order, Project } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AbstractSheetProps {
  project: Project;
  order: Order;
  item: Item;
  measurementRows: MeasurementRow[];
  onGenerateRA: (raNumber: string, lockedData: Array<{rowId: string, breakupKey: string, qty: number, weight: number}>) => void;
  existingRACount: number;
}

export function AbstractSheet({
  project,
  order,
  item,
  measurementRows,
  onGenerateRA,
  existingRACount,
}: AbstractSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  
  const raNumber = `RA-${existingRACount + 1}`;

  // Get all unique breakup columns
  const getAllBreakupColumns = () => {
    const breakupSet = new Set<string>();
    item.billingBreakup.forEach(breakup => {
      breakupSet.add(`${breakup.percentage}%-${breakup.name}`);
    });
    return Array.from(breakupSet).map(key => {
      const [percentage, name] = key.split('-');
      return { percentage: parseInt(percentage), name, key };
    });
  };

  const breakupColumns = getAllBreakupColumns();

  // Calculate executed quantities for each breakup (only unlocked)
  const calculateExecutedData = () => {
    return breakupColumns.map(col => {
      let totalExecutedWeight = 0;
      let totalExecutedQty = 0;

      measurementRows.forEach(row => {
        const status = row.breakupStatus[col.key];
        // Only include quantities that are NOT locked in any RA
        if (status && !status.lockedInRA && status.completedWeight && status.completedWeight > 0) {
          totalExecutedWeight += status.completedWeight;
          totalExecutedQty += status.completedQty || 0;
        }
      });

      const amount = totalExecutedWeight * item.unitRate;

      return {
        ...col,
        executedQty: totalExecutedQty,
        executedWeight: totalExecutedWeight,
        amount,
      };
    });
  };

  const executedData = calculateExecutedData();
  const totalExecutedWeight = executedData.reduce((sum, data) => sum + data.executedWeight, 0);
  const totalAmount = executedData.reduce((sum, data) => sum + data.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleGenerateRA = () => {
    // Collect all unlocked quantities to lock
    const dataToLock: Array<{rowId: string, breakupKey: string, qty: number, weight: number}> = [];
    
    breakupColumns.forEach(col => {
      measurementRows.forEach(row => {
        const status = row.breakupStatus[col.key];
        // Only lock quantities that are completed and NOT already locked
        if (status && !status.lockedInRA && status.completedQty && status.completedQty > 0 && status.completedWeight && status.completedWeight > 0) {
          dataToLock.push({
            rowId: row.id,
            breakupKey: col.key,
            qty: status.completedQty,
            weight: status.completedWeight,
          });
        }
      });
    });

    if (dataToLock.length === 0) {
      toast({
        title: "No Data to Lock",
        description: "There are no unlocked completed quantities to include in this RA bill.",
        variant: "destructive",
      });
      return;
    }

    onGenerateRA(raNumber, dataToLock);
    toast({
      title: "RA Bill Generated",
      description: `${raNumber} has been created and ${dataToLock.length} quantities are now locked.`,
    });
    setIsOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-elegant">
          <FileText className="mr-2 h-4 w-4" />
          Generate RA Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abstract Sheet - {raNumber}</DialogTitle>
          <DialogDescription>
            Running Account Bill for executed quantities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 print:text-black">
          {/* Header Information */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Project:</p>
                  <p className="font-semibold">{project.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Client:</p>
                  <p className="font-semibold">{project.clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Number:</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">RA Number:</p>
                  <p className="font-semibold text-primary">{raNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Abstract Sheet Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border p-2 text-left">PO Sr No</th>
                  <th className="border p-2 text-left">ITEM CODE</th>
                  <th className="border p-2 text-left">Item Description</th>
                  <th className="border p-2 text-center">Unit</th>
                  <th className="border p-2 text-center">Quantity</th>
                  <th className="border p-2 text-left">BILL BREAK UP AS PAR LOI</th>
                  <th className="border p-2 text-center">Break up %</th>
                  <th className="border p-2 text-right">Unit Rate</th>
                  <th className="border p-2 text-center" colSpan={2}>This Bill</th>
                  <th className="border p-2 text-left">REMARKS</th>
                </tr>
                <tr>
                  <th className="border p-2" colSpan={8}></th>
                  <th className="border p-2 text-center bg-muted">Executed Qty</th>
                  <th className="border p-2 text-center bg-muted">Amount</th>
                  <th className="border p-2"></th>
                </tr>
              </thead>
              <tbody>
                {/* Item Row */}
                <tr>
                  <td className="border p-2">1</td>
                  <td className="border p-2">{item.itemCode || '-'}</td>
                  <td className="border p-2">{item.description}</td>
                  <td className="border p-2 text-center">{item.unitOfMeasurement}</td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2">
                    {/* Breakup column */}
                    {executedData.map((data, idx) => (
                      <div key={idx} className="py-1">
                        {data.name}
                      </div>
                    ))}
                  </td>
                  <td className="border p-2 text-center">
                    {executedData.map((data, idx) => (
                      <div key={idx} className="py-1">
                        {data.percentage}%
                      </div>
                    ))}
                  </td>
                  <td className="border p-2 text-right" rowSpan={1}>
                    {formatCurrency(item.unitRate)}
                  </td>
                  <td className="border p-2 text-right">
                    {executedData.map((data, idx) => (
                      <div key={idx} className="py-1">
                        {data.executedWeight.toFixed(3)}
                      </div>
                    ))}
                  </td>
                  <td className="border p-2 text-right">
                    {executedData.map((data, idx) => (
                      <div key={idx} className="py-1">
                        {formatCurrency(data.amount)}
                      </div>
                    ))}
                  </td>
                  <td className="border p-2"></td>
                </tr>
                {/* Total Row */}
                <tr className="font-bold bg-muted">
                  <td className="border p-2" colSpan={8}>
                    TOTAL AMOUNT RS
                  </td>
                  <td className="border p-2 text-right">
                    {totalExecutedWeight.toFixed(3)}
                  </td>
                  <td className="border p-2 text-right">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Warning Message */}
          {totalExecutedWeight > 0 && (
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      Quantity Locking Notice
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      Once you generate this RA bill, all executed quantities shown above will be locked 
                      and cannot be modified. These quantities will not appear in future RA bills.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Download className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button 
              onClick={handleGenerateRA}
              disabled={totalExecutedWeight === 0}
            >
              <Lock className="mr-2 h-4 w-4" />
              Generate & Lock RA Bill
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
