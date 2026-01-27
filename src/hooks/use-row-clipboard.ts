import { useCallback } from "react";
import { MeasurementRow } from "@/types";

interface RowClipboardConfig {
  measurementRows: MeasurementRow[];
  onDuplicateRow: (row: MeasurementRow) => void;
  onPasteRow: (rowData: Partial<MeasurementRow>, targetRowId?: string) => void;
  toast: (opts: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export function useRowClipboard(config: RowClipboardConfig) {
  const { measurementRows, onDuplicateRow, onPasteRow, toast } = config;

  const copyRow = useCallback(
    (rowId: string) => {
      const row = measurementRows.find((r) => r.id === rowId);
      if (!row) return;

      // Store row data in localStorage for cross-session copy
      const rowData = {
        type: row.type,
        mark: row.mark,
        area: row.area,
        length: row.length,
        width: row.width,
        thickness: row.thickness,
        qty: row.qty,
        unit: row.unit,
        customFields: row.customFields,
      };

      localStorage.setItem("measurement_row_clipboard", JSON.stringify(rowData));

      toast({
        title: "Row copied",
        description: "Row data copied to clipboard. Use paste button to duplicate.",
      });
    },
    [measurementRows, toast]
  );

  const pasteRow = useCallback(
    (targetRowId?: string) => {
      const clipboardData = localStorage.getItem("measurement_row_clipboard");
      if (!clipboardData) {
        toast({
          title: "Nothing to paste",
          description: "Copy a row first using the copy button.",
          variant: "destructive",
        });
        return;
      }

      try {
        const rowData = JSON.parse(clipboardData) as Partial<MeasurementRow>;
        onPasteRow(rowData, targetRowId);
        toast({
          title: "Row pasted",
          description: "Row data has been pasted successfully.",
        });
      } catch (error) {
        console.error("Failed to paste row:", error);
        toast({
          title: "Paste failed",
          description: "Could not parse clipboard data.",
          variant: "destructive",
        });
      }
    },
    [onPasteRow, toast]
  );

  const duplicateRow = useCallback(
    (rowId: string) => {
      const row = measurementRows.find((r) => r.id === rowId);
      if (!row) return;

      onDuplicateRow(row);
      toast({
        title: "Row duplicated",
        description: "A copy of the row has been created.",
      });
    },
    [measurementRows, onDuplicateRow, toast]
  );

  const hasClipboardData = useCallback(() => {
    return !!localStorage.getItem("measurement_row_clipboard");
  }, []);

  return {
    copyRow,
    pasteRow,
    duplicateRow,
    hasClipboardData,
  };
}
