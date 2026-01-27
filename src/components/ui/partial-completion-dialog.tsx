import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PartialCompletionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: string;
  totalQty: number;
  unit: number;
  totalWeight: number;
  currentCompletedQty: number;
  currentCompletedWeight: number;
  lockedQty: number;
  onComplete: (
    completedQty: number,
    completedWeight: number,
    date: string,
    reportNumber: string
  ) => void;
}

export function PartialCompletionDialog({
  isOpen,
  onOpenChange,
  milestone,
  totalQty,
  unit,
  totalWeight,
  currentCompletedQty,
  currentCompletedWeight,
  lockedQty,
  onComplete,
}: PartialCompletionDialogProps) {
  // State for TOTAL quantity completed
  const [totalCompletedQty, setTotalCompletedQty] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportNumber, setReportNumber] = useState("");

  // Calculate weight based on quantity
  const weightPerUnit = totalQty > 0 ? totalWeight / totalQty : 0;

  // Calculate values for display
  const newCompletedWeight = totalCompletedQty * weightPerUnit;
  const additionalQty = Math.max(0, totalCompletedQty - lockedQty);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Initialize with current completed quantity
      // If none, it starts at lockedQty (or 0 if nothing locked)
      // Actually normally it should start at 'currentCompletedQty' because that's the current state
      setTotalCompletedQty(currentCompletedQty);
      setDate(new Date().toISOString().split("T")[0]);
      setReportNumber("");
    }
  }, [isOpen, currentCompletedQty]);

  const handleComplete = () => {
    // Validation: total completed must be >= locked qty and <= total qty
    if (
      totalCompletedQty >= lockedQty &&
      totalCompletedQty !== currentCompletedQty &&
      totalCompletedQty <= totalQty
    ) {
      onComplete(totalCompletedQty, newCompletedWeight, date, reportNumber);
      onOpenChange(false);
    }
  };

  const maxAdditionalQty = totalQty - lockedQty; // Maximum additional quantity allowed

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Milestone Progress</DialogTitle>
          <DialogDescription>
            How much quantity is completed for "{milestone}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Quantity:</span>
              <p className="font-semibold">{totalQty.toFixed(0)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Weight:</span>
              <p className="font-semibold">{totalWeight.toFixed(3)} MT</p>
            </div>
            <div>
              <span className="text-muted-foreground">All-time Completed:</span>
              <p className="font-semibold">
                {currentCompletedQty.toFixed(0)} qty
              </p>
            </div>
          </div>

          {lockedQty > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Locked in Previous RA:</strong> {lockedQty.toFixed(0)}{" "}
                qty ({(lockedQty * weightPerUnit).toFixed(3)} MT)
                <br />
                <strong>Remaining Unlockable:</strong>{" "}
                {maxAdditionalQty.toFixed(0)} qty
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totalCompletedQty">
                Total Cumulative Quantity (Numbers)
              </Label>
              <Input
                id="totalCompletedQty"
                type="number"
                step="1"
                min={lockedQty}
                max={totalQty}
                value={totalCompletedQty}
                onChange={(e) =>
                  setTotalCompletedQty(parseFloat(e.target.value) || 0)
                }
                placeholder={`Enter total quantity (min: ${lockedQty}, max: ${totalQty})`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Must be at least: {lockedQty.toFixed(0)} (Locked)</span>
                <span>Max: {totalQty.toFixed(0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportNumber">Report Number</Label>
                <Input
                  id="reportNumber"
                  type="text"
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  placeholder="e.g. RPT-001"
                />
              </div>
            </div>

            {totalCompletedQty > lockedQty && (
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-sm space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  New Quantity to Lock: {additionalQty.toFixed(0)} qty
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  (Total {totalCompletedQty} - Locked {lockedQty})
                </p>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Total Weight: {newCompletedWeight.toFixed(3)} MT
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={
              totalCompletedQty < lockedQty ||
              totalCompletedQty > totalQty ||
              totalCompletedQty === currentCompletedQty
            }
          >
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
