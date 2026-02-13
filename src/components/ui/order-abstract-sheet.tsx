import { useState } from "react";
import { FileText, Download, Lock } from "lucide-react";
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
import { Item, MeasurementRow, Order, Project, RABill } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { raBillStorage } from "@/lib/storage";
import { generateBillPDF } from "@/lib/pdf-generator";

interface OrderAbstractSheetProps {
  project: Project;
  order: Order;
  items: Item[];
  allMeasurementRows: MeasurementRow[];
  onGenerateRA: (
    raNumber: string,
    lockedData: Array<{
      itemId: string;
      rowId: string;
      breakupKey: string;
      qty: number;
      weight: number;
      department: string;
      previousQty: number;
      previousWeight: number;
    }>,
  ) => void;
  existingRACount: number;
}

export function OrderAbstractSheet({
  project,
  order,
  items,
  allMeasurementRows,
  onGenerateRA,
  existingRACount,
}: OrderAbstractSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const raNumber = `RA-${String(existingRACount + 1).padStart(3, "0")}`;
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate executed data
  const executedData = items.map((item, index) => {
    const itemRows = allMeasurementRows.filter((row) => row.itemId === item.id);

    const breakupsData = (item.billingBreakup || []).map((breakup) => {
      const newKey = `${item.id}-${breakup.percentage}-${breakup.name}`;
      const legacyKey = `${breakup.percentage}%-${breakup.name}`;

      let previousWeight = 0;
      let completedWeight = 0;
      let cumulativeQty = 0;
      let completedQty = 0;

      itemRows.forEach((row) => {
        const status =
          row.breakupStatus?.[newKey] || row.breakupStatus?.[legacyKey];
        const department = item.department || "";

        // Determine the billing quantity based on department
        let billingQtyForRow = row.qty;

        if (department === "Piping-Spool Status") {
          // For Piping-Spool Status, use inchMeter for billing
          billingQtyForRow = Number(row.customFields?.inchMeter) || 0;
        } else if (department === "Piping Insulation") {
          // For Piping Insulation, use RMT for billing
          billingQtyForRow = Number(row.customFields?.rmt) || 0;
        } else if (department === "Equipment Insulation") {
          // For Equipment Insulation, use total quantity (area) directly
          billingQtyForRow = row.qty;
        }

        // For Piping-LHS, completedQty IS the weight, so we use it directly
        // For other departments, we calculate based on completedQty ratio
        const isWeightBasedDepartment = department === "Piping-LHS";

        // Previous = locked quantities from previous RA bills for THIS milestone
        const locked = status?.lockedQty || 0;
        if (isWeightBasedDepartment) {
          previousWeight += locked; // lockedQty IS the weight for Piping-LHS
        } else {
          previousWeight += locked; // For qty-based departments, locked is the qty/area/inchMeter
        }

        // Completed = quantities marked as completed for THIS milestone
        const completed = status?.completedQty || 0;
        if (isWeightBasedDepartment) {
          completedWeight += completed; // completedQty IS the weight for Piping-LHS
        } else {
          completedWeight += completed; // For qty-based departments, use qty directly
        }
        completedQty += completed;

        cumulativeQty += billingQtyForRow;
      });

      // Cumulative weight is based on completed quantities for this milestone
      const cumulativeWeight = completedWeight;

      // Apply breakup percentage to quantities for billing display
      // The quantity shown in bill should be proportional to the breakup percentage
      const breakupMultiplier = breakup.percentage / 100;

      // Previous certified qty = previous weight * breakup percentage
      const previousCertifiedQty = previousWeight;

      // Previous amount = previous weight * rate * breakup percentage
      const previousAmount = previousWeight * item.unitRate;

      // Executed weight = completed weight - already locked weight for THIS milestone
      const executedWeight = completedWeight - previousWeight;

      // Current certified qty = executed weight * breakup percentage
      const currentCertifiedQty = executedWeight;

      // Amount for this bill = executed weight * rate * breakup percentage
      const amount = executedWeight * item.unitRate;

      // Cumulative certified qty = cumulative weight * breakup percentage
      const cumulativeCertifiedQty = cumulativeWeight;

      // Cumulative amount includes milestone percentage
      const cumulativeAmount = cumulativeWeight * item.unitRate;

      return {
        breakupKey: newKey,
        name: breakup.name,
        percentage: breakup.percentage,
        previousWeight,
        previousCertifiedQty,
        previousAmount,
        executedWeight,
        currentCertifiedQty,
        amount,
        cumulativeWeight,
        cumulativeCertifiedQty,
        cumulativeAmount,
        cumulativeQty: completedQty,
      };
    });

    return {
      item,
      itemIndex: index + 1,
      breakupsData,
    };
  });

  // Calculate Grand Totals - using certified quantities (proportional)
  const grandTotalPreviousCertifiedQty = executedData.reduce(
    (sum, item) =>
      sum + item.breakupsData.reduce((s, b) => s + b.previousCertifiedQty, 0),
    0,
  );
  const grandTotalPreviousAmount = executedData.reduce(
    (sum, item) =>
      sum + item.breakupsData.reduce((s, b) => s + b.previousAmount, 0),
    0,
  );
  const grandTotalCurrentCertifiedQty = executedData.reduce(
    (sum, item) =>
      sum + item.breakupsData.reduce((s, b) => s + b.currentCertifiedQty, 0),
    0,
  );
  const grandTotalAmount = executedData.reduce(
    (sum, item) => sum + item.breakupsData.reduce((s, b) => s + b.amount, 0),
    0,
  );
  const grandTotalCumulativeCertifiedQty = executedData.reduce(
    (sum, item) =>
      sum + item.breakupsData.reduce((s, b) => s + b.cumulativeCertifiedQty, 0),
    0,
  );
  const grandTotalCumulativeAmount = executedData.reduce(
    (sum, item) =>
      sum + item.breakupsData.reduce((s, b) => s + b.cumulativeAmount, 0),
    0,
  );

  const handleGenerateRA = () => {
    // Collect all unlocked completed quantities to lock
    // Each milestone tracks independently - only lock completedQty for that specific milestone
    const dataToLock: Array<{
      itemId: string;
      rowId: string;
      breakupKey: string;
      qty: number;
      weight: number;
      department: string;
      previousQty: number;
      previousWeight: number;
    }> = [];

    executedData.forEach((itemData) => {
      // Get all measurement rows for this item
      const measurementRows = allMeasurementRows.filter(
        (row) => row.itemId === itemData.item.id,
      );

      itemData.breakupsData.forEach((breakupData) => {
        measurementRows.forEach((row) => {
          const newKey = breakupData.breakupKey;
          const legacyKey = `${breakupData.percentage}%-${breakupData.name}`;
          const status =
            row.breakupStatus?.[newKey] || row.breakupStatus?.[legacyKey];

          const alreadyLocked = status?.lockedQty || 0;
          // Only lock the completedQty for THIS specific milestone, not full row.qty
          const completedQty = status?.completedQty || 0;

          // Qty to lock = completedQty - already locked for this milestone
          const qtyToLock = completedQty - alreadyLocked;

          if (qtyToLock > 0) {
            // Calculate weight for this qty
            const weightPerUnit = row.qty > 0 ? row.totalWeight / row.qty : 0;
            const weightToLock = qtyToLock * weightPerUnit;

            dataToLock.push({
              itemId: itemData.item.id,
              rowId: row.id,
              breakupKey: newKey,
              qty: qtyToLock,
              weight: weightToLock,
              department: row.department,
              previousQty: alreadyLocked,
              previousWeight: alreadyLocked * weightPerUnit,
            });
          }
        });
      });
    });

    if (dataToLock.length === 0) {
      toast({
        title: "No Data to Lock",
        description: "All quantities are already locked in previous RA bills.",
        variant: "destructive",
      });
      return;
    }

    onGenerateRA(raNumber, dataToLock);
    toast({
      title: "RA Bill Generated",
      description: `${raNumber} has been created and ${dataToLock.length} row quantities are now locked.`,
    });
    setIsOpen(false);
  };

  const handlePrint = async () => {
    try {
      const filename = `${raNumber}_${project.name.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      await generateBillPDF("abstract-sheet-content", filename);
      toast({
        title: "PDF Generated Successfully",
        description: "Your bill has been saved as PDF.",
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderMeasurementTable = (
    item: Item,
    itemRows: MeasurementRow[],
    allMilestones: { percentage: number; name: string; key: string }[],
  ) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-sm">
          <thead>
            {item.department === "Piping-LHS" ? (
              <tr className="bg-muted">
                <th className="border p-2 text-center">S.NO.</th>
                <th className="border p-2 text-center">Area</th>
                <th className="border p-2 text-center">DOC. NO.</th>
                <th className="border p-2 text-center">LINE NO.</th>
                <th className="border p-2 text-center">SHEET NO</th>
                <th className="border p-2 text-center">Rev</th>
                <th className="border p-2 text-center">MOC</th>
                <th className="border p-2 text-center">FJ/SJ</th>
                <th className="border p-2 text-center">Joint No.</th>
                <th className="border p-2 text-center">SPOOL NO.</th>
                <th className="border p-2 text-center">Dia (Inch)</th>
                <th className="border p-2 text-center">Thick (MM)</th>
                <th className="border p-2 text-center">Schedule</th>
                <th className="border p-2 text-center">Joint Type</th>
                <th className="border p-2 text-center">Comp Part 1</th>
                <th className="border p-2 text-center">Comp Part 2</th>
                <th className="border p-2 text-right">
                  Total ({item.unitOfMeasurement || "MT"})
                </th>
                {allMilestones.map((milestone, idx) => (
                  <th key={idx} className="border p-2 text-center text-xs">
                    {milestone.percentage}% {milestone.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Equipment Insulation" ? (
              <tr className="bg-muted">
                <th className="border p-2 text-center">SR. NO</th>
                <th className="border p-2 text-center">Eqp No</th>
                <th className="border p-2 text-center">Eqp Name</th>
                <th className="border p-2 text-center">Portion</th>
                <th className="border p-2 text-center">Position</th>
                <th className="border p-2 text-center">Temp (°C)</th>
                <th className="border p-2 text-center">MOC</th>
                <th className="border p-2 text-center">Ins Type</th>
                <th className="border p-2 text-center">Thk (mm)</th>
                <th className="border p-2 text-center">Ins Dia (m)</th>
                <th className="border p-2 text-center">H/L (m)</th>
                <th className="border p-2 text-right">Shell Area</th>
                <th className="border p-2 text-center">Dish Factor</th>
                <th className="border p-2 text-center">Dish Ends</th>
                <th className="border p-2 text-right">Dish Area</th>
                <th className="border p-2 text-right">Other Area</th>
                <th className="border p-2 text-right">Total Area</th>
                {allMilestones.map((milestone, idx) => (
                  <th key={idx} className="border p-2 text-center text-xs">
                    {milestone.percentage}% {milestone.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Piping Insulation" ? (
              <tr className="bg-muted">
                <th className="border p-2 text-center">Sr.</th>
                <th className="border p-2 text-center">Loc</th>
                <th className="border p-2 text-center">Drg No.</th>
                <th className="border p-2 text-center">Sht No.</th>
                <th className="border p-2 text-center">MOC</th>
                <th className="border p-2 text-center">Line Size</th>
                <th className="border p-2 text-center">Pipe OD</th>
                <th className="border p-2 text-center">Ins Thk</th>
                <th className="border p-2 text-center">Ins Type</th>
                <th className="border p-2 text-center">Temp</th>
                <th className="border p-2 text-center">Pipe Len</th>
                <th className="border p-2 text-center">90°</th>
                <th className="border p-2 text-center">45°</th>
                <th className="border p-2 text-center">Tee</th>
                <th className="border p-2 text-center">Red</th>
                <th className="border p-2 text-center">Cap</th>
                <th className="border p-2 text-center">Flg Rem</th>
                <th className="border p-2 text-center">Vlv Rem</th>
                <th className="border p-2 text-center">Flg Fix</th>
                <th className="border p-2 text-center">Vlv Fix</th>
                <th className="border p-2 text-center">Weld Vlv</th>
                <th className="border p-2 text-center">Fit Len</th>
                <th className="border p-2 text-center">RMT</th>
                <th className="border p-2 text-center">Area</th>
                {allMilestones.map((milestone, idx) => (
                  <th key={idx} className="border p-2 text-center text-xs">
                    {milestone.percentage}% {milestone.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Structure" ? (
              <tr className="bg-muted">
                <th className="border p-2 text-center">Sr.</th>
                <th className="border p-2 text-center">Desc</th>
                <th className="border p-2 text-center">Type</th>
                <th className="border p-2 text-center">Mark No.</th>
                <th className="border p-2 text-center">Unit Wt</th>
                <th className="border p-2 text-center">Length</th>
                <th className="border p-2 text-center">Width</th>
                <th className="border p-2 text-center">Thk</th>
                <th className="border p-2 text-center">Qty</th>
                <th className="border p-2 text-right">
                  Total ({item.unitOfMeasurement || "MT"})
                </th>
                {allMilestones.map((milestone, idx) => (
                  <th key={idx} className="border p-2 text-center text-xs">
                    {milestone.percentage}% {milestone.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Piping-Spool Status" ? (
              <tr className="bg-muted">
                <th className="border p-2 text-center">Sr.</th>
                <th className="border p-2 text-center">Area</th>
                <th className="border p-2 text-center">Drg No</th>
                <th className="border p-2 text-center">Rev</th>
                <th className="border p-2 text-center">Sheet</th>
                <th className="border p-2 text-center">Spool</th>
                <th className="border p-2 text-center">Size</th>
                <th className="border p-2 text-center">Mat</th>
                <th className="border p-2 text-center">Len</th>
                <th className="border p-2 text-center">InchMtr</th>
                <th className="border p-2 text-center">SurfArea</th>
                <th className="border p-2 text-center">Paint</th>
                <th className="border p-2 text-center">Rem</th>
                {allMilestones.map((milestone, idx) => (
                  <th key={idx} className="border p-2 text-center text-xs">
                    {milestone.percentage}% {milestone.name}
                  </th>
                ))}
              </tr>
            ) : (
              <tr className="bg-muted">
                <th className="border p-2 text-center">Sr. No.</th>
                <th className="border p-2 text-center">Mark No.</th>
                <th className="border p-2 text-center">Section</th>
                <th className="border p-2 text-center">Qty</th>
                <th className="border p-2 text-center">Length (Mtr)</th>
                <th className="border p-2 text-center">Width (Mtr)</th>
                <th className="border p-2 text-center">Thickness (mm)</th>
                <th className="border p-2 text-center">Unit Weight</th>
                <th className="border p-2 text-center">
                  Total (Wt) Product(D×G)
                </th>
                {allMilestones.map((milestone, idx) => (
                  <th key={idx} className="border p-2 text-center text-xs">
                    {milestone.percentage}% {milestone.name}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {itemRows.map((row, rowIndex) => {
              // Get breakup statuses for this row using all detected milestones
              const breakupStatuses = allMilestones.map((milestone) => {
                const status = row.breakupStatus[milestone.key];
                return {
                  percentage: milestone.percentage,
                  name: milestone.name,
                  status: status || {
                    done: false,
                    completedQty: 0,
                    completedWeight: 0,
                    lockedQty: 0,
                  },
                };
              });

              const commonMilestoneCells = breakupStatuses.map(
                (breakupStatus, idx) => {
                  // Apply breakup percentage to the displayed quantity
                  const proportionalQty =
                    breakupStatus.status.completedQty *
                    (breakupStatus.percentage / 100);
                  return (
                    <td key={idx} className="border p-2 text-center">
                      {breakupStatus.status.done ? (
                        <span className="text-green-600 font-medium">Done</span>
                      ) : breakupStatus.status.completedQty >
                        breakupStatus.status.lockedQty ? (
                        <span className="text-blue-600 font-medium">
                          {proportionalQty.toFixed(3)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  );
                },
              );

              if (item.department === "Piping-LHS") {
                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{rowIndex + 1}</td>
                    <td className="border p-2 text-center">
                      {row.area || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.docNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.lineNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.sheetNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.rev || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.moc || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.fjSj || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.jointNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.spoolNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.width ? Number(row.width).toFixed(3) : "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.thickness ? Number(row.thickness).toFixed(3) : "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.schedule || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.jointType || "-"}
                    </td>
                    <td className="border p-2 text-center">{row.type}</td>
                    <td className="border p-2 text-center">
                      {row.customFields?.componentPart2 || "-"}
                    </td>
                    <td className="border p-2 text-center font-medium">
                      {row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Equipment Insulation") {
                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{rowIndex + 1}</td>
                    <td className="border p-2 text-center">
                      {row.customFields?.equipmentNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.equipmentName || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.portion || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.position || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.temp || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.moc || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.insulationType || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.thickness || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.insulatedDia || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.length || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.shellArea
                        ? parseFloat(
                            String(row.customFields.shellArea),
                          ).toFixed(3)
                        : "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.dishFactor || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.dishEndNos || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.dishArea
                        ? parseFloat(String(row.customFields.dishArea)).toFixed(
                            3,
                          )
                        : "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.otherArea || "-"}
                    </td>
                    <td className="border p-2 text-center font-medium">
                      {row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Piping Insulation") {
                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{rowIndex + 1}</td>
                    <td className="border p-2 text-center">
                      {row.customFields?.location || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.drawingNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.sheetNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.moc || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.lineSize || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.pipeOD || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.insulationThickness || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.insulationType || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.temp || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.length || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyElbow90 || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyElbow45 || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyTee || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyReducer || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyEndCap || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyFlangeRem || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyValveRem || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyFlangeFix || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyValveFix || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.qtyWeldValveFix || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.totalFittingsLength || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.rmt || "-"}
                    </td>
                    <td className="border p-2 text-center font-medium">
                      {row.customFields?.area || row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Structure") {
                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{rowIndex + 1}</td>
                    <td className="border p-2 text-center">{row.type}</td>
                    <td className="border p-2 text-center">
                      {row.customFields?.structureType || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.mark || "-"}
                    </td>
                    <td className="border p-2 text-center">{row.unit}</td>
                    <td className="border p-2 text-center">{row.length}</td>
                    <td className="border p-2 text-center">{row.width}</td>
                    <td className="border p-2 text-center">{row.thickness}</td>
                    <td className="border p-2 text-center">{row.qty}</td>
                    <td className="border p-2 text-center font-medium">
                      {row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Piping-Spool Status") {
                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{rowIndex + 1}</td>
                    <td className="border p-2 text-center">
                      {row.area || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.drawingNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.revNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.sheetNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.spoolNo || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.lineSize || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.baseMaterial || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.length || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.inchMeter || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.surfaceArea || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.paintSystem || "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.customFields?.remarks || "-"}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else {
                return (
                  <tr key={row.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-center">{rowIndex + 1}</td>
                    <td className="border p-2 text-center">{row.mark}</td>
                    <td className="border p-2 text-center">{row.type}</td>
                    <td className="border p-2 text-center">{row.qty}</td>
                    <td className="border p-2 text-center">
                      {(Number(row.length) || 0).toFixed(1)}
                    </td>
                    <td className="border p-2 text-center">
                      {row.width ? (Number(row.width) || 0).toFixed(1) : "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {row.thickness
                        ? (Number(row.thickness) || 0).toFixed(1)
                        : "-"}
                    </td>
                    <td className="border p-2 text-center">
                      {(Number(row.unit) || 0).toFixed(3)}
                    </td>
                    <td className="border p-2 text-center font-medium">
                      {(Number(row.totalWeight) || 0).toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              }
            })}

            {/* Item Subtotal Row */}
            <tr className="font-bold bg-primary/5">
              <td
                className="border p-2"
                colSpan={
                  item.department === "Piping-LHS"
                    ? 16
                    : item.department === "Equipment Insulation"
                      ? 16
                      : item.department === "Piping Insulation"
                        ? 23
                        : item.department === "Structure"
                          ? 9
                          : item.department === "Piping-Spool Status"
                            ? 13
                            : 8
                }
              >
                SUBTOTAL - {item.itemCode || "N/A"}
              </td>
              {item.department !== "Piping-Spool Status" && (
                <td className="border p-2 text-center">
                  {itemRows
                    .reduce((sum, row) => sum + row.totalWeight, 0)
                    .toFixed(3)}
                </td>
              )}
              {/* Calculate subtotals for each milestone with proportional quantities */}
              {allMilestones.map((milestone, idx) => {
                const subtotalCompleted = itemRows.reduce((sum, row) => {
                  const status = row.breakupStatus[milestone.key];
                  const rawQty =
                    status.completedQty > status.lockedQty && !status.done
                      ? status?.completedWeight || 0
                      : 0;
                  // Apply breakup percentage for proportional display
                  return sum + rawQty * (milestone.percentage / 100);
                }, 0);

                return (
                  <td key={idx} className="border p-2 text-center">
                    {subtotalCompleted > 0 ? subtotalCompleted.toFixed(3) : "-"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-elegant">
          <FileText className="mr-2 h-4 w-4" />
          Generate RA Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abstract Sheet - {raNumber}</DialogTitle>
          <DialogDescription>
            Running Account Bill for executed quantities
          </DialogDescription>
        </DialogHeader>

        <div id="abstract-sheet-content" className="space-y-4 print:text-black">
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
                  <p className="font-semibold">
                    {order.orderCode || order.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">RA Number:</p>
                  <p className="font-semibold text-primary">{raNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Abstract Sheet Table */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th
                    className="border p-2 text-left whitespace-nowrap"
                    rowSpan={2}
                  >
                    PO Sr No
                  </th>
                  <th
                    className="border p-2 text-left whitespace-nowrap"
                    rowSpan={2}
                  >
                    ITEM CODE
                  </th>
                  <th
                    className="border p-2 text-left min-w-[200px]"
                    rowSpan={2}
                  >
                    Item Description
                  </th>
                  <th
                    className="border p-2 text-center whitespace-nowrap"
                    rowSpan={2}
                  >
                    Unit
                  </th>
                  <th
                    className="border p-2 text-center whitespace-nowrap"
                    rowSpan={2}
                  >
                    Quantity
                  </th>
                  <th
                    className="border p-2 text-left whitespace-nowrap"
                    rowSpan={2}
                  >
                    BILL BREAK UP AS PAR LOI
                  </th>
                  <th
                    className="border p-2 text-center whitespace-nowrap"
                    rowSpan={2}
                  >
                    Break up %
                  </th>
                  <th
                    className="border p-2 text-right whitespace-nowrap"
                    rowSpan={2}
                  >
                    Unit Rate
                  </th>
                  <th
                    className="border p-2 text-center whitespace-nowrap"
                    colSpan={2}
                  >
                    Previous Bill
                  </th>
                  <th
                    className="border p-2 text-center whitespace-nowrap"
                    colSpan={2}
                  >
                    This Bill
                  </th>
                  <th
                    className="border p-2 text-center whitespace-nowrap"
                    colSpan={2}
                  >
                    Cumm. Bill
                  </th>
                  <th
                    className="border p-2 text-left whitespace-nowrap"
                    rowSpan={2}
                  >
                    REMARKS
                  </th>
                </tr>
                <tr>
                  <th className="border p-2 text-center bg-muted whitespace-nowrap">
                    Certified Qty
                  </th>
                  <th className="border p-2 text-center bg-muted whitespace-nowrap">
                    Amount
                  </th>
                  <th className="border p-2 text-center bg-muted whitespace-nowrap">
                    Certified Qty
                  </th>
                  <th className="border p-2 text-center bg-muted whitespace-nowrap">
                    Amount
                  </th>
                  <th className="border p-2 text-center bg-muted whitespace-nowrap">
                    Certified Qty
                  </th>
                  <th className="border p-2 text-center bg-muted whitespace-nowrap">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {executedData.map((itemData) => (
                  <tr key={itemData.item.id}>
                    <td className="border p-2">{itemData.itemIndex}</td>
                    <td className="border p-2 whitespace-nowrap">
                      {itemData.item.itemCode || "-"}
                    </td>
                    <td className="border p-2">{itemData.item.description}</td>
                    <td className="border p-2 text-center whitespace-nowrap">
                      {itemData.item.unitOfMeasurement}
                    </td>
                    <td className="border p-2 text-center">
                      {itemData.item.quantity}
                    </td>
                    <td className="border p-2">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {breakup.name}
                        </div>
                      ))}
                    </td>
                    {/* BREAK UP */}
                    <td className="border p-2 text-center">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {breakup.percentage}%
                        </div>
                      ))}
                    </td>
                    {/*  UNIT RATE */}
                    <td className="border p-2 text-right whitespace-nowrap">
                      {formatCurrency(itemData.item.unitRate)}
                    </td>
                    {/* Previous Bill - Certified Qty */}
                    <td className="border p-2 text-right">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {breakup.previousCertifiedQty.toFixed(3)}
                        </div>
                      ))}
                    </td>
                    {/* Previous Bill - Amount */}
                    <td className="border p-2 text-right">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {formatCurrency(breakup.previousAmount)}
                        </div>
                      ))}
                    </td>
                    {/* This Bill - Certified Qty */}
                    <td className="border p-2 text-right">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {breakup.currentCertifiedQty.toFixed(3)}
                        </div>
                      ))}
                    </td>
                    {/* This Bill - Amount */}
                    <td className="border p-2 text-right">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {formatCurrency(breakup.amount)}
                        </div>
                      ))}
                    </td>
                    {/* Cumulative Bill - Certified Qty */}
                    <td className="border p-2 text-right">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {breakup.cumulativeCertifiedQty.toFixed(3)}
                        </div>
                      ))}
                    </td>
                    {/* Cumulative Bill - Amount */}
                    <td className="border p-2 text-right">
                      {itemData.breakupsData.map((breakup, idx) => (
                        <div
                          key={idx}
                          className="py-0.5 border-b last:border-b-0"
                        >
                          {formatCurrency(breakup.cumulativeAmount)}
                        </div>
                      ))}
                    </td>
                    <td className="border p-2"></td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="font-bold bg-muted">
                  <td className="border p-2" colSpan={8}>
                    TOTAL AMOUNT RS
                  </td>
                  <td className="border p-2 text-right whitespace-nowrap">
                    {grandTotalPreviousCertifiedQty.toFixed(3)}
                  </td>
                  <td className="border p-2 text-right whitespace-nowrap">
                    {formatCurrency(grandTotalPreviousAmount)}
                  </td>
                  <td className="border p-2 text-right whitespace-nowrap">
                    {grandTotalCurrentCertifiedQty.toFixed(3)}
                  </td>
                  <td className="border p-2 text-right whitespace-nowrap">
                    {formatCurrency(grandTotalAmount)}
                  </td>
                  <td className="border p-2 text-right whitespace-nowrap">
                    {grandTotalCumulativeCertifiedQty.toFixed(3)}
                  </td>
                  <td className="border p-2 text-right whitespace-nowrap">
                    {formatCurrency(grandTotalCumulativeAmount)}
                  </td>
                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Measurement Summary by Item */}
          <div className="mt-8 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Measurement Sheet Summary
            </h3>

            {items.map((item, itemIndex) => {
              // Filter measurement rows for this specific item that have updates
              const itemRows = allMeasurementRows.filter((row) => {
                return (
                  row.itemId === item.id &&
                  Object.values(row.breakupStatus).some(
                    (status) =>
                      status.completedQty &&
                      status.completedQty > 0 &&
                      !status.done &&
                      status.completedQty > status.lockedQty,
                  )
                );
              });

              if (itemRows.length === 0) return null;

              // Get milestone columns from this specific item's measurement data
              // This ensures we show milestones that actually exist in the data for this item
              const itemSpecificMilestoneKeys = new Set<string>();

              // Collect all milestone keys that exist in the measurement data for this specific item
              itemRows.forEach((row) => {
                Object.keys(row.breakupStatus).forEach((key) => {
                  itemSpecificMilestoneKeys.add(key);
                });
              });

              // Convert milestone keys to structured data
              const allMilestones = Array.from(itemSpecificMilestoneKeys)
                .filter((key) => {
                  // Only show milestones relevant to this item (new format) or legacy keys
                  return key.startsWith(`${item.id}-`) || /^\d+%?-/.test(key);
                })
                .map((key) => {
                  const parts = key.split("-");

                  // New format: itemId-percentage-name
                  if (key.startsWith(`${item.id}-`) && parts.length >= 3) {
                    const percentage = Number(parts[1]);
                    const name = parts.slice(2).join("-");
                    return { percentage, name, key };
                  }

                  // Legacy format: percentage%-name (or percentage-name)
                  const raw = parts[0].endsWith("%")
                    ? parts[0].replace("%", "")
                    : parts[0];
                  const percentage = Number(raw);
                  const name = parts.slice(1).join("-");
                  return { percentage, name, key };
                })
                .filter((m) => Number.isFinite(m.percentage) && m.name.trim());

              return (
                <div key={item.id} className="mb-6">
                  {/* Item Header */}
                  <div className="bg-primary/10 p-3 rounded-t-lg border">
                    <h4 className="font-semibold text-foreground">
                      Item {itemIndex + 1}: {item.itemCode || "N/A"} -{" "}
                      {item.description}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Department: {item.department} | Unit:{" "}
                      {item.unitOfMeasurement}
                    </p>
                  </div>

                  {/* Item Measurement Table */}
                  {renderMeasurementTable(item, itemRows, allMilestones)}
                </div>
              );
            })}

            {/* Grand Total Summary */}
            {(() => {
              // Get all unique milestone columns from ALL measurement data
              const allGrandTotalMilestoneKeys = new Set<string>();
              allMeasurementRows
                .filter((row) =>
                  Object.values(row.breakupStatus).some(
                    (status) => status.completedQty && status.completedQty > 0,
                  ),
                )
                .forEach((row) => {
                  Object.keys(row.breakupStatus).forEach((key) => {
                    allGrandTotalMilestoneKeys.add(key);
                  });
                });

              // Convert milestone keys to structured data
              const allGrandTotalMilestones = Array.from(
                allGrandTotalMilestoneKeys,
              )
                .map((key) => {
                  const parts = key.split("-");
                  const percentage = parseInt(parts[0].replace("%", ""));
                  const name = parts.slice(1).join("-");
                  return { percentage, name, key };
                })
                .sort((a, b) => a.percentage - b.percentage);

              return (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-bold text-foreground mb-2">
                    GRAND TOTAL - ALL ITEMS
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Total Weight:
                      </span>
                      <span className="font-semibold ml-2">
                        {allMeasurementRows
                          .filter((row) =>
                            Object.values(row.breakupStatus).some(
                              (status) =>
                                status.completedQty && status.completedQty > 0,
                            ),
                          )
                          .reduce((sum, row) => sum + row.totalWeight, 0)
                          .toFixed(3)}{" "}
                        MT
                      </span>
                    </div>
                    {allGrandTotalMilestones.map((milestone, idx) => {
                      const totalCompleted = allMeasurementRows
                        .filter((row) =>
                          Object.values(row.breakupStatus).some(
                            (status) =>
                              status.completedQty && status.completedQty > 0,
                          ),
                        )
                        .reduce((sum, row) => {
                          const status = row.breakupStatus[milestone.key];
                          return sum + (status?.completedWeight || 0);
                        }, 0);

                      return (
                        <div key={idx}>
                          <span className="text-muted-foreground">
                            {milestone.percentage}% Milestone:
                          </span>
                          <span className="font-semibold ml-2">
                            {totalCompleted > 0
                              ? `${totalCompleted.toFixed(3)} MT`
                              : "-"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Warning Message */}
          {grandTotalCurrentCertifiedQty > 0 && (
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 print:hidden">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      Quantity Locking Notice
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      Once you generate this RA bill, all executed quantities
                      shown above will be locked and cannot be modified. These
                      quantities will not appear in future RA bills.
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
              disabled={grandTotalCurrentCertifiedQty === 0}
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
