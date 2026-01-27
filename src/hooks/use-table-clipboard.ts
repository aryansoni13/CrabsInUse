import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface CellData {
  rowIndex: number;
  columnId: string;
  value: string;
}

interface ClipboardConfig {
  columns: string[];
  numericColumns?: string[];
  onPaste: (data: CellData[]) => void;
  onAddRows?: (count: number) => void;
  currentRowCount: number;
}

export function useTableClipboard(config: ClipboardConfig) {
  const { toast } = useToast();
  const { columns, numericColumns = [], onPaste, onAddRows, currentRowCount } = config;

  const parseClipboardData = useCallback(
    (text: string, startRowIndex: number, startColumnIndex: number): CellData[] => {
      const rows = text.split(/\r?\n/).filter((row) => row.trim());
      const cellData: CellData[] = [];
      const invalidCells: string[] = [];

      rows.forEach((row, rowOffset) => {
        const cells = row.split("\t");
        cells.forEach((cell, colOffset) => {
          const columnIndex = startColumnIndex + colOffset;
          if (columnIndex >= columns.length) return; // Skip if column doesn't exist

          const columnId = columns[columnIndex];
          const value = cell.trim();
          const rowIndex = startRowIndex + rowOffset;

          // Validate numeric columns
          if (numericColumns.includes(columnId)) {
            const numValue = parseFloat(value);
            if (value && isNaN(numValue)) {
              invalidCells.push(`Row ${rowIndex + 1}, Column ${columnId}: "${value}" is not a valid number`);
              return;
            }
          }

          cellData.push({
            rowIndex,
            columnId,
            value,
          });
        });
      });

      if (invalidCells.length > 0) {
        toast({
          title: "Some values were invalid",
          description: invalidCells.slice(0, 3).join("\n") + 
            (invalidCells.length > 3 ? `\n...and ${invalidCells.length - 3} more` : ""),
          variant: "destructive",
        });
      }

      return cellData;
    },
    [columns, numericColumns, toast]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent, startRowIndex: number, startColumnId: string) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text.trim()) return;

      e.preventDefault();

      const startColumnIndex = columns.indexOf(startColumnId);
      if (startColumnIndex === -1) return;

      const rows = text.split(/\r?\n/).filter((row) => row.trim());
      const requiredRows = startRowIndex + rows.length;

      // Check if we need to add more rows
      if (requiredRows > currentRowCount && onAddRows) {
        const rowsToAdd = requiredRows - currentRowCount;
        onAddRows(rowsToAdd);
        
        // Give time for rows to be added
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const cellData = parseClipboardData(text, startRowIndex, startColumnIndex);
      
      if (cellData.length > 0) {
        onPaste(cellData);
        toast({
          title: "Pasted successfully",
          description: `${cellData.length} cell(s) updated`,
        });
      }
    },
    [columns, currentRowCount, onAddRows, onPaste, parseClipboardData, toast]
  );

  const handleCopy = useCallback(
    (cells: { rowIndex: number; columnId: string; value: string }[][]) => {
      if (cells.length === 0) return;

      const text = cells
        .map((row) => row.map((cell) => cell.value).join("\t"))
        .join("\n");

      navigator.clipboard.writeText(text).then(() => {
        toast({
          title: "Copied",
          description: `${cells.flat().length} cell(s) copied to clipboard`,
        });
      });
    },
    [toast]
  );

  return {
    handlePaste,
    handleCopy,
    parseClipboardData,
  };
}
