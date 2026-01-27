import { Project, Order, Item, MeasurementRow, RABill } from "@/types";
import {
  generateBillPDF,
  generateSegmentedMultiPageBillPDF,
} from "@/lib/pdf-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BillDisplayProps {
  project: Project;
  order: Order;
  items: Item[];
  measurementRows: MeasurementRow[];
  raBill: RABill;
}

export function BillDisplay({
  project,
  order,
  items,
  measurementRows,
  raBill,
}: BillDisplayProps) {
  const handlePrint = async () => {
    try {
      const filename = `${raBill.raNumber}_${project.name.replace(
        /\s+/g,
        "_"
      )}_${new Date().toISOString().split("T")[0]}.pdf`;
      // Use segmented multi-page PDF generation to split Abstract and Measurement sheets
      await generateSegmentedMultiPageBillPDF(
        ["bill-abstract-section", "bill-measurement-section"],
        filename
      );
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF generation failed. Please try again.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace("₹", "₹");
  };

  // Calculate bill data based on locked data from the RA bill
  const calculateBillData = () => {
    const itemsData = items.map((item, itemIndex) => {
      const breakupsData = item.billingBreakup.map((breakup) => {
        const newKey = `${item.id}-${breakup.percentage}-${breakup.name}`;
        const legacyKey = `${breakup.percentage}%-${breakup.name}`;

        // Find locked data for this item and breakup (support new + legacy keys)
        const lockedEntries = raBill.lockedData.filter(
          (locked) =>
            locked.itemId === item.id &&
            (locked.breakupKey === newKey || locked.breakupKey === legacyKey)
        );

        const totalExecutedWeight = lockedEntries.reduce(
          (sum, entry) => sum + entry.executedWeight,
          0
        );
        const totalExecutedQty = lockedEntries.reduce(
          (sum, entry) => sum + entry.executedQty,
          0
        );

        // Calculate previous totals
        const totalPreviousWeight = lockedEntries.reduce(
          (sum, entry) => sum + (entry.previousWeight || 0),
          0
        );
        const totalPreviousQty = lockedEntries.reduce(
          (sum, entry) => sum + (entry.previousQty || 0),
          0
        );

        // Amount = Executed Weight * Unit Rate * (Milestone % / 100)
        const amount =
          (totalExecutedWeight * item.unitRate * breakup.percentage) / 100;
        const previousAmount =
          (totalPreviousWeight * item.unitRate * breakup.percentage) / 100;

        return {
          breakupKey: newKey,
          name: breakup.name,
          percentage: breakup.percentage,
          executedQty: totalExecutedQty,
          executedWeight: totalExecutedWeight,
          amount,
          previousQty: totalPreviousQty,
          previousWeight: totalPreviousWeight,
          previousAmount,
          cumulativeQty: totalPreviousQty + totalExecutedQty,
          cumulativeWeight: totalPreviousWeight + totalExecutedWeight,
          cumulativeAmount: previousAmount + amount,
        };
      });

      return {
        item,
        itemIndex: itemIndex + 1,
        breakupsData,
      };
    });

    return itemsData;
  };

  const itemsData = calculateBillData();

  // Calculate grand totals
  const grandTotalWeight = itemsData.reduce(
    (sum, itemData) =>
      sum +
      itemData.breakupsData.reduce(
        (itemSum, breakup) => itemSum + breakup.executedWeight,
        0
      ),
    0
  );

  const grandTotalAmount = itemsData.reduce(
    (sum, itemData) =>
      sum +
      itemData.breakupsData.reduce(
        (itemSum, breakup) => itemSum + breakup.amount,
        0
      ),
    0
  );

  const grandTotalPreviousWeight = itemsData.reduce(
    (sum, itemData) =>
      sum +
      itemData.breakupsData.reduce(
        (itemSum, breakup) => itemSum + breakup.previousWeight,
        0
      ),
    0
  );

  const grandTotalPreviousAmount = itemsData.reduce(
    (sum, itemData) =>
      sum +
      itemData.breakupsData.reduce(
        (itemSum, breakup) => itemSum + breakup.previousAmount,
        0
      ),
    0
  );

  const grandTotalCumulativeWeight = itemsData.reduce(
    (sum, itemData) =>
      sum +
      itemData.breakupsData.reduce(
        (itemSum, breakup) => itemSum + breakup.cumulativeWeight,
        0
      ),
    0
  );

  const grandTotalCumulativeAmount = itemsData.reduce(
    (sum, itemData) =>
      sum +
      itemData.breakupsData.reduce(
        (itemSum, breakup) => itemSum + breakup.cumulativeAmount,
        0
      ),
    0
  );

  const renderMeasurementTable = (item: Item, itemRows: MeasurementRow[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            {item.department === "Piping-LHS" ? (
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">S.NO.</th>
                <th className="border border-black p-2 text-center">Area</th>
                <th className="border border-black p-2 text-center">
                  DOC. NO.
                </th>
                <th className="border border-black p-2 text-center">
                  LINE NO.
                </th>
                <th className="border border-black p-2 text-center">
                  SHEET NO
                </th>
                <th className="border border-black p-2 text-center">Rev</th>
                <th className="border border-black p-2 text-center">MOC</th>
                <th className="border border-black p-2 text-center">FJ/SJ</th>
                <th className="border border-black p-2 text-center">
                  Joint No.
                </th>
                <th className="border border-black p-2 text-center">
                  SPOOL NO.
                </th>
                <th className="border border-black p-2 text-center">
                  Dia (Inch)
                </th>
                <th className="border border-black p-2 text-center">
                  Thick (MM)
                </th>
                <th className="border border-black p-2 text-center">
                  Schedule
                </th>
                <th className="border border-black p-2 text-center">
                  Joint Type
                </th>
                <th className="border border-black p-2 text-center">
                  Comp Part 1
                </th>
                <th className="border border-black p-2 text-center">
                  Comp Part 2
                </th>
                <th className="border border-black p-2 text-right">
                  Total ({item.unitOfMeasurement || "MT"})
                </th>
                {item.billingBreakup.map((breakup, idx) => (
                  <th
                    key={idx}
                    className="border border-black p-2 text-center text-xs"
                  >
                    {breakup.percentage}% {breakup.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Equipment Insulation" ? (
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">SR. NO</th>
                <th className="border border-black p-2 text-center">Eqp No</th>
                <th className="border border-black p-2 text-center">
                  Eqp Name
                </th>
                <th className="border border-black p-2 text-center">Portion</th>
                <th className="border border-black p-2 text-center">
                  Position
                </th>
                <th className="border border-black p-2 text-center">
                  Temp (°C)
                </th>
                <th className="border border-black p-2 text-center">MOC</th>
                <th className="border border-black p-2 text-center">
                  Ins Type
                </th>
                <th className="border border-black p-2 text-center">
                  Thk (mm)
                </th>
                <th className="border border-black p-2 text-center">
                  Ins Dia (m)
                </th>
                <th className="border border-black p-2 text-center">H/L (m)</th>
                <th className="border border-black p-2 text-right">
                  Shell Area
                </th>
                <th className="border border-black p-2 text-center">
                  Dish Factor
                </th>
                <th className="border border-black p-2 text-center">
                  Dish Ends
                </th>
                <th className="border border-black p-2 text-right">
                  Dish Area
                </th>
                <th className="border border-black p-2 text-right">
                  Other Area
                </th>
                <th className="border border-black p-2 text-right">
                  Total Area
                </th>
                {item.billingBreakup.map((breakup, idx) => (
                  <th
                    key={idx}
                    className="border border-black p-2 text-center text-xs"
                  >
                    {breakup.percentage}% {breakup.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Piping Insulation" ? (
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">Sr.</th>
                <th className="border border-black p-2 text-center">Loc</th>
                <th className="border border-black p-2 text-center">Drg No.</th>
                <th className="border border-black p-2 text-center">Sht No.</th>
                <th className="border border-black p-2 text-center">MOC</th>
                <th className="border border-black p-2 text-center">
                  Line Size
                </th>
                <th className="border border-black p-2 text-center">Pipe OD</th>
                <th className="border border-black p-2 text-center">Ins Thk</th>
                <th className="border border-black p-2 text-center">
                  Ins Type
                </th>
                <th className="border border-black p-2 text-center">Temp</th>
                <th className="border border-black p-2 text-center">
                  Pipe Len
                </th>
                <th className="border border-black p-2 text-center">90°</th>
                <th className="border border-black p-2 text-center">45°</th>
                <th className="border border-black p-2 text-center">Tee</th>
                <th className="border border-black p-2 text-center">Red</th>
                <th className="border border-black p-2 text-center">Cap</th>
                <th className="border border-black p-2 text-center">Flg Rem</th>
                <th className="border border-black p-2 text-center">Vlv Rem</th>
                <th className="border border-black p-2 text-center">Flg Fix</th>
                <th className="border border-black p-2 text-center">Vlv Fix</th>
                <th className="border border-black p-2 text-center">
                  Weld Vlv
                </th>
                <th className="border border-black p-2 text-center">Fit Len</th>
                <th className="border border-black p-2 text-center">RMT</th>
                <th className="border border-black p-2 text-center">Area</th>
                {item.billingBreakup.map((breakup, idx) => (
                  <th
                    key={idx}
                    className="border border-black p-2 text-center text-xs"
                  >
                    {breakup.percentage}% {breakup.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Structure" ? (
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">Sr.</th>
                <th className="border border-black p-2 text-center">Desc</th>
                <th className="border border-black p-2 text-center">Type</th>
                <th className="border border-black p-2 text-center">
                  Mark No.
                </th>
                <th className="border border-black p-2 text-center">Unit Wt</th>
                <th className="border border-black p-2 text-center">Length</th>
                <th className="border border-black p-2 text-center">Width</th>
                <th className="border border-black p-2 text-center">Thk</th>
                <th className="border border-black p-2 text-center">Qty</th>
                <th className="border border-black p-2 text-right">
                  Total ({item.unitOfMeasurement || "MT"})
                </th>
                {item.billingBreakup.map((breakup, idx) => (
                  <th
                    key={idx}
                    className="border border-black p-2 text-center text-xs"
                  >
                    {breakup.percentage}% {breakup.name}
                  </th>
                ))}
              </tr>
            ) : item.department === "Piping-Spool Status" ? (
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">Sr.</th>
                <th className="border border-black p-2 text-center">Area</th>
                <th className="border border-black p-2 text-center">Drg No</th>
                <th className="border border-black p-2 text-center">Rev</th>
                <th className="border border-black p-2 text-center">Sheet</th>
                <th className="border border-black p-2 text-center">Spool</th>
                <th className="border border-black p-2 text-center">Size</th>
                <th className="border border-black p-2 text-center">Mat</th>
                <th className="border border-black p-2 text-center">Len</th>
                <th className="border border-black p-2 text-center">InchMtr</th>
                <th className="border border-black p-2 text-center">
                  SurfArea
                </th>
                <th className="border border-black p-2 text-center">Paint</th>
                <th className="border border-black p-2 text-center">Rem</th>
                {item.billingBreakup.map((breakup, idx) => (
                  <th
                    key={idx}
                    className="border border-black p-2 text-center text-xs"
                  >
                    {breakup.percentage}% {breakup.name}
                  </th>
                ))}
              </tr>
            ) : (
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">Sr. No.</th>
                <th className="border border-black p-2 text-center">
                  Item Description
                </th>
                <th className="border border-black p-2 text-center">Area</th>
                <th className="border border-black p-2 text-center">Length</th>
                <th className="border border-black p-2 text-center">Breadth</th>
                <th className="border border-black p-2 text-center">Height</th>
                <th className="border border-black p-2 text-center">Qty</th>
                <th className="border border-black p-2 text-center">Total</th>
                {item.billingBreakup.map((breakup, idx) => (
                  <th
                    key={idx}
                    className="border border-black p-2 text-center text-xs"
                  >
                    {breakup.percentage}% {breakup.name}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {itemRows.map((row, rowIndex) => {
              const commonMilestoneCells = item.billingBreakup.map(
                (breakup, idx) => {
                  const newKey = `${item.id}-${breakup.percentage}-${breakup.name}`;
                  const legacyKey = `${breakup.percentage}%-${breakup.name}`;

                  const lockedEntry = raBill.lockedData.find(
                    (d) =>
                      d.rowId === row.id &&
                      d.itemId === item.id &&
                      (d.breakupKey === newKey || d.breakupKey === legacyKey)
                  );
                  return (
                    <td
                      key={idx}
                      className="border border-black p-2 text-center"
                    >
                      {lockedEntry ? (
                        <span className="font-medium">
                          {lockedEntry.executedQty.toFixed(3)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  );
                }
              );

              if (item.department === "Piping-LHS") {
                return (
                  <tr key={row.id}>
                    <td className="border border-black p-2 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.area || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.docNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.lineNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.sheetNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.rev || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.moc || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.fjSj || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.jointNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.spoolNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.width ? Number(row.width).toFixed(3) : "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.thickness ? Number(row.thickness).toFixed(3) : "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.schedule || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.jointType || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.type}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.componentPart2 || "-"}
                    </td>
                    <td className="border border-black p-2 text-center font-medium">
                      {row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Equipment Insulation") {
                return (
                  <tr key={row.id}>
                    <td className="border border-black p-2 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.equipmentNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.equipmentName || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.portion || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.position || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.temp || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.moc || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.insulationType || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.thickness || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.insulatedDia || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.length || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.shellArea
                        ? parseFloat(
                            String(row.customFields.shellArea)
                          ).toFixed(3)
                        : "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.dishFactor || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.dishEndNos || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.dishArea
                        ? parseFloat(String(row.customFields.dishArea)).toFixed(
                            3
                          )
                        : "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.otherArea || "-"}
                    </td>
                    <td className="border border-black p-2 text-center font-medium">
                      {row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Piping Insulation") {
                return (
                  <tr key={row.id}>
                    <td className="border border-black p-2 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.location || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.drawingNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.sheetNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.moc || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.lineSize || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.pipeOD || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.insulationThickness || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.insulationType || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.temp || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.length || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyElbow90 || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyElbow45 || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyTee || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyReducer || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyEndCap || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyFlangeRem || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyValveRem || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyFlangeFix || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyValveFix || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.qtyWeldValveFix || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.totalFittingsLength || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.rmt || "-"}
                    </td>
                    <td className="border border-black p-2 text-center font-medium">
                      {row.customFields?.area || row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Structure") {
                return (
                  <tr key={row.id}>
                    <td className="border border-black p-2 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.type}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.structureType || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.mark || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.unit}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.length}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.width}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.thickness}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.qty}
                    </td>
                    <td className="border border-black p-2 text-center font-medium">
                      {row.totalWeight.toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else if (item.department === "Piping-Spool Status") {
                return (
                  <tr key={row.id}>
                    <td className="border border-black p-2 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.area || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.drawingNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.revNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.sheetNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.spoolNo || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.lineSize || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.baseMaterial || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.length || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.inchMeter || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.surfaceArea || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.paintSystem || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.customFields?.remarks || "-"}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              } else {
                return (
                  <tr key={row.id}>
                    <td className="border border-black p-2 text-center">
                      {rowIndex + 1}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.type}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.area || "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {(Number(row.length) || 0).toFixed(3)}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.width ? (Number(row.width) || 0).toFixed(3) : "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.thickness
                        ? (Number(row.thickness) || 0).toFixed(3)
                        : "-"}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {row.qty}
                    </td>
                    <td className="border border-black p-2 text-center font-medium">
                      {(Number(row.totalWeight) || 0).toFixed(3)}
                    </td>
                    {commonMilestoneCells}
                  </tr>
                );
              }
            })}

            {/* Item Subtotal Row */}
            <tr className="font-bold bg-gray-200">
              <td
                className="border border-black p-2"
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
                    : 7
                }
              >
                SUBTOTAL - {item.itemCode || "N/A"}
              </td>
              {item.department !== "Piping-Spool Status" && (
                <td className="border border-black p-2 text-center">
                  {itemRows
                    .reduce((sum, row) => sum + row.totalWeight, 0)
                    .toFixed(3)}
                </td>
              )}
              {/* Calculate subtotals for each milestone from locked data */}
              {item.billingBreakup.map((breakup, idx) => {
                const breakupKey = `${breakup.percentage}%-${breakup.name}`;
                const subtotalExecuted = itemRows.reduce((sum, row) => {
                  const lockedEntry = raBill.lockedData.find(
                    (d) =>
                      d.rowId === row.id &&
                      d.breakupKey === breakupKey &&
                      d.itemId === item.id
                  );
                  return sum + (lockedEntry?.executedWeight || 0);
                }, 0);

                return (
                  <td key={idx} className="border border-black p-2 text-center">
                    {subtotalExecuted > 0 ? subtotalExecuted.toFixed(3) : "-"}
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
    <Card
      id="bill-display-content"
      className="bg-card text-card-foreground shadow-elegant print:shadow-none print:border-none print:p-0"
    >
      {/* Header */}
      <div id="bill-abstract-section" className="p-6 bg-card print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 print:mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight mb-1">
              Abstract Sheet
            </h1>
            <p className="text-muted-foreground">
              Running Account Bill for executed quantities
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-lg px-4 py-1 border-primary/20 bg-primary/5 text-primary"
          >
            {raBill.raNumber}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-muted/30 rounded-lg border border-border/50 print:mb-4 print:p-0 print:border-none print:bg-transparent">
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Project
              </span>
              <div className="text-lg font-semibold mt-1">{project.name}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Order Number
              </span>
              <div className="font-medium mt-1">{order.orderNumber}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Client
              </span>
              <div className="font-medium mt-1">{project.clientName}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                RA Number
              </span>
              <div className="font-medium mt-1">{raBill.raNumber}</div>
            </div>
          </div>
        </div>

        {/* Bill Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">PO Sr No</th>
                <th className="border border-black p-2 text-left">ITEM CODE</th>
                <th className="border border-black p-2 text-left">
                  Item Description
                </th>
                <th className="border border-black p-2 text-center">Unit</th>
                <th className="border border-black p-2 text-center">
                  Quantity
                </th>
                <th className="border border-black p-2 text-center">
                  BILL BREAK UP AS PER LOI
                </th>
                <th className="border border-black p-2 text-center">
                  Break up %
                </th>
                <th
                  className="border border-black p-2 text-center whitespace-nowrap"
                  rowSpan={2}
                >
                  Unit Rate
                </th>
                <th
                  className="border border-black p-2 text-center whitespace-nowrap"
                  colSpan={2}
                >
                  Previous Bill
                </th>
                <th
                  className="border border-black p-2 text-center whitespace-nowrap"
                  colSpan={2}
                >
                  This Bill
                </th>
                <th
                  className="border border-black p-2 text-center whitespace-nowrap"
                  colSpan={2}
                >
                  Cumm. Bill
                </th>
                <th
                  className="border border-black p-2 text-center whitespace-nowrap"
                  rowSpan={2}
                >
                  REMARKS
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-black p-1 text-center text-xs">
                  Certified Qty
                </th>
                <th className="border border-black p-1 text-center text-xs">
                  Amount
                </th>
                <th className="border border-black p-1 text-center text-xs">
                  Certified Qty
                </th>
                <th className="border border-black p-1 text-center text-xs">
                  Amount
                </th>
                <th className="border border-black p-1 text-center text-xs">
                  Certified Qty
                </th>
                <th className="border border-black p-1 text-center text-xs">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {itemsData.map((itemData) =>
                itemData.breakupsData.map((breakup, breakupIndex) => (
                  <tr key={`${itemData.item.id}-${breakupIndex}`}>
                    {/* PO Sr No - only show on first breakup row */}
                    {breakupIndex === 0 && (
                      <td
                        className="border border-black p-2 text-center"
                        rowSpan={itemData.breakupsData.length}
                      >
                        {itemData.itemIndex}
                      </td>
                    )}
                    {/* Item Code - only show on first breakup row */}
                    {breakupIndex === 0 && (
                      <td
                        className="border border-black p-2"
                        rowSpan={itemData.breakupsData.length}
                      >
                        {itemData.item.itemCode || "N/A"}
                      </td>
                    )}
                    {/* Item Description - only show on first breakup row */}
                    {breakupIndex === 0 && (
                      <td
                        className="border border-black p-2"
                        rowSpan={itemData.breakupsData.length}
                      >
                        {itemData.item.description}
                      </td>
                    )}
                    {/* Unit - only show on first breakup row */}
                    {breakupIndex === 0 && (
                      <td
                        className="border border-black p-2 text-center"
                        rowSpan={itemData.breakupsData.length}
                      >
                        {itemData.item.unitOfMeasurement}
                      </td>
                    )}
                    {/* Quantity - only show on first breakup row */}
                    {breakupIndex === 0 && (
                      <td
                        className="border border-black p-2 text-center"
                        rowSpan={itemData.breakupsData.length}
                      >
                        {itemData.item.quantity}
                      </td>
                    )}

                    {/* Breakup details - show on every row */}
                    <td className="border border-black p-2">{breakup.name}</td>
                    <td className="border border-black p-2 text-center">
                      {breakup.percentage}%
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatCurrency(itemData.item.unitRate)}
                    </td>
                    {/* Previous Bill */}
                    <td className="border border-black p-2 text-right">
                      {breakup.previousWeight.toFixed(3)}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatCurrency(breakup.previousAmount)}
                    </td>
                    {/* This Bill */}
                    <td className="border border-black p-2 text-right">
                      {breakup.executedWeight.toFixed(3)}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatCurrency(breakup.amount)}
                    </td>
                    {/* Cumulative Bill */}
                    <td className="border border-black p-2 text-right">
                      {breakup.cumulativeWeight.toFixed(3)}
                    </td>
                    <td className="border border-black p-2 text-right">
                      {formatCurrency(breakup.cumulativeAmount)}
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                ))
              )}

              {/* Total Row */}
              <tr className="font-bold bg-gray-100">
                <td className="border border-black p-2" colSpan={8}>
                  TOTAL AMOUNT RS
                </td>
                <td className="border border-black p-2 text-right whitespace-nowrap">
                  {grandTotalPreviousWeight.toFixed(3)}
                </td>
                <td className="border border-black p-2 text-right whitespace-nowrap">
                  {formatCurrency(grandTotalPreviousAmount)}
                </td>
                <td className="border border-black p-2 text-right whitespace-nowrap">
                  {grandTotalWeight.toFixed(3)}
                </td>
                <td className="border border-black p-2 text-right whitespace-nowrap">
                  {formatCurrency(grandTotalAmount)}
                </td>
                <td className="border border-black p-2 text-right whitespace-nowrap">
                  {grandTotalCumulativeWeight.toFixed(3)}
                </td>
                <td className="border border-black p-2 text-right whitespace-nowrap">
                  {formatCurrency(grandTotalCumulativeAmount)}
                </td>
                <td className="border border-black p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Measurement Summary by Item */}
      <div className="relative py-8 flex items-center justify-center print:hidden">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t-2 border-dashed border-gray-300" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-4 text-sm text-muted-foreground uppercase tracking-wider">
            Page Break for PDF
          </span>
        </div>
      </div>

      <div
        id="bill-measurement-section"
        className="mb-6 p-4 bg-white"
        style={{ pageBreakBefore: "always" }}
      >
        <h3 className="text-lg font-semibold mb-4">
          Measurement Sheet Summary
        </h3>

        {items.map((item, itemIndex) => {
          // Filter measurement rows that are part of this RA bill
          const itemRows = measurementRows.filter((row) => {
            return raBill.lockedData.some(
              (locked) => locked.rowId === row.id && locked.itemId === item.id
            );
          });

          if (itemRows.length === 0) return null;

          return (
            <div key={item.id} className="mb-6">
              {/* Item Header */}
              <div className="bg-gray-100 p-3 rounded-t-lg border border-black">
                <h4 className="font-semibold">
                  Item {itemIndex + 1}: {item.itemCode || "N/A"} -{" "}
                  {item.description}
                </h4>
                <p className="text-sm text-gray-600">
                  Department: {item.department} | Unit: {item.unitOfMeasurement}
                </p>
              </div>

              {/* Item Measurement Table */}
              {renderMeasurementTable(item, itemRows)}
            </div>
          );
        })}

        {/* Grand Total Summary */}
        <div className="bg-gray-100 p-4 rounded-lg border border-black">
          <h4 className="font-bold mb-2">GRAND TOTAL - ALL ITEMS</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Weight:</span>
              <span className="font-semibold ml-2">
                {measurementRows
                  .filter((row) =>
                    Object.values(row.breakupStatus).some(
                      (status) => status.completedQty && status.completedQty > 0
                    )
                  )
                  .reduce((sum, row) => sum + row.totalWeight, 0)
                  .toFixed(3)}{" "}
                MT
              </span>
            </div>
            {items.length > 0 &&
              items[0].billingBreakup.map((breakup, idx) => {
                const breakupKey = `${breakup.percentage}%-${breakup.name}`;
                const totalCompleted = measurementRows
                  .filter((row) =>
                    Object.values(row.breakupStatus).some(
                      (status) => status.completedQty && status.completedQty > 0
                    )
                  )
                  .reduce((sum, row) => {
                    const status = row.breakupStatus[breakupKey];
                    return sum + (status?.completedWeight || 0);
                  }, 0);

                return (
                  <div key={idx}>
                    <span className="text-gray-600">
                      {breakup.percentage}% Milestone:
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

        {/* Footer Information */}
        <div className="mt-6 print:mt-4 text-sm">
          <p className="mb-2">
            <strong>Generated on:</strong>{" "}
            {new Date(raBill.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-amber-700 bg-amber-50 p-3 rounded border border-amber-200 print:border-black print:bg-transparent">
            <strong>Note:</strong> This is a historical record of{" "}
            {raBill.raNumber}. All quantities shown were locked at the time of
            generation and cannot be modified.
          </p>
        </div>
      </div>
    </Card>
  );
}
