import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  Save,
  Calculator,
  Trash2,
  Settings,
  Edit3,
  Download,
  Lock,
  Layers,
  Copy,
  Clipboard,
  ClipboardPaste,
} from "lucide-react";
import { useMeasurementAutoSave } from "@/hooks/use-measurement-autosave";
import { usePreviousEntries } from "@/hooks/use-previous-entries";
import { useRowKeyboardNavigation } from "@/hooks/use-row-keyboard-navigation";
import { useRowClipboard } from "@/hooks/use-row-clipboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  projectStorage,
  orderStorage,
  itemStorage,
  measurementStorage,
  customColumnStorage,
} from "@/lib/storage";
import {
  Project,
  Order,
  Item,
  MeasurementRow,
  BillingBreakup,
  CustomColumn,
} from "@/types";
import {
  calculateShellArea,
  calculateDishArea,
  calculateTotalArea,
} from "@/lib/calculations/equipment-insulation";
import { useAuth } from "@/contexts/AuthContext";
import { ColumnGroupConfig } from "@/components/measurement/ColumnGroupConfig";
import { columnGroupStorage } from "@/lib/columnGroupStorage";
import { ColumnGroup } from "@/types";

// Utility function to safely evaluate mathematical expressions
const evaluateExpression = (expr: string): number | null => {
  try {
    // Remove whitespace
    const cleaned = expr.trim();

    // If it's already a number, return it
    const directNumber = parseFloat(cleaned);
    if (!isNaN(directNumber) && cleaned === directNumber.toString()) {
      return directNumber;
    }

    // Validate expression contains only numbers, operators, parentheses, and decimal points
    if (!/^[\d+\-*/().\s]+$/.test(cleaned)) {
      return null;
    }

    // Evaluate the expression safely using Function constructor
    // This is safer than eval() as it doesn't have access to local scope
    const result = new Function(`return ${cleaned}`)();

    // Check if result is a valid number
    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch (error) {
    return null;
  }
};
const getDepartmentColumns = (department?: string): string[] => {
  if (!department) return [];
  switch (department) {
    case "Piping-LHS":
      return [
        "S.NO.",
        "Area",
        "DOC. NO.",
        "LINE NO.",
        "SHEET NO",
        "Rev",
        "MOC",
        "FJ/SJ",
        "Joint No.",
        "SPOOL NO.",
        "Dia (Inch)",
        "Thickness (MM)",
        "Schedule",
        "Joint Type",
        "Component Part 1",
        "Component Part 2",
        "Total",
      ];
    case "Equipment Insulation":
      return [
        "SR. NO",
        "Equipment No",
        "Equipment Name",
        "Portion",
        "Position",
        "Temperature (°C)",
        "MOC",
        "Insulation Type",
        "Thickness (mm)",
        "Insulated Dia (m)",
        "Height/Length (m)",
        "Shell Area (m²)",
        "Factor for Dish End",
        "Dish End Nos",
        "Dish Area (m²)",
        "Other Area (m²)",
        "Total Area (m²)",
      ];
    case "Piping Insulation":
      return [
        "Sr. No.",
        "Location",
        "Drawing No.",
        "Sheet No.",
        "MOC",
        "Line Size",
        "Pipe OD (mm)",
        "Insulation Thickness (mm)",
        "Insulation Type",
        "Temp (°C)",
        "Pipe Length (m)",
        "90° Elbow",
        "45° Elbow",
        "Tee",
        "Reducer",
        "End Cap",
        "Flg Rem",
        "Vlv Rem",
        "Flg Fix",
        "Vlv Fix",
        "Weld Vlv",
        "Fittings Length (m)",
        "RMT (m)",
        "Area (sqm)",
      ];
    case "Structure":
      return [
        "Sr.",
        "Item Description",
        "Type",
        "Mark No.",
        "Unit Weight",
        "Length",
        "Width",
        "Thickness",
        "Qty",
        "Total (MT)",
      ];
    case "Piping-Spool Status":
      return [
        "Sr. No.",
        "Line No",
        "Spool No",
        "Line Size (Inch)",
        "MOC",
        "Length (Mtr)",
        "Inch Meter",
        "Painting Area (Sqm)",
        "Paint System",
        "Remarks",
      ];
    default:
      // Default / Others
      return [
        "Sr.",
        "Item Description",
        "Area",
        "Length",
        "Width",
        "Height",
        "Qty",
        "Total",
      ];
  }
};
const IS_FACTOR_TABLE: Record<
  string,
  {
    elbow90: number;
    elbow45: number;
    tee: number;
    reducer: number;
    endCap: number;
    flangeRem: number;
    valveRem: number;
    flangeFix: number;
    valveFix: number;
    weldValveFix: number;
  }
> = {
  "15": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "20": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "25": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "32": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "40": {
    elbow90: 0.5,
    elbow45: 0.35,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.8,
    valveRem: 2.5,
    flangeFix: 1.08,
    valveFix: 1.5,
    weldValveFix: 0.2,
  },
  "50": {
    elbow90: 0.6,
    elbow45: 0.4,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.9,
    valveRem: 3,
    flangeFix: 1.14,
    valveFix: 1.8,
    weldValveFix: 0.6,
  },
  "65": {
    elbow90: 0.6,
    elbow45: 0.4,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.9,
    valveRem: 3,
    flangeFix: 1.14,
    valveFix: 1.8,
    weldValveFix: 0.6,
  },
  "80": {
    elbow90: 0.6,
    elbow45: 0.4,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 1.9,
    valveRem: 3,
    flangeFix: 1.14,
    valveFix: 1.8,
    weldValveFix: 0.6,
  },
  "100": {
    elbow90: 1,
    elbow45: 0.65,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2,
    valveRem: 3.5,
    flangeFix: 1.32,
    valveFix: 2.1,
    weldValveFix: 0.6,
  },
  "125": {
    elbow90: 1,
    elbow45: 0.65,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2,
    valveRem: 3.5,
    flangeFix: 1.32,
    valveFix: 2.1,
    weldValveFix: 0.6,
  },
  "150": {
    elbow90: 1,
    elbow45: 0.65,
    tee: 0.7,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2,
    valveRem: 3.5,
    flangeFix: 1.32,
    valveFix: 2.1,
    weldValveFix: 0.6,
  },
  "200": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "250": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "300": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "350": {
    elbow90: 1.4,
    elbow45: 0.85,
    tee: 0.75,
    reducer: 0.2,
    endCap: 0.2,
    flangeRem: 2.5,
    valveRem: 4,
    flangeFix: 1.5,
    valveFix: 2.4,
    weldValveFix: 0.6,
  },
  "400": {
    elbow90: 1.5,
    elbow45: 0.9,
    tee: 0.85,
    reducer: 0.3,
    endCap: 0.2,
    flangeRem: 2.7,
    valveRem: 4.5,
    flangeFix: 1.62,
    valveFix: 2.7,
    weldValveFix: 0.6,
  },
  "450": {
    elbow90: 1.5,
    elbow45: 0.9,
    tee: 0.85,
    reducer: 0.3,
    endCap: 0.2,
    flangeRem: 2.7,
    valveRem: 4.5,
    flangeFix: 1.62,
    valveFix: 2.7,
    weldValveFix: 0.6,
  },
  "500": {
    elbow90: 1.5,
    elbow45: 0.9,
    tee: 0.85,
    reducer: 0.3,
    endCap: 0.2,
    flangeRem: 2.7,
    valveRem: 4.5,
    flangeFix: 1.62,
    valveFix: 2.7,
    weldValveFix: 0.6,
  },
  "600": {
    elbow90: 1.7,
    elbow45: 1.05,
    tee: 1.1,
    reducer: 0.45,
    endCap: 0.2,
    flangeRem: 3,
    valveRem: 6,
    flangeFix: 1.8,
    valveFix: 3,
    weldValveFix: 0.6,
  },
  "700": {
    elbow90: 1.7,
    elbow45: 1.05,
    tee: 1.1,
    reducer: 0.45,
    endCap: 0.2,
    flangeRem: 3,
    valveRem: 6,
    flangeFix: 1.8,
    valveFix: 3,
    weldValveFix: 0.6,
  },
};
const MOC_OPTIONS = ["CS", "SS", "GI", "CPVC", "PVC"];
const INSULATION_TYPE_OPTIONS = [
  "Nitrile",
  "Rockwool",
  "PU",
  "PUF",
  "Glass Wool",
  "Glass Wool",
];
const EQUIPMENT_PORTION_OPTIONS = [
  "Shell",
  "Dish End",
  "Bottom",
  "Top",
  "Full Body",
  "Nozzle",
  "Platform",
];
const EQUIPMENT_POSITION_OPTIONS = ["Vertical", "Horizontal"];
const EQUIPMENT_MOC_OPTIONS = ["SS304", "CS", "MS", "SS316L"];
const EQUIPMENT_INSULATION_TYPE_OPTIONS = ["Hot", "Cold", "Acoustic", "Dual"];
const LINE_SIZE_OPTIONS = Object.keys(IS_FACTOR_TABLE).sort(
  (a, b) => Number(a) - Number(b),
);
const getISFactors = (lineSize: string) => {
  return IS_FACTOR_TABLE[lineSize] || IS_FACTOR_TABLE["50"];
};
const calculatePipingValues = (
  customFields: Record<string, string | number | null>,
  length: number | string,
) => {
  const lineSize = String(customFields["lineSize"] || "50");
  const factors = getISFactors(lineSize);
  const qtyElbow90 = Number(customFields["qtyElbow90"] || 0);
  const qtyElbow45 = Number(customFields["qtyElbow45"] || 0);
  const qtyTee = Number(customFields["qtyTee"] || 0);
  const qtyReducer = Number(customFields["qtyReducer"] || 0);
  const qtyEndCap = Number(customFields["qtyEndCap"] || 0);
  const qtyFlangeRem = Number(customFields["qtyFlangeRem"] || 0);
  const qtyValveRem = Number(customFields["qtyValveRem"] || 0);
  const qtyFlangeFix = Number(customFields["qtyFlangeFix"] || 0);
  const qtyValveFix = Number(customFields["qtyValveFix"] || 0);
  const qtyWeldValveFix = Number(customFields["qtyWeldValveFix"] || 0);
  const totalFittingsLength =
    qtyElbow90 * factors.elbow90 +
    qtyElbow45 * factors.elbow45 +
    qtyTee * factors.tee +
    qtyReducer * factors.reducer +
    qtyEndCap * factors.endCap +
    qtyFlangeRem * factors.flangeRem +
    qtyValveRem * factors.valveRem +
    qtyFlangeFix * factors.flangeFix +
    qtyValveFix * factors.valveFix +
    qtyWeldValveFix * factors.weldValveFix;
  const rmt = Number(length) + totalFittingsLength;
  const pipeOD = Number(customFields["pipeOD"] || 0);
  const insulationThickness = Number(customFields["insulationThickness"] || 0);
  const odInsulated = (pipeOD + 2 * insulationThickness) / 1000;
  const area = Math.PI * odInsulated * rmt;
  return {
    totalFittingsLength: parseFloat(totalFittingsLength.toFixed(2)),
    rmt: parseFloat(rmt.toFixed(2)),
    area: parseFloat(area.toFixed(3)),
  };
};
export default function MeasurementSheet() {
  const { projectId, orderId, itemId } = useParams<{
    projectId: string;
    orderId: string;
    itemId: string;
  }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [measurementRows, setMeasurementRows] = useState<MeasurementRow[]>([]);
  const [departmentItems, setDepartmentItems] = useState<Item[]>([]);
  const [isAddingRows, setIsAddingRows] = useState(false);
  const [tempRows, setTempRows] = useState<
    Array<
      Partial<MeasurementRow> & {
        tempId: string;
      }
    >
  >([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    rowId: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    rowId: "",
    title: "",
    description: "",
  });
  const [unsavedDialog, setUnsavedDialog] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    onConfirm: () => {},
  });
  const [partialDialog, setPartialDialog] = useState<{
    isOpen: boolean;
    rowId: string;
    breakupKey: string;
    milestone: string;
    totalQty: number;
    unit: number;
    totalWeight: number;
    currentCompletedQty: number;
    currentCompletedWeight: number;
    lockedQty: number;
  }>({
    isOpen: false,
    rowId: "",
    breakupKey: "",
    milestone: "",
    totalQty: 0,
    unit: 0,
    totalWeight: 0,
    currentCompletedQty: 0,
    currentCompletedWeight: 0,
    lockedQty: 0,
  });

  // Custom columns state
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [isCustomColumnDialogOpen, setIsCustomColumnDialogOpen] =
    useState(false);
  const [isGroupConfigOpen, setIsGroupConfigOpen] = useState(false);
  const [columnGroups, setColumnGroups] = useState<ColumnGroup[]>([]);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnPosition, setNewColumnPosition] = useState<string>("end");
  const defaultMeasurementLabels = ["Length", "Breadth", "Height"];
  const [measurementLabels, setMeasurementLabels] = useState<string[]>(
    defaultMeasurementLabels,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const tableRef = useRef<HTMLTableElement>(null);
  const { toast } = useToast();

  // Auto-save hook for automatic saving
  const { scheduleAutoSave, hasPendingChanges, lastSaved } =
    useMeasurementAutoSave({
      measurementRows,
      debounceMs: 1500,
      onSaveComplete: () => {
        // Silently save - no toast for auto-save to avoid spam
      },
    });

  // Previous entries hook for suggestions/autofill
  const { getSuggestionsForField, getLastEntryValues, allSuggestions } =
    usePreviousEntries({
      measurementRows,
      department: item?.department || "",
      itemId: itemId || "",
    });

  // Keyboard navigation hook for arrow key row creation
  useRowKeyboardNavigation({
    onAddRow: () => handleAddRows(1),
    totalRows: measurementRows.length,
    isAddingRows,
    tempRowsCount: tempRows.length,
    tableRef,
  });

  // Row clipboard hook for copy/paste/duplicate
  const handleDuplicateRow = useCallback(
    async (row: MeasurementRow) => {
      if (!itemId || !currentUser || !item) return;
      try {
        const newRow = await measurementStorage.create({
          itemId,
          userId: currentUser.id,
          check: false,
          type: row.type,
          mark: row.mark + " (copy)",
          area: row.area,
          unit: row.unit,
          length: row.length,
          width: row.width,
          thickness: row.thickness,
          qty: row.qty,
          totalWeight: row.totalWeight,
          breakupStatus: {},
          // Fresh breakup status
          customFields: {
            ...row.customFields,
          },
          department: item.department,
        });
        setMeasurementRows((prev) => [...prev, newRow]);
      } catch (error) {
        console.error("Failed to duplicate row:", error);
        toast({
          title: "Error",
          description: "Failed to duplicate row",
          variant: "destructive",
        });
      }
    },
    [itemId, currentUser, item, toast],
  );
  const handlePasteRowData = useCallback(
    async (rowData: Partial<MeasurementRow>, targetRowId?: string) => {
      if (!itemId || !currentUser || !item) return;
      try {
        const newRow = await measurementStorage.create({
          itemId,
          userId: currentUser.id,
          check: false,
          type: rowData.type || "",
          mark: rowData.mark || "",
          area: rowData.area || null,
          unit: rowData.unit || 1,
          length: rowData.length || 0,
          width: rowData.width || 0,
          thickness: rowData.thickness || 0,
          qty: rowData.qty || 0,
          totalWeight: rowData.totalWeight || 0,
          breakupStatus: {},
          customFields: rowData.customFields || {},
          department: item.department,
        });
        setMeasurementRows((prev) => [...prev, newRow]);
      } catch (error) {
        console.error("Failed to paste row:", error);
        toast({
          title: "Error",
          description: "Failed to paste row",
          variant: "destructive",
        });
      }
    },
    [itemId, currentUser, item, toast],
  );
  const { copyRow, pasteRow, duplicateRow, hasClipboardData } = useRowClipboard(
    {
      measurementRows,
      onDuplicateRow: handleDuplicateRow,
      onPasteRow: handlePasteRowData,
      toast,
    },
  );

  // Auto-fill from last entry
  const handleAutoFillFromLast = useCallback(() => {
    const lastValues = getLastEntryValues();
    if (!lastValues) {
      toast({
        title: "No previous entries",
        description: "Add some rows first to enable autofill",
        variant: "destructive",
      });
      return;
    }
    if (tempRows.length === 0) {
      toast({
        title: "No temp rows",
        description: "Add a new row first, then use autofill",
        variant: "destructive",
      });
      return;
    }
    setTempRows((prev) =>
      prev.map((row) => ({
        ...row,
        area: lastValues.area || row.area,
        customFields: {
          ...row.customFields,
          ...lastValues.customFields,
        },
      })),
    );
    toast({
      title: "Autofilled",
      description: "Common fields filled from last entry",
    });
  }, [getLastEntryValues, tempRows.length, toast]);
  const measurementLabelStorageKey = item
    ? `measurement_labels_${item.department}`
    : null;
  useEffect(() => {
    if (!measurementLabelStorageKey) return;
    try {
      const stored = localStorage.getItem(measurementLabelStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setMeasurementLabels(parsed);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load measurement labels", error);
    }
    setMeasurementLabels(defaultMeasurementLabels);
  }, [measurementLabelStorageKey]);
  const handleMeasurementLabelChange = (index: number, value: string) => {
    setMeasurementLabels((prev) => {
      const updated = [...prev];
      updated[index] = value;
      if (measurementLabelStorageKey) {
        localStorage.setItem(
          measurementLabelStorageKey,
          JSON.stringify(updated),
        );
      }
      return updated;
    });
  };
  useEffect(() => {
    if (!projectId || !orderId || !itemId) {
      navigate("/");
      return;
    }
    if (!currentUser) {
      navigate("/login");
      return;
    }
    loadData();
  }, [projectId, orderId, itemId, navigate, currentUser]);
  const loadData = async () => {
    if (!projectId || !orderId || !itemId || !currentUser) return;
    try {
      // Load project
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

      // Load order
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

      // Load item
      const itemData = await itemStorage.getById(itemId);
      if (!itemData) {
        toast({
          title: "Error",
          description: "Item not found",
          variant: "destructive",
        });
        navigate(`/projects/${projectId}/orders/${orderId}/items`);
        return;
      }
      setItem(itemData);

      // Load all items from the same department
      const allOrderItems = await itemStorage.getByOrderId(
        orderId,
        currentUser.id,
      );
      const sameDepartmentItems = allOrderItems.filter(
        (i) => i.department === itemData.department,
      );
      setDepartmentItems(sameDepartmentItems);

      // Load measurements for the current item
      // Load measurements for all items in the department
      const departmentItemIds = sameDepartmentItems.map((i) => i.id);
      const measurements = await measurementStorage.getByItemIds(
        departmentItemIds,
        currentUser.id,
      );
      // Sanitize measurements to ensure breakupStatus exists
      setMeasurementRows(
        measurements.map((m) => ({
          ...m,
          breakupStatus: m.breakupStatus || {},
        })),
      );

      // Load custom columns for this department
      const columns = await customColumnStorage.getByDepartment(
        itemData.department,
        currentUser.id,
      );
      setCustomColumns(columns);

      // Load column groups for this order and department
      const groups = await columnGroupStorage.getByOrderAndDepartment(
        orderId,
        itemData.department,
        currentUser.id,
      );
      setColumnGroups(groups);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load measurement sheet data",
        variant: "destructive",
      });
    }
  };
  const handleAddRows = async (count = 1) => {
    if (!itemId || !item || !currentUser) return;

    // Get breakup status for new rows
    const allBreakups = getAllBreakupColumns();
    const breakupStatus: Record<
      string,
      {
        done: boolean;
        completedQty?: number;
        date?: string;
        itemId: string;
      }
    > = {};
    allBreakups.forEach((breakup) => {
      if (breakup.itemId === itemId) {
        const key = `${breakup.itemId}-${breakup.percentage}-${breakup.name}`;
        breakupStatus[key] = {
          done: false,
          completedQty: 0,
          itemId,
        };
      }
    });

    // For Equipment Insulation, pre-populate default dish factor
    const defaultCustomFields: Record<string, string | number> = {
      totalFittingsLength: 0,
      rmt: 0,
      area: 0,
    };
    if (item?.department === "Equipment Insulation") {
      defaultCustomFields["dishFactor"] = 1.27;
      defaultCustomFields["dishEndNos"] = 0;
      defaultCustomFields["otherArea"] = 0;
    }
    try {
      // Directly create and save rows to storage
      const createPromises = Array.from(
        {
          length: count,
        },
        () =>
          measurementStorage.create({
            itemId,
            userId: currentUser.id,
            check: false,
            type: "",
            mark: "",
            area: selectedArea !== "all" ? selectedArea : null,
            unit: item?.department === "Structure" ? 0 : 1,
            length: 0,
            width: 0,
            thickness: 0,
            qty: 0,
            totalWeight: 0,
            breakupStatus,
            customFields: defaultCustomFields,
            department: item.department,
          }),
      );
      const createdRows = await Promise.all(createPromises);
      setMeasurementRows((prev) => [...prev, ...createdRows]);

      // Focus first input of new row after it's added
      setTimeout(() => {
        if (tableRef.current) {
          const tbody = tableRef.current.querySelector("tbody");
          if (tbody) {
            const rows = tbody.querySelectorAll("tr");
            const lastRow = rows[rows.length - 1];
            const firstInput = lastRow?.querySelector(
              "input:not([disabled])",
            ) as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
              firstInput.select();
            }
          }
        }
      }, 100);
    } catch (error) {
      console.error("Failed to add row:", error);
      toast({
        title: "Error",
        description: "Failed to add row",
        variant: "destructive",
      });
    }
  };
  const handleUpdateTempCustomField = (
    tempId: string,
    columnId: string,
    value: string,
  ) => {
    setTempRows((prev) =>
      prev.map((row) => {
        if (row.tempId === tempId) {
          const currentCustomFields = row.customFields || {};
          const updatedFields = {
            ...currentCustomFields,
            [columnId]: value,
          };

          // Calculate InchMeter for Piping-Spool Status if Line Size changes
          if (
            item?.department === "Piping-Spool Status" &&
            columnId === "lineSize"
          ) {
            const length = row.length || 0;
            const lineSize = parseFloat(value) || 0;
            const inchMeter = (length * lineSize).toFixed(3);
            updatedFields["inchMeter"] = inchMeter;
          }

          // Calculate Equipment Insulation Values
          if (
            item?.department === "Equipment Insulation" &&
            [
              "insulatedDia",
              "dishFactor",
              "dishEndNos",
              "otherArea",
              "thickness",
            ].includes(columnId)
          ) {
            const dia = Number(updatedFields["insulatedDia"] || 0);
            const len = Number(row.length || 0);
            const thk = Number(updatedFields["thickness"] || 0);
            const factor = Number(updatedFields["dishFactor"] || 1.27);
            const ends = Number(updatedFields["dishEndNos"] || 0);
            const other = Number(updatedFields["otherArea"] || 0);
            const shellArea = calculateShellArea(dia, len, thk);
            const dishArea = calculateDishArea(dia, thk, factor, ends);
            const totalArea = calculateTotalArea(shellArea, dishArea, other);
            updatedFields["shellArea"] = shellArea;
            updatedFields["dishArea"] = dishArea;
            updatedFields["totalArea"] = totalArea;
          }

          // Calculate Piping Values
          if (
            [
              "lineSize",
              "qtyElbow90",
              "qtyElbow45",
              "qtyTee",
              "qtyReducer",
              "qtyEndCap",
              "qtyFlangeRem",
              "qtyValveRem",
              "qtyFlangeFix",
              "qtyValveFix",
              "qtyWeldValveFix",
              "pipeOD",
              "insulationThickness",
            ].includes(columnId)
          ) {
            const calculated = calculatePipingValues(
              updatedFields,
              row.length || 0,
            );
            updatedFields["totalFittingsLength"] =
              calculated.totalFittingsLength;
            updatedFields["rmt"] = calculated.rmt;
            updatedFields["area"] = calculated.area;
          }
          // Update totalWeight based on department
          let newTotalWeight = row.totalWeight;
          if (
            item?.department === "Equipment Insulation" &&
            updatedFields["totalArea"] !== undefined
          ) {
            newTotalWeight = Number(updatedFields["totalArea"]);
          } else if (
            item?.department === "Piping-Spool Status" &&
            updatedFields["inchMeter"] !== undefined
          ) {
            newTotalWeight =
              parseFloat(String(updatedFields["inchMeter"])) || 0;
          } else if (
            item?.department === "Piping Insulation" &&
            updatedFields["rmt"] !== undefined
          ) {
            newTotalWeight = Number(updatedFields["rmt"]);
          }
          return {
            ...row,
            customFields: updatedFields,
            totalWeight: newTotalWeight,
          };
        }
        return row;
      }),
    );
  };
  const handleUpdateTempRow = (
    tempId: string,
    updates: Partial<MeasurementRow>,
  ) => {
    setTempRows((prev) =>
      prev.map((row) => {
        if (row.tempId === tempId) {
          const updatedRow = {
            ...row,
            ...updates,
          };

          // Calculate InchMeter for Piping-Spool Status if Length changes
          if (
            item?.department === "Piping-Spool Status" &&
            updates.length !== undefined
          ) {
            const length = updates.length || 0;
            const lineSize = parseFloat(
              String(row.customFields?.["lineSize"] || "0"),
            );
            const inchMeter = (length * lineSize).toFixed(3);
            updatedRow.customFields = {
              ...updatedRow.customFields,
              inchMeter,
            };
          }

          // Calculate Equipment Insulation Values if Length passes
          if (
            item?.department === "Equipment Insulation" &&
            updates.length !== undefined
          ) {
            const currentFields = {
              ...row.customFields,
            };
            const dia = Number(currentFields["insulatedDia"] || 0);
            const len = Number(updates.length || 0);
            const thk = Number(currentFields["thickness"] || 0);
            const factor = Number(currentFields["dishFactor"] || 1.27);
            const ends = Number(currentFields["dishEndNos"] || 0);
            const other = Number(currentFields["otherArea"] || 0);
            const shellArea = calculateShellArea(dia, len, thk);
            const dishArea = calculateDishArea(dia, thk, factor, ends);
            const totalArea = calculateTotalArea(shellArea, dishArea, other);
            updatedRow.customFields = {
              ...currentFields,
              shellArea,
              dishArea,
              totalArea,
            };

            // Also update the main row totalWeight as Total Area
            updatedRow.totalWeight = totalArea;
          }

          // Calculate Piping Values if Length changes
          if (updates.length !== undefined) {
            const calculated = calculatePipingValues(
              updatedRow.customFields || {},
              updates.length !== undefined ? Number(updates.length) : 0,
            );
            updatedRow.customFields = {
              ...updatedRow.customFields,
              totalFittingsLength: calculated.totalFittingsLength,
              rmt: calculated.rmt,
              area: calculated.area,
            };
          }

          // Calculate breakup values when length, width, thickness, qty, or unit changes
          if (
            updates.length !== undefined ||
            updates.width !== undefined ||
            updates.thickness !== undefined ||
            updates.qty !== undefined ||
            updates.unit !== undefined
          ) {
            const length =
              updates.length !== undefined ? updates.length : row.length;
            const width =
              updates.width !== undefined ? updates.width : row.width;
            const thickness =
              updates.thickness !== undefined
                ? updates.thickness
                : row.thickness;
            const qty = updates.qty !== undefined ? updates.qty : row.qty;
            const unit = updates.unit !== undefined ? updates.unit : row.unit;

            // Calculate total amount
            const totalAmount =
              (length || 1) *
              (width || 1) *
              (thickness || 1) *
              (qty || 1) *
              (unit ?? (item?.department === "Structure" ? 0 : 1));

            // Get breakup columns and calculate values for each
            const breakupColumns = getAllBreakupColumns();
            const updatedBreakupStatus = {
              ...updatedRow.breakupStatus,
            };
            breakupColumns.forEach((col) => {
              const key = `${col.itemId}-${col.percentage}-${col.name}`;
              const legacyKey = `${col.percentage}%-${col.name}`;
              const breakupValue = (totalAmount * col.percentage) / 100;

              // Store the calculated breakup value in customFields using result key (prefer new key)
              // We might need to handle legacy values but for new calculations we use new keys or both
              updatedRow.customFields = {
                ...updatedRow.customFields,
                [`breakupValue_${key}`]: breakupValue.toFixed(3),
                [`breakupValue_${legacyKey}`]: breakupValue.toFixed(3), // Maintain legacy for safety
              };
            });
            updatedRow.breakupStatus = updatedBreakupStatus;
          }
          return updatedRow;
        }
        return row;
      }),
    );
  };
  const handleSaveTempRows = async () => {
    if (!itemId || !currentUser || !item) return;

    // Filter out empty rows (rows without required fields)
    const isSpecialDepartment = [
      "Piping-LHS",
      "Piping Insulation",
      "Equipment Insulation",
      "Piping-Spool Status",
    ].includes(item.department || "");
    const rowsToSave = tempRows.filter((row) => {
      // For special departments, we might rely on other fields, but let's assume type is still required (mapped to Component Part 1 etc.)
      // We relax the qty check for these departments as the input is hidden/not used
      const hasType = row.type?.trim();
      const hasQty = (row.qty || 0) > 0;
      if (item?.department === "Piping Insulation") {
        // For piping insulation, we check for location or drawingNo as type is not used
        return !!(
          String(row.customFields?.["location"] || "").trim() ||
          String(row.customFields?.["drawingNo"] || "").trim()
        );
      }
      if (item?.department === "Equipment Insulation") {
        // For equipment insulation, we check for equipmentNo or equipmentName
        return !!(
          String(row.customFields?.["equipmentNo"] || "").trim() ||
          String(row.customFields?.["equipmentName"] || "").trim()
        );
      }
      if (item?.department === "Piping-Spool Status") {
        // For Spool Status, check for SpoolNo or DrawingNo
        return !!(
          String(row.customFields?.["spoolNo"] || "").trim() ||
          String(row.customFields?.["drawingNo"] || "").trim()
        );
      }
      return isSpecialDepartment ? hasType : hasType && hasQty;
    });
    if (rowsToSave.length === 0) {
      toast({
        title: "No Valid Rows",
        description: isSpecialDepartment
          ? "Please fill in at least one row with required fields"
          : "Please fill in at least one row with type, length and quantity",
        variant: "destructive",
      });
      return;
    }
    try {
      // Save all valid rows to storage
      const createPromises = rowsToSave.map((row) => {
        const width = row.width || 1;
        const thickness = row.thickness || 1;
        const length = row.length || 1;

        // For Piping-LHS, Total = Dia (which is stored in width)
        const totalWeight =
          item.department === "Piping-LHS"
            ? row.width || 0
            : length * width * thickness * (row.qty || 1) * (row.unit || 1);
        return measurementStorage.create({
          itemId,
          userId: currentUser.id,
          check: row.check || false,
          type: row.type!.trim(),
          mark: row.mark?.trim() || "",
          area: row.area?.trim() || null,
          unit: row.unit || 1,
          length: row.length,
          width: row.width,
          thickness: row.thickness,
          qty: row.qty || 1,
          totalWeight,
          breakupStatus: row.breakupStatus || {},
          customFields: row.customFields || {},
          // Save custom fields
          department: item.department,
        });
      });
      const createdRows = await Promise.all(createPromises);
      setMeasurementRows((prev) => [...prev, ...createdRows]);
      setTempRows([]);
      setIsAddingRows(false);
      toast({
        title: "Success",
        description: `${createdRows.length} measurement row(s) added successfully`,
      });
    } catch (error) {
      console.error("Failed to save rows:", error);
      toast({
        title: "Error",
        description: "Failed to save measurement rows",
        variant: "destructive",
      });
    }
  };
  const handleCancelTempRows = () => {
    // Check if any row has been edited
    const hasEdits = tempRows.some(
      (row) =>
        row.type || (row.length && row.length > 0) || (row.qty && row.qty > 0),
    );
    if (hasEdits) {
      setUnsavedDialog({
        isOpen: true,
        onConfirm: () => {
          setTempRows([]);
          setIsAddingRows(false);
          setUnsavedDialog({
            isOpen: false,
            onConfirm: () => {},
          });
        },
      });
    } else {
      setTempRows([]);
      setIsAddingRows(false);
    }
  };
  const handleNavigateBack = () => {
    // Check if there are unsaved temp rows before navigating
    if (isAddingRows && tempRows.length > 0) {
      const hasEdits = tempRows.some(
        (row) =>
          row.type ||
          (row.length && row.length > 0) ||
          (row.qty && row.qty > 0),
      );
      if (hasEdits) {
        setUnsavedDialog({
          isOpen: true,
          onConfirm: () => {
            setTempRows([]);
            setIsAddingRows(false);
            setUnsavedDialog({
              isOpen: false,
              onConfirm: () => {},
            });
            navigate(`/projects/${projectId}/orders/${orderId}/items`);
          },
        });
        return;
      }
    }

    // No unsaved changes, navigate immediately
    navigate(`/projects/${projectId}/orders/${orderId}/items`);
  };
  const handleUpdateRow = async (
    rowId: string,
    updates: Partial<MeasurementRow>,
  ) => {
    const targetRow = measurementRows.find((row) => row.id === rowId);
    if (!targetRow || !item) return;
    const numericFields: Array<keyof MeasurementRow> = [
      "length",
      "width",
      "thickness",
      "qty",
      "unit",
    ];
    const shouldRecalculate = numericFields.some((field) => field in updates);
    const computedUpdates = {
      ...updates,
    };
    if (shouldRecalculate) {
      const length = (updates.length ?? targetRow.length) || 0;
      const width =
        updates.width !== undefined ? updates.width : targetRow.width;
      const thickness =
        updates.thickness !== undefined
          ? updates.thickness
          : targetRow.thickness;
      const qty = updates.qty !== undefined ? updates.qty : targetRow.qty;
      const unit = updates.unit !== undefined ? updates.unit : targetRow.unit;
      if (item.department === "Equipment Insulation") {
        const currentFields =
          computedUpdates.customFields || targetRow.customFields || {};
        const dia = Number(currentFields["insulatedDia"] || 0);
        const len = Number(length || 0);
        const thk = Number(currentFields["thickness"] || 0);
        const factor = Number(currentFields["dishFactor"] || 1.27);
        const ends = Number(currentFields["dishEndNos"] || 0);
        const other = Number(currentFields["otherArea"] || 0);
        const shellArea = calculateShellArea(dia, len, thk);
        const dishArea = calculateDishArea(dia, thk, factor, ends);
        const totalArea = calculateTotalArea(shellArea, dishArea, other);
        computedUpdates.customFields = {
          ...currentFields,
          shellArea,
          dishArea,
          totalArea,
        };
        computedUpdates.totalWeight = totalArea;
      } else {
        // For Piping-LHS, Total = Dia (which is stored in width)
        computedUpdates.totalWeight =
          item.department === "Piping-LHS"
            ? Number(width) || 0
            : Number(length || 0) *
              Number(width || 1) *
              Number(thickness || 1) *
              Number(qty || 0) *
              Number(unit || 1);
      }

      // Calculate breakup values for all breakup columns
      const totalAmount =
        Number(length || 0) *
        Number(width || 1) *
        Number(thickness || 1) *
        Number(qty || 0) *
        Number(unit || 1);
      const breakupColumns = getAllBreakupColumns();
      const customFields =
        computedUpdates.customFields || targetRow.customFields || {};
      breakupColumns.forEach((col) => {
        const key = `${col.itemId}-${col.percentage}-${col.name}`;
        const legacyKey = `${col.percentage}%-${col.name}`;
        const breakupValue = (totalAmount * col.percentage) / 100;
        customFields[`breakupValue_${key}`] = breakupValue.toFixed(3);
        customFields[`breakupValue_${legacyKey}`] = breakupValue.toFixed(3); // Maintain legacy for safety
      });
      computedUpdates.customFields = customFields;

      // Calculate InchMeter for Piping-Spool Status if Length changes
      if (
        item.department === "Piping-Spool Status" &&
        updates.length !== undefined
      ) {
        const lineSize = parseFloat(
          String(targetRow.customFields?.["lineSize"] || "0"),
        );
        const newLength = Number(length || 0);
        const inchMeter = (newLength * lineSize).toFixed(3);
        computedUpdates.customFields = {
          ...targetRow.customFields,
          ...computedUpdates.customFields,
          inchMeter,
        };
        // For Piping-Spool Status, totalWeight should be inchMeter for billing purposes
        computedUpdates.totalWeight = parseFloat(inchMeter);
      }

      // Calculate Piping Values if Length changes
      if (updates.length !== undefined) {
        const calculated = calculatePipingValues(
          targetRow.customFields || {},
          updates.length !== undefined ? Number(updates.length) : 0,
        );
        computedUpdates.customFields = {
          ...targetRow.customFields,
          ...computedUpdates.customFields,
          totalFittingsLength: calculated.totalFittingsLength,
          rmt: calculated.rmt,
          area: calculated.area,
        };
      }
    }
    // Update state optimistically
    setMeasurementRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...computedUpdates,
            }
          : row,
      ),
    );

    // Schedule auto-save (debounced)
    scheduleAutoSave(rowId, computedUpdates);
  };
  const handleToggleBreakupStatus = async (
    rowId: string,
    breakupKey: string,
  ) => {
    const row = measurementRows.find((r) => r.id === rowId);
    if (!row) return;
    const currentStatus = row.breakupStatus[breakupKey];
    // Parsing key might be different now: itemId-percentage-name
    // But we just need to split by - if we need pieces.
    // However, the logic below uses [percentage, milestone] = breakupKey.split("-")
    // If key is itemId-percentage-name, this split is unsafe if we assume only 2 parts.
    // But we don't actually use 'percentage' variable except as a let... wait.
    // We only pass 'milestone' to the dialog.

    const parts = breakupKey.split("-");
    // New format: itemId-percent-name (3+ parts if name has dashes)
    // Old format: percent-name (2+ parts)

    // We can infer the format.
    // If parts[0] is the itemId (long string), treat as new.
    // But name can contain dashes.
    // Ideally we pass specific data instead of relying on key parsing.
    // For now, let's extract percentage and name robustly if possible.
    // Percentage is usually a number.

    // Helper to parse key
    let percentageStr = "";
    let milestone = "";
    if (breakupKey.includes(rowId)) {
      // rowId is itemId here roughly (wait row.itemId)
      // It's likely the new format: itemId-percentage-name
      // parts[0] = itemId
      // parts[1] = percentage
      // parts[2...] = name
      percentageStr = parts[1];
      milestone = parts.slice(2).join("-");
    } else {
      // Old format: percentage%-name
      // percentage has % symbol often in old code? No, getAllBreakupColumns used `${breakup.percentage}-${breakup.name}`
      // But wait... StartLine 645 in original code: `${breakup.percentage}%-${breakup.name}` (with %)
      // My previous view_file showed: `const key = \`${breakup.percentage}%-${breakup.name}\`;`
      // So old format used % symbol.
      // New format `${breakup.itemId}-${breakup.percentage}-${breakup.name}` does NOT use %.

      if (parts[0].endsWith("%")) {
        percentageStr = parts[0].replace("%", "");
        milestone = parts.slice(1).join("-");
      } else {
        // Fallback or potentially new format passed as simple hyphenated
        // Assuming new format logic if uncertain but relying on exact matches in map
        percentageStr = parts[0];
        milestone = parts.slice(1).join("-");
      }
    }

    // Calculate locked quantity from all RA bills for this row and breakup
    const lockedQty = currentStatus?.lockedQty || 0;

    // Determine total quantity based on department type for billing
    let totalQty = row.totalWeight; // Default for Structure, Others, Piping-LHS
    const dept = item?.department || "";
    if (dept === "Piping-Spool Status") {
      totalQty = parseFloat(String(row.customFields?.["inchMeter"] || "0"));
    } else if (dept === "Equipment Insulation") {
      totalQty = parseFloat(String(row.customFields?.["totalArea"] || "0"));
    } else if (dept === "Piping Insulation") {
      totalQty = parseFloat(String(row.customFields?.["rmt"] || "0"));
    }
    if (!currentStatus?.done) {
      // Opening partial completion dialog with FULL row quantities
      setPartialDialog({
        isOpen: true,
        rowId,
        breakupKey,
        milestone: milestone || "",
        totalQty,
        unit: row.unit,
        totalWeight: row.totalWeight,
        currentCompletedQty: currentStatus?.completedQty || 0,
        currentCompletedWeight: currentStatus?.completedWeight || 0,
        lockedQty,
      });
    } else {
      // Mark as incomplete (only if no locked quantity)
      if (currentStatus.lockedQty && currentStatus.lockedQty > 0) {
        toast({
          title: "Cannot Modify",
          description: `${currentStatus.lockedQty} qty is locked in ${currentStatus.lockedInRA}. You can only modify unlocked quantities.`,
          variant: "destructive",
        });
        return;
      }
      const updatedBreakupStatus = {
        ...row.breakupStatus,
        [breakupKey]: {
          done: false,
          completedQty: 0,
          completedWeight: 0,
          lockedQty: 0,
          lockedWeight: 0,
          itemId: rowId,
        },
      };
      await handleUpdateRow(rowId, {
        breakupStatus: updatedBreakupStatus,
      });

      // Check if we need to uncheck the main checkbox
      const shouldUncheck = checkIfShouldUncheck(updatedBreakupStatus);
      if (shouldUncheck && row.check) {
        await handleUpdateRow(rowId, {
          check: false,
        });
      }
    }
  };
  const handlePartialComplete = async (
    completedQty: number,
    completedWeight: number,
    date: string,
    reportNumber: string,
  ) => {
    const { rowId, breakupKey } = partialDialog;
    const row = measurementRows.find((r) => r.id === rowId);
    if (!row) return;
    const currentStatus = row.breakupStatus[breakupKey];
    const lockedQty = currentStatus?.lockedQty || 0;
    const lockedWeight = currentStatus?.lockedWeight || 0;

    // Determine total quantity based on department type for billing
    let totalQty = row.totalWeight; // Default for Structure, Others, Piping-LHS
    const dept = item?.department || "";
    if (dept === "Piping-Spool Status") {
      totalQty = parseFloat(String(row.customFields?.["inchMeter"] || "0"));
    } else if (dept === "Equipment Insulation") {
      totalQty = parseFloat(String(row.customFields?.["totalArea"] || "0"));
    } else if (dept === "Piping Insulation") {
      totalQty = parseFloat(String(row.customFields?.["rmt"] || "0"));
    }

    // Check if fully complete (100% of row quantity)
    const isFullyComplete = Math.abs(completedQty - totalQty) === 0;
    const newStatus = {
      done: isFullyComplete && Math.abs(completedQty - lockedQty) === 0,
      // Done only if fully completed AND fully locked
      completedQty,
      completedWeight,
      date: date,
      lockedInRA: reportNumber,
      lockedQty,
      lockedWeight,
      itemId: row.itemId,
    };
    const updatedBreakupStatus = {
      ...row.breakupStatus,
      [breakupKey]: newStatus,
    };
    await handleUpdateRow(rowId, {
      breakupStatus: updatedBreakupStatus,
    });

    // Auto-check if all milestones are 100% complete and locked
    const shouldAutoCheck = checkIfShouldAutoCheck(
      updatedBreakupStatus,
      totalQty,
    );
    if (shouldAutoCheck && !row.check) {
      await handleUpdateRow(rowId, {
        check: true,
      });
    }
  };

  // Direct inline quantity update handler
  // Accepts numeric input as actual completed qty, or non-numeric input to mark as complete
  const handleInlineQtyUpdate = async (
    rowId: string,
    breakupKey: string,
    inputValue: string,
  ) => {
    const row = measurementRows.find((r) => r.id === rowId);
    if (!row) return;
    const currentStatus = row.breakupStatus[breakupKey];
    const lockedQty = currentStatus?.lockedQty || 0;
    const lockedWeight = currentStatus?.lockedWeight || 0;

    // Determine total quantity based on department type for billing
    const dept = item?.department || "";
    let totalQty = row.totalWeight; // Default for Structure, Others, Piping-LHS
    let useQtyAsWeight = false; // For departments where billing qty IS the "weight" for progress

    if (dept === "Piping-Spool Status") {
      totalQty = parseFloat(String(row.customFields?.["inchMeter"] || "0"));
      useQtyAsWeight = true; // InchMeter is the billing unit
    } else if (dept === "Equipment Insulation") {
      totalQty = parseFloat(String(row.customFields?.["totalArea"] || "0"));
      useQtyAsWeight = true; // Total Area is the billing unit
    } else if (dept === "Piping Insulation") {
      totalQty = parseFloat(String(row.customFields?.["rmt"] || "0"));
      useQtyAsWeight = true; // RMT is the billing unit
    }

    // Parse the input value
    const trimmedInput = inputValue.trim();
    const hasInput = trimmedInput.length > 0;
    const numericValue = parseFloat(trimmedInput);
    const isNumeric = !isNaN(numericValue) && isFinite(numericValue);

    // Determine completed quantity:
    // - If input is a valid number, use that number as completedQty
    // - If input is non-numeric but not empty (e.g., "ok", "done"), use totalQty as completedQty
    // - If input is empty, completedQty = 0
    let completedQty: number;
    if (!hasInput) {
      completedQty = 0;
    } else if (isNumeric) {
      // Use the actual numeric value entered, capped at totalQty
      completedQty = Math.min(numericValue, totalQty);
    } else {
      // Non-numeric input (like "ok", "done", "x") means use full totalQty
      completedQty = totalQty;
    }

    // Calculate weight based on quantity
    // For departments where billing qty IS the weight (inchMeter, totalArea, rmt), use qty directly as weight
    let newCompletedWeight: number;
    if (useQtyAsWeight) {
      newCompletedWeight = completedQty; // Qty IS the weight for these departments
    } else {
      const weightPerUnit = totalQty > 0 ? row.totalWeight / totalQty : 0;
      newCompletedWeight = completedQty * weightPerUnit;
    }

    // Check if fully complete (100% of row quantity)
    const isFullyComplete = Math.abs(completedQty - totalQty) < 0.001;
    const newStatus = {
      done: isFullyComplete && Math.abs(completedQty - lockedQty) < 0.001,
      completedQty: completedQty,
      completedWeight: newCompletedWeight,
      date: new Date().toISOString().split("T")[0],
      lockedInRA: currentStatus?.lockedInRA || "",
      lockedQty,
      lockedWeight,
      itemId: row.itemId,
      inputValue: inputValue,
    };
    const updatedBreakupStatus = {
      ...row.breakupStatus,
      [breakupKey]: newStatus,
    };
    await handleUpdateRow(rowId, {
      breakupStatus: updatedBreakupStatus,
    });

    // Auto-check if all milestones are 100% complete and locked
    const shouldAutoCheck = checkIfShouldAutoCheck(
      updatedBreakupStatus,
      totalQty,
    );
    if (shouldAutoCheck && !row.check) {
      await handleUpdateRow(rowId, {
        check: true,
      });
    }

    // Uncheck if needed
    const shouldUncheck = checkIfShouldUncheck(updatedBreakupStatus);
    if (shouldUncheck && row.check) {
      await handleUpdateRow(rowId, {
        check: false,
      });
    }
  };
  const checkIfShouldAutoCheck = (
    breakupStatus: Record<
      string,
      {
        done: boolean;
        completedQty?: number;
        completedWeight?: number;
        date?: string;
        lockedInRA?: string;
      }
    >,
    totalQty: number,
  ): boolean => {
    const breakupKeys = Object.keys(breakupStatus);
    return breakupKeys.every((key) => {
      const status = breakupStatus[key];
      return (
        status.done && Math.abs((status.completedQty || 0) - totalQty) === 0
      );
    });
  };
  const checkIfShouldUncheck = (
    breakupStatus: Record<
      string,
      {
        done: boolean;
        completedQty?: number;
        completedWeight?: number;
        date?: string;
        lockedInRA?: string;
      }
    >,
  ): boolean => {
    return Object.values(breakupStatus).some((status) => !status.done);
  };
  const handleDeleteRow = (rowId: string) => {
    const row = measurementRows.find((r) => r.id === rowId);
    if (!row) return;
    setDeleteDialog({
      isOpen: true,
      rowId,
      title: "Delete Measurement Row",
      description: `Are you sure you want to delete this measurement row "${row.type} - ${row.mark}"? This action cannot be undone.`,
    });
  };
  const handleItemDescriptionChange = (
    itemId: string,
    newDescription: string,
  ) => {
    // Update departmentItems state immediately for responsive UI
    setDepartmentItems((prevItems) =>
      prevItems.map((i) =>
        i.id === itemId
          ? {
              ...i,
              description: newDescription,
            }
          : i,
      ),
    );

    // Update current item if it matches
    if (item?.id === itemId) {
      setItem((prev) =>
        prev
          ? {
              ...prev,
              description: newDescription,
            }
          : prev,
      );
    }
  };
  const handleItemDescriptionBlur = async (
    itemId: string,
    newDescription: string,
  ) => {
    try {
      await itemStorage.update(itemId, {
        description: newDescription,
      });
      toast({
        title: "Success",
        description: "Item description updated",
      });
    } catch (error) {
      console.error("Failed to update item description", error);
      toast({
        title: "Error",
        description: "Failed to save item description",
        variant: "destructive",
      });
    }
  };
  const handleShortDescriptionChange = (
    itemId: string,
    newShortDescription: string,
  ) => {
    // Update departmentItems state immediately for responsive UI
    setDepartmentItems((prevItems) =>
      prevItems.map((i) =>
        i.id === itemId
          ? {
              ...i,
              shortDescription: newShortDescription,
            }
          : i,
      ),
    );

    // Update current item if it matches
    if (item?.id === itemId) {
      setItem((prev) =>
        prev
          ? {
              ...prev,
              shortDescription: newShortDescription,
            }
          : prev,
      );
    }
  };
  const handleShortDescriptionBlur = async (
    itemId: string,
    newShortDescription: string,
  ) => {
    try {
      await itemStorage.update(itemId, {
        shortDescription: newShortDescription || undefined,
      });
      toast({
        title: "Success",
        description: "Short description updated",
      });
    } catch (error) {
      console.error("Failed to update short description", error);
      toast({
        title: "Error",
        description: "Failed to save short description",
        variant: "destructive",
      });
    }
  };

  // Check if a milestone should be disabled based on group rules
  const isMilestoneDisabled = (
    row: MeasurementRow,
    milestoneItemDescription: string,
  ): boolean => {
    // Safety check: if no groups exist or are loaded, allow all interactions
    if (!columnGroups || columnGroups.length === 0) return false;

    // Find active groups that contain this milestone
    const activeGroups = columnGroups.filter(
      (g) => g.isActive && g.selectedColumns.includes(milestoneItemDescription),
    );
    if (activeGroups.length === 0) return false; // Not in any active group

    // For each active group, check if another milestone in the group has data
    for (const group of activeGroups) {
      const milestonesInGroup = group.selectedColumns;

      // Find the corresponding item IDs for these descriptions
      const itemIdsInGroup = headerGroups
        .filter((hg) => milestonesInGroup.includes(hg.description || ""))
        .map((hg) => hg.itemId);

      // Check if any OTHER milestone in this group has data
      for (const itemIdInGroup of itemIdsInGroup) {
        // Skip the current milestone we're checking
        const currentMilestoneItemId = headerGroups.find(
          (hg) => hg.description === milestoneItemDescription,
        )?.itemId;
        if (itemIdInGroup === currentMilestoneItemId) continue;

        // Check all breakup keys for this item
        const breakupKeysForItem = breakupKeys.filter((key) =>
          key.startsWith(`${itemIdInGroup}-`),
        );

        // If any of these keys have data (done=true or completedWeight>0), disable
        const hasData = breakupKeysForItem.some((key) => {
          const status = row.breakupStatus[key];
          return status && (status.done || (status.completedWeight || 0) > 0);
        });
        if (hasData) return true; // Another milestone in group has data, disable this one
      }
    }
    return false; // No conflicts, allow interaction
  };
  const confirmDeleteRow = async () => {
    try {
      const success = await measurementStorage.delete(deleteDialog.rowId);
      if (success) {
        setMeasurementRows((prev) =>
          prev.filter((row) => row.id !== deleteDialog.rowId),
        );
        toast({
          title: "Success",
          description: "Measurement row deleted successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete measurement row",
        variant: "destructive",
      });
    }
  };
  const calculateColumnTotal = (breakupKey: string) => {
    // Sum up completedWeight for all rows (including locked ones for total display)
    return measurementRows.reduce((sum, row) => {
      const status = row.breakupStatus[breakupKey];
      return sum + (status?.completedWeight || 0);
    }, 0);
  };

  // Calculate total milestone progress across all items
  // Group milestones by itemId so 85%+15% from same item counts as ONE item's progress
  const calculateTotalMilestoneProgress = () => {
    let totalCompleted = 0;
    measurementRows.forEach((row) => {
      // Group breakup statuses by their itemId
      const progressByItem = new Map<string, number>();
      Object.entries(row.breakupStatus).forEach(([key, status]) => {
        if (status && status.completedWeight && status.completedWeight > 0) {
          const statusItemId = status.itemId || row.itemId;
          // For each item, take the maximum completed weight (since all milestones
          // of the same item should have the same completedWeight when filled)
          const existing = progressByItem.get(statusItemId) || 0;
          progressByItem.set(
            statusItemId,
            Math.max(existing, status.completedWeight),
          );
        }
      });

      // Sum up the progress from each unique item (not each milestone)
      progressByItem.forEach((weight) => {
        totalCompleted += weight;
      });
    });
    return totalCompleted;
  };
  const handleExportCsv = () => {
    if (!item) return;
    const headers = [
      "Sr.",
      "Item Description",
      "Area",
      measurementLabels[0],
      measurementLabels[1],
      measurementLabels[2],
      "Qty",
      "Total",
    ];
    const rows = filteredRows.map((row, index) => [
      index + 1,
      row.type || "",
      getRowArea(row),
      row.length?.toFixed(3) ?? "",
      row.width?.toFixed(3) ?? "",
      row.thickness?.toFixed(3) ?? "",
      row.qty ?? "",
      row.totalWeight?.toFixed(3) ?? "",
    ]);
    const csvContent = [headers, ...rows]
      .map((columns) =>
        columns
          .map((col) => `"${String(col ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${item.description.replace(/\s+/g, "_")}_measurements.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  const formatNumber = (num: number) => {
    if (num >= 10000000) {
      // 1 crore
      return `₹${(num / 10000000).toFixed(2)}Cr`;
    } else if (num >= 100000) {
      // 1 lakh
      return `₹${(num / 100000).toFixed(2)}L`;
    } else if (num >= 1000) {
      // 1 thousand
      return `₹${(num / 1000).toFixed(2)}K`;
    }
    return formatCurrency(num);
  };

  // Get all unique billing breakup columns for this department, grouped by item
  // Get all unique billing breakup columns for this department, grouped by item
  const getAllBreakupColumns = (itemData?: Item, orderIdParam?: string) => {
    const targetItem = itemData || item;
    if (!targetItem || !currentUser) return [];

    // Use already loaded department items if available, otherwise fallback to empty array
    // (We expect departmentItems to be loaded by loadData)
    const sameDepartmentItems =
      departmentItems.length > 0 ? departmentItems : item ? [item] : [];

    // Group breakups by item to maintain order
    const itemBreakups = new Map<
      string,
      {
        percentage: number;
        name: string;
        itemId: string;
        unitRate: number;
      }[]
    >();
    sameDepartmentItems.forEach((deptItem) => {
      const breakups = (deptItem.billingBreakup || []).map((breakup) => ({
        percentage: breakup.percentage,
        name: breakup.name,
        itemId: deptItem.id,
        unitRate: deptItem.unitRate,
      }));
      itemBreakups.set(deptItem.id, breakups);
    });

    // Flatten all breakups while maintaining item grouping
    const allBreakups: {
      percentage: number;
      name: string;
      itemId: string;
      unitRate: number;
    }[] = [];
    sameDepartmentItems.forEach((deptItem) => {
      const breakups = itemBreakups.get(deptItem.id) || [];
      allBreakups.push(...breakups);
    });

    // Remove duplicates but keep the first occurrence (item order preserved)
    const uniqueBreakups = new Map<
      string,
      {
        percentage: number;
        name: string;
        description?: string;
        shortDescription?: string;
        itemId: string;
      }
    >();
    allBreakups.forEach((breakup) => {
      // Use itemId in key to separate columns per item
      const key = `${breakup.itemId}-${breakup.percentage}-${breakup.name}`;
      if (!uniqueBreakups.has(key)) {
        const ownerItem = sameDepartmentItems.find(
          (i) => i.id === breakup.itemId,
        );
        uniqueBreakups.set(key, {
          percentage: breakup.percentage,
          name: breakup.name,
          description: ownerItem?.description,
          shortDescription: ownerItem?.shortDescription,
          itemId: breakup.itemId,
        });
      }
    });
    return Array.from(uniqueBreakups.values());
  };

  // Custom column management functions
  const handleAddCustomColumn = async () => {
    if (!newColumnTitle.trim() || !item) {
      toast({
        title: "Validation Error",
        description: "Please enter a column title",
        variant: "destructive",
      });
      return;
    }
    let position = customColumns.length;
    if (newColumnPosition !== "end") {
      const selectedColumn = customColumns.find(
        (col) => col.id === newColumnPosition,
      );
      if (selectedColumn) {
        position = selectedColumn.position + 1;
        // Update positions of columns that come after
        const updates = customColumns
          .filter((col) => col.position >= position)
          .map((col) =>
            customColumnStorage.update(col.id, {
              position: col.position + 1,
            }),
          );
        await Promise.all(updates);
      }
    }
    try {
      const newColumn = await customColumnStorage.create({
        title: newColumnTitle.trim(),
        position,
        department: item.department,
        userId: currentUser!.uid,
      });
      setCustomColumns((prev) =>
        [...prev, newColumn].sort((a, b) => a.position - b.position),
      );
      setNewColumnTitle("");
      setNewColumnPosition("end");
      setIsCustomColumnDialogOpen(false);
      toast({
        title: "Success",
        description: "Custom column added successfully",
      });
    } catch (error) {
      console.error("Failed to add custom column:", error);
      toast({
        title: "Error",
        description: "Failed to add custom column",
        variant: "destructive",
      });
    }
  };
  const handleUpdateCustomField = async (
    rowId: string,
    columnId: string,
    value: string,
  ) => {
    const row = measurementRows.find((r) => r.id === rowId);
    if (!row) return;
    const numericValue =
      !isNaN(Number(value)) && value.trim() !== ""
        ? Number(value)
        : value || null;
    const updatedCustomFields = {
      ...row.customFields,
      [columnId]: numericValue,
    };
    let updates: Partial<MeasurementRow> = {
      customFields: updatedCustomFields,
    };

    // Calculate Piping Values
    if (
      [
        "lineSize",
        "qtyElbow90",
        "qtyElbow45",
        "qtyTee",
        "qtyReducer",
        "qtyEndCap",
        "qtyFlangeRem",
        "qtyValveRem",
        "qtyFlangeFix",
        "qtyValveFix",
        "qtyWeldValveFix",
        "pipeOD",
        "insulationThickness",
      ].includes(columnId)
    ) {
      const calculated = calculatePipingValues(
        updatedCustomFields,
        row.length || 0,
      );
      updatedCustomFields["totalFittingsLength"] =
        calculated.totalFittingsLength;
      updatedCustomFields["rmt"] = calculated.rmt;
      updatedCustomFields["area"] = calculated.area;
      updates.customFields = updatedCustomFields;
    }

    // Calculate Equipment Insulation Values
    if (
      item?.department === "Equipment Insulation" &&
      [
        "insulatedDia",
        "dishFactor",
        "dishEndNos",
        "otherArea",
        "thickness",
      ].includes(columnId)
    ) {
      const dia = Number(updatedCustomFields["insulatedDia"] || 0);
      const len = Number(row.length || 0);
      const thk = Number(updatedCustomFields["thickness"] || 0);
      const factor = Number(updatedCustomFields["dishFactor"] || 1.27);
      const ends = Number(updatedCustomFields["dishEndNos"] || 0);
      const other = Number(updatedCustomFields["otherArea"] || 0);
      const shellArea = calculateShellArea(dia, len, thk);
      const dishArea = calculateDishArea(dia, thk, factor, ends);
      const totalArea = calculateTotalArea(shellArea, dishArea, other);
      updatedCustomFields["shellArea"] = shellArea;
      updatedCustomFields["dishArea"] = dishArea;
      updatedCustomFields["totalArea"] = totalArea;
      updates.customFields = updatedCustomFields;
      updates.totalWeight = totalArea;
    }

    // Update State Optimistically
    setMeasurementRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              ...updates,
            }
          : r,
      ),
    );

    // Schedule auto-save (debounced)
    scheduleAutoSave(rowId, updates);
  };
  const handleDeleteCustomColumn = async (columnId: string) => {
    try {
      const success = await customColumnStorage.delete(columnId);
      if (success) {
        setCustomColumns((prev) => prev.filter((col) => col.id !== columnId));

        // Remove custom field data from all measurement rows
        const updates = measurementRows
          .filter(
            (row) =>
              row.customFields && row.customFields[columnId] !== undefined,
          )
          .map((row) => {
            const updatedFields = {
              ...row.customFields,
            };
            delete updatedFields[columnId];
            return measurementStorage.update(row.id, {
              customFields: updatedFields,
            });
          });
        await Promise.all(updates);

        // Update local state
        setMeasurementRows((prev) =>
          prev.map((row) => {
            if (row.customFields && row.customFields[columnId] !== undefined) {
              const updatedFields = {
                ...row.customFields,
              };
              delete updatedFields[columnId];
              return {
                ...row,
                customFields: updatedFields,
              };
            }
            return row;
          }),
        );
        toast({
          title: "Success",
          description: "Custom column deleted successfully",
        });
      }
    } catch (error) {
      console.error("Failed to delete custom column", error);
      toast({
        title: "Error",
        description: "Failed to delete custom column",
        variant: "destructive",
      });
    }
  };
  if (!project || !order || !item) {
    return <div className="p-6">Loading...</div>;
  }

  // Get all unique breakup columns for this department
  const breakupColumns = getAllBreakupColumns();
  const breakupKeys = breakupColumns.map(
    (col) => `${col.itemId}-${col.percentage}-${col.name}`,
  );

  // Group columns by Item for the header
  const headerGroups = (() => {
    const groups = new Map<
      string,
      {
        itemId: string;
        description?: string;
        shortDescription?: string;
        count: number;
      }
    >();
    breakupColumns.forEach((col) => {
      const matchKey = col.itemId;
      if (!groups.has(matchKey)) {
        groups.set(matchKey, {
          itemId: col.itemId,
          description: col.description,
          shortDescription: col.shortDescription,
          count: 0,
        });
      }
      groups.get(matchKey)!.count++;
    });
    return Array.from(groups.values());
  })();
  const hasBreakups = headerGroups.length > 0;
  const getRowArea = (row: Pick<MeasurementRow, "area">) =>
    row.area?.trim() || "No Area";
  const areaOptions = [
    "all",
    ...Array.from(new Set(measurementRows.map((row) => getRowArea(row)))),
  ];
  const filteredRows = measurementRows
    .filter((row) =>
      selectedArea === "all" ? true : getRowArea(row) === selectedArea,
    )
    .filter((row) => {
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      return (
        row.type.toLowerCase().includes(query) ||
        row.mark.toLowerCase().includes(query)
      );
    });
  const subtotalQty = filteredRows.reduce((sum, row) => sum + row.qty, 0);
  const subtotalWeight = filteredRows.reduce(
    (sum, row) => sum + row.totalWeight,
    0,
  );
  const grandTotalQty = measurementRows.reduce((sum, row) => sum + row.qty, 0);
  const grandTotalWeight = measurementRows.reduce(
    (sum, row) => sum + row.totalWeight,
    0,
  );
  const selectedAreaLabel = selectedArea === "all" ? "All Areas" : selectedArea;
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button variant="ghost" size="sm" onClick={handleNavigateBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Items
        </Button>
      </div>

      <Card className="border-none shadow-elegant bg-gradient-to-br from-card to-secondary/20">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center justify-between lg:justify-start gap-3">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Billing Quantity Entry
                </h1>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary h-5"
                  >
                    #{order.orderCode || order.orderNumber}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 h-5"
                  >
                    {item.department}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Item
                  </p>
                  <p
                    className="text-sm font-medium text-foreground truncate"
                    title={item.description}
                  >
                    {item.description}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Unit Rate
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.unitRate)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Scope
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {item.quantity}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.unitOfMeasurement}
                    </span>
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatNumber(item.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto flex-shrink-0">
              <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 px-5 py-3 border border-primary/10 shadow-sm flex items-center justify-between lg:justify-center gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    Total Weight
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                    Live
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-primary tracking-tighter">
                    {grandTotalWeight.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-primary/60">
                    MT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!["Structure", "Piping-LHS", "Piping-Spool Status"].includes(
        item?.department || "",
      ) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Measurement Labels</CardTitle>
            <CardDescription>
              Customize the length/breadth/height column names
            </CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card p-6 rounded-lg border shadow-sm">
              {measurementLabels.map((label, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`measure-${index}`}>
                    Measure {index + 1}
                  </Label>
                  <Input
                    id={`measure-${index}`}
                    value={label}
                    onChange={(e) =>
                      handleMeasurementLabelChange(index, e.target.value)
                    }
                    placeholder={`Label for Measure ${index + 1}`}
                    className="bg-background"
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Work Entries
                  {hasPendingChanges() && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      Saving...
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Auto-saves as you type • Press ↓ on last row to add new •
                  Enter moves to next row
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Copy/Paste buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pasteRow()}
                  disabled={!hasClipboardData()}
                  title="Paste copied row as new entry"
                >
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Paste Row
                </Button>
                {isAddingRows && tempRows.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFillFromLast}
                    title="Fill common fields from last saved entry"
                  >
                    <Clipboard className="mr-2 h-4 w-4" />
                    Autofill
                  </Button>
                )}
                <Button variant="outline" onClick={handleExportCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsGroupConfigOpen(true)}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Groups
                </Button>
                <Dialog
                  open={isCustomColumnDialogOpen}
                  onOpenChange={setIsCustomColumnDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      Add Column
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Column</DialogTitle>
                      <DialogDescription>
                        Add a custom column to track additional data for
                        measurements in this department.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="columnTitle">Column Title</Label>
                        <Input
                          id="columnTitle"
                          placeholder="Enter column title"
                          value={newColumnTitle}
                          onChange={(e) => setNewColumnTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="columnPosition">Insert After</Label>
                        <Select
                          value={newColumnPosition}
                          onValueChange={setNewColumnPosition}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="end">End of table</SelectItem>
                            {customColumns.map((column) => (
                              <SelectItem key={column.id} value={column.id}>
                                After "{column.title}"
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCustomColumnDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddCustomColumn}>
                        Add Column
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button onClick={() => handleAddRows(1)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Search by item description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:flex-1"
              />
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areaOptions
                    .filter((option) => option !== "all")
                    .map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full text-sm">
              <thead className="bg-muted/70">
                {item?.department === "Piping-LHS" ? (
                  <>
                    <tr>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        S.NO.
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Area
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        DOC. NO.
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        LINE NO.
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        SHEET NO
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Rev
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        MOC
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        FJ/SJ
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Joint No.
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        SPOOL NO.
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Dia (Inch)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Thickness (MM)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Schedule
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Joint Type
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Component Part 1
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Component Part 2
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Total ({item?.unitOfMeasurement || "MT"})
                      </th>
                      {headerGroups.map((group) => (
                        <th
                          key={group.itemId}
                          colSpan={group.count}
                          className="p-3 text-center border-b font-bold text-muted-foreground bg-muted/30 py-2"
                        >
                          <Input
                            value={
                              group.shortDescription || group.description || ""
                            }
                            onChange={(e) =>
                              handleShortDescriptionChange(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              handleShortDescriptionBlur(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            className="bg-transparent border-transparent shadow-none h-8 text-center font-bold text-muted-foreground focus-visible:ring-0 focus-visible:border-input hover:border-input placeholder:text-muted-foreground/50 w-full"
                            placeholder="Short Description"
                          />
                        </th>
                      ))}
                    </tr>
                    {hasBreakups && (
                      <tr>
                        {breakupColumns.map((column) => (
                          <th
                            key={`${column.itemId}-${column.name}`}
                            className="p-3 text-center"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-xs">
                                {column.percentage}%
                              </span>
                              <span
                                className="text-[10px] text-muted-foreground whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis"
                                title={column.name}
                              >
                                {column.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  </>
                ) : item?.department === "Equipment Insulation" ? (
                  <>
                    <tr>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        SR. NO
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Equipment No
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Equipment Name
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Portion
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Position
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Temperature (°C)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        MOC
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Insulation Type
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Thickness (mm)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Insulated Dia (m)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Height/Length (m)
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Shell Area (m²)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Factor for Dish End
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Dish End Nos
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Dish Area (m²)
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Other Area (m²)
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Total Area (m²)
                      </th>
                      {headerGroups.map((group) => (
                        <th
                          key={group.itemId}
                          colSpan={group.count}
                          className="p-3 text-center border-b font-bold text-muted-foreground bg-muted/30 py-2"
                        >
                          <Input
                            value={
                              group.shortDescription || group.description || ""
                            }
                            onChange={(e) =>
                              handleShortDescriptionChange(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              handleShortDescriptionBlur(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            className="bg-transparent border-transparent shadow-none h-8 text-center font-bold text-muted-foreground focus-visible:ring-0 focus-visible:border-input hover:border-input placeholder:text-muted-foreground/50 w-full"
                            placeholder="Short Description"
                          />
                        </th>
                      ))}
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Actions
                      </th>
                    </tr>
                    {hasBreakups && (
                      <tr>
                        {breakupColumns.map((column) => (
                          <th
                            key={`${column.itemId}-${column.name}`}
                            className="p-3 text-center"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-xs">
                                {column.percentage}%
                              </span>
                              <span
                                className="text-[10px] text-muted-foreground whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis"
                                title={column.name}
                              >
                                {column.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  </>
                ) : item?.department === "Piping Insulation" ? (
                  <>
                    <tr>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Sr. No.
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Location
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Drawing No.
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Sheet No.
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        MOC
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Line Size
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Pipe OD (mm)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Insulation Thickness (mm)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Insulation Type
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Temp (°C)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Pipe Length (m)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        90° Elbow
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        45° Elbow
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Tee
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Reducer
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        End Cap
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Flg Rem
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Vlv Rem
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Flg Fix
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Vlv Fix
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Weld Vlv
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Fittings Length (m)
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        RMT (m)
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Area (sqm)
                      </th>
                      {headerGroups.map((group) => (
                        <th
                          key={group.itemId}
                          colSpan={group.count}
                          className="p-3 text-center border-b font-bold text-muted-foreground bg-muted/30 py-2"
                        >
                          <Input
                            value={
                              group.shortDescription || group.description || ""
                            }
                            onChange={(e) =>
                              handleShortDescriptionChange(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              handleShortDescriptionBlur(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            className="bg-transparent border-transparent shadow-none h-8 text-center font-bold text-muted-foreground focus-visible:ring-0 focus-visible:border-input hover:border-input placeholder:text-muted-foreground/50 w-full"
                            placeholder="Short Description"
                          />
                        </th>
                      ))}
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Actions
                      </th>
                    </tr>
                    {hasBreakups && (
                      <tr>
                        {breakupColumns.map((column) => (
                          <th
                            key={`${column.itemId}-${column.name}`}
                            className="p-3 text-center"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-xs">
                                {column.percentage}%
                              </span>
                              <span
                                className="text-[10px] text-muted-foreground whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis"
                                title={column.name}
                              >
                                {column.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  </>
                ) : item?.department === "Structure" ? (
                  <>
                    <tr>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Sr.
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Item Description
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Type
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Mark No.
                      </th>

                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Unit Weight
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Length
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Width
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Thickness
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Qty
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Total ({item?.unitOfMeasurement || "MT"})
                      </th>
                      {headerGroups.map((group) => (
                        <th
                          key={group.itemId}
                          colSpan={group.count}
                          className="p-3 text-center border-b font-bold text-muted-foreground bg-muted/30 py-2"
                        >
                          <Input
                            value={
                              group.shortDescription || group.description || ""
                            }
                            onChange={(e) =>
                              handleShortDescriptionChange(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              handleShortDescriptionBlur(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            className="bg-transparent border-transparent shadow-none h-8 text-center font-bold text-muted-foreground focus-visible:ring-0 focus-visible:border-input hover:border-input placeholder:text-muted-foreground/50 w-full"
                            placeholder="Short Description"
                          />
                        </th>
                      ))}
                      {customColumns.map((column) => (
                        <th
                          key={column.id}
                          className="p-3 text-center"
                          rowSpan={hasBreakups ? 2 : 1}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {column.title}
                            <button
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                handleDeleteCustomColumn(column.id)
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </th>
                      ))}
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Actions
                      </th>
                    </tr>
                    {hasBreakups && (
                      <tr>
                        {breakupColumns.map((column) => (
                          <th
                            key={`${column.itemId}-${column.name}`}
                            className="p-3 text-center"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-xs">
                                {column.percentage}%
                              </span>
                              <span
                                className="text-[10px] text-muted-foreground whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis"
                                title={column.name}
                              >
                                {column.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  </>
                ) : item?.department === "Piping-Spool Status" ? (
                  <>
                    <tr>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Sr. No.
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Area
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Drawing No
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        RevNo
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        SheetNo
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        SpoolNo
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Line Size
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        BaseMaterial
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Length
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        InchMeter
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        SurfaceArea
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        PaintSystem
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Remarks
                      </th>
                      {headerGroups.map((group) => (
                        <th
                          key={group.itemId}
                          colSpan={group.count}
                          className="p-3 text-center border-b font-bold text-muted-foreground bg-muted/30 py-2"
                        >
                          <Input
                            value={
                              group.shortDescription || group.description || ""
                            }
                            onChange={(e) =>
                              handleShortDescriptionChange(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              handleShortDescriptionBlur(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            className="bg-transparent border-transparent shadow-none h-8 text-center font-bold text-muted-foreground focus-visible:ring-0 focus-visible:border-input hover:border-input placeholder:text-muted-foreground/50 w-full"
                            placeholder="Short Description"
                          />
                        </th>
                      ))}
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Actions
                      </th>
                    </tr>
                    {hasBreakups && (
                      <tr>
                        {breakupColumns.map((column) => (
                          <th
                            key={`${column.itemId}-${column.name}`}
                            className="p-3 text-center"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-xs">
                                {column.percentage}%
                              </span>
                              <span
                                className="text-[10px] text-muted-foreground whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis"
                                title={column.name}
                              >
                                {column.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  </>
                ) : (
                  <>
                    <tr>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Sr.
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Item Description
                      </th>
                      <th
                        className="p-3 text-left"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Area
                      </th>

                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        {measurementLabels[0]}
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        {measurementLabels[1]}
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        {measurementLabels[2]}
                      </th>
                      <th
                        className="p-3 text-center"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Qty
                      </th>
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Total ({item?.unitOfMeasurement || "MT"})
                      </th>
                      {headerGroups.map((group) => (
                        <th
                          key={group.itemId}
                          colSpan={group.count}
                          className="p-3 text-center border-b font-bold text-muted-foreground bg-muted/30 py-2"
                        >
                          <Input
                            value={
                              group.shortDescription || group.description || ""
                            }
                            onChange={(e) =>
                              handleShortDescriptionChange(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            onBlur={(e) =>
                              handleShortDescriptionBlur(
                                group.itemId,
                                e.target.value,
                              )
                            }
                            className="bg-transparent border-transparent shadow-none h-8 text-center font-bold text-muted-foreground focus-visible:ring-0 focus-visible:border-input hover:border-input placeholder:text-muted-foreground/50 w-full"
                            placeholder="Short Description"
                          />
                        </th>
                      ))}
                      {customColumns.map((column) => (
                        <th
                          key={column.id}
                          className="p-3 text-center"
                          rowSpan={hasBreakups ? 2 : 1}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {column.title}
                            <button
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                handleDeleteCustomColumn(column.id)
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </th>
                      ))}
                      <th
                        className="p-3 text-right"
                        rowSpan={hasBreakups ? 2 : 1}
                      >
                        Actions
                      </th>
                    </tr>
                    {hasBreakups && (
                      <tr>
                        {breakupColumns.map((column) => (
                          <th
                            key={`${column.itemId}-${column.name}`}
                            className="p-3 text-center"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-xs">
                                {column.percentage}%
                              </span>
                              <span
                                className="text-[10px] text-muted-foreground whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis"
                                title={column.name}
                              >
                                {column.name}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                  </>
                )}
              </thead>
              <tbody className="order-blue-100">
                {filteredRows.length === 0 && !isAddingRows && (
                  <tr>
                    <td
                      className="p-6 text-center text-muted-foreground"
                      colSpan={
                        item?.department === "Piping-LHS"
                          ? 17 + breakupColumns.length
                          : item?.department === "Piping Insulation"
                            ? 25 + breakupColumns.length
                            : item?.department === "Equipment Insulation"
                              ? 17 + breakupColumns.length
                              : item?.department === "Piping-Spool Status"
                                ? 14
                                : 11 + customColumns.length
                      }
                    >
                      No measurement entries match your filters. Add a new row
                      to get started.
                    </td>
                  </tr>
                )}

                {filteredRows.map((row, index) => {
                  const isRowLocked = Object.values(row.breakupStatus).some(
                    (status) => status.done || (status.lockedQty || 0) > 0,
                  );
                  if (item?.department === "Piping-LHS") {
                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="p-3 align-top">{index + 1}</td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.area || ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                area: e.target.value,
                              })
                            }
                            placeholder="Area"
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["docNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "docNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["lineNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "lineNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["sheetNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "sheetNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["rev"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "rev",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(row.customFields?.["moc"] || "")}
                            onValueChange={(value) =>
                              handleUpdateCustomField(row.id, "moc", value)
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                              {MOC_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["fjSj"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "fjSj",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["jointNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "jointNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["spoolNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "spoolNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.width ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                width: Number(e.target.value) || 0,
                              })
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.thickness ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                thickness: Number(e.target.value) || 0,
                              })
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["schedule"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "schedule",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["jointType"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "jointType",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.type}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                type: e.target.value,
                              })
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["componentPart2"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "componentPart2",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top text-right font-semibold">
                          {row.totalWeight.toFixed(3)}
                        </td>
                        {breakupKeys.map((key) => {
                          const [itemIdStr, percentageStr, ...nameParts] =
                            key.split("-");
                          const isLegacy =
                            !key.includes(row.itemId) &&
                            !itemIdStr.startsWith(row.itemId); // Simple check

                          // If column itemId doesn't match row itemId, show N/A
                          // However, we must reconstruct column object from key or lookup
                          // Wait, breakupKeys is strings.
                          // Better to use breakupColumns directly in map?

                          // No, the map above uses breakupKeys which was derived from breakupColumns.
                          // But we need to know if THIS column key belongs to THIS row.
                          // The key format is itemId-percentage-name.

                          // Try to find status with new key, then fallback to legacy
                          const legacyKey = `${percentageStr}%-${nameParts.join("-")}`;
                          const status =
                            row.breakupStatus[key] ||
                            row.breakupStatus[legacyKey];
                          const isLocked = !!status?.done;
                          const completedQty = status?.completedQty || 0;
                          const isPart =
                            completedQty > 0 && completedQty < row.qty;

                          // Get item description for this milestone to check group rules
                          const milestoneItemDesc =
                            headerGroups.find((hg) => hg.itemId === itemIdStr)
                              ?.description || "";
                          const isDisabledByGroup = isMilestoneDisabled(
                            row,
                            milestoneItemDesc,
                          );
                          return (
                            <td key={key} className="p-3 align-top text-center">
                              <div className="flex flex-col items-center gap-1">
                                {isLocked || isRowLocked ? (
                                  <div
                                    className="flex items-center justify-center h-8 w-16 bg-muted rounded-md text-muted-foreground"
                                    title="Locked"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <Input
                                    type="text"
                                    value={
                                      row.breakupStatus[key]?.inputValue || ""
                                    }
                                    onChange={(e) =>
                                      handleInlineQtyUpdate(
                                        row.id,
                                        key,
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-16 text-center border-input"
                                    disabled={isDisabledByGroup}
                                    placeholder=""
                                    title={
                                      isDisabledByGroup
                                        ? "Disabled by group rule"
                                        : "Any input = total qty for billing"
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                  if (item?.department === "Equipment Insulation") {
                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="p-3 align-top">{index + 1}</td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["equipmentNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "equipmentNo",
                                e.target.value,
                              )
                            }
                            placeholder="Tag No."
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["equipmentName"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "equipmentName",
                                e.target.value,
                              )
                            }
                            placeholder="Name/Type"
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-32"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(row.customFields?.["portion"] || "")}
                            onValueChange={(value) =>
                              handleUpdateCustomField(row.id, "portion", value)
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {EQUIPMENT_PORTION_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(row.customFields?.["position"] || "")}
                            onValueChange={(value) =>
                              handleUpdateCustomField(row.id, "position", value)
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {EQUIPMENT_POSITION_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.customFields?.["temp"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "temp",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="1"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(row.customFields?.["moc"] || "")}
                            onValueChange={(value) =>
                              handleUpdateCustomField(row.id, "moc", value)
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="h-8 w-20">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                              {EQUIPMENT_MOC_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(
                              row.customFields?.["insulationType"] || "",
                            )}
                            onValueChange={(value) =>
                              handleUpdateCustomField(
                                row.id,
                                "insulationType",
                                value,
                              )
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                              {EQUIPMENT_INSULATION_TYPE_OPTIONS.map(
                                (option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.customFields?.["thickness"] ?? ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "thickness",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="1"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.customFields?.["insulatedDia"] ?? ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "insulatedDia",
                                e.target.value,
                              )
                            }
                            className="h-8 w-20 text-center"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.length ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                length: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-20 text-center"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top text-right font-bold text-primary">
                          {row.customFields?.["shellArea"] !== undefined
                            ? parseFloat(
                                String(row.customFields["shellArea"]),
                              ).toFixed(3)
                            : "0.000"}
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.customFields?.["dishFactor"] ?? "1.27"}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "dishFactor",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="0.01"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.customFields?.["dishEndNos"] ?? "0"}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "dishEndNos",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="1"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top text-right font-bold text-primary">
                          {row.customFields?.["dishArea"] !== undefined
                            ? parseFloat(
                                String(row.customFields["dishArea"]),
                              ).toFixed(3)
                            : "0.000"}
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.customFields?.["otherArea"] ?? "0"}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "otherArea",
                                e.target.value,
                              )
                            }
                            className="h-8 w-20 text-center"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top text-right font-black text-primary">
                          {row.customFields?.["totalArea"] !== undefined
                            ? parseFloat(
                                String(row.customFields["totalArea"]),
                              ).toFixed(3)
                            : (row.totalWeight || 0).toFixed(3)}
                        </td>
                        {breakupKeys.map((key) => {
                          const [itemIdStr] = key.split("-");
                          const status = row.breakupStatus[key];
                          const isLocked = !!status?.done;
                          const completedQty = status?.completedQty || 0;
                          const isPart =
                            completedQty > 0 && completedQty < row.qty;

                          // Get item description for this milestone to check group rules
                          const milestoneItemDesc =
                            headerGroups.find((hg) => hg.itemId === itemIdStr)
                              ?.description || "";
                          const isDisabledByGroup = isMilestoneDisabled(
                            row,
                            milestoneItemDesc,
                          );
                          return (
                            <td key={key} className="p-3 align-top text-center">
                              <div className="flex flex-col items-center gap-1">
                                {isLocked || isRowLocked ? (
                                  <div
                                    className="flex items-center justify-center h-8 w-16 bg-muted rounded-md text-muted-foreground"
                                    title="Locked"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <Input
                                    type="text"
                                    value={
                                      row.breakupStatus[key]?.inputValue || ""
                                    }
                                    onChange={(e) =>
                                      handleInlineQtyUpdate(
                                        row.id,
                                        key,
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-16 text-center border-input"
                                    disabled={isDisabledByGroup}
                                    placeholder=""
                                    title={
                                      isDisabledByGroup
                                        ? "Disabled by group rule"
                                        : "Any input = total qty for billing"
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyRow(row.id)}
                              title="Copy row"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateRow(row.id)}
                              title="Duplicate row"
                              disabled={isRowLocked}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-destructive hover:text-destructive"
                              disabled={isRowLocked}
                              title={
                                isRowLocked
                                  ? "Cannot delete locked row"
                                  : "Delete row"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  if (item?.department === "Piping Insulation") {
                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="p-3 align-top">{index + 1}</td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["location"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "location",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["drawingNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "drawingNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["sheetNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "sheetNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["moc"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "moc",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["lineSize"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "lineSize",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["pipeOD"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "pipeOD",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={
                              row.customFields?.["insulationThickness"] ?? ""
                            }
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "insulationThickness",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(
                              row.customFields?.["insulationType"] || "",
                            )}
                            onValueChange={(value) =>
                              handleUpdateCustomField(
                                row.id,
                                "insulationType",
                                value,
                              )
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                              {INSULATION_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["temp"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "temp",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.length ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                length: Number(e.target.value) || 0,
                              })
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyElbow90"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyElbow90",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyElbow45"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyElbow45",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyTee"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyTee",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyReducer"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyReducer",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyEndCap"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyEndCap",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyFlangeRem"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyFlangeRem",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyValveRem"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyValveRem",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyFlangeFix"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyFlangeFix",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyValveFix"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyValveFix",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["qtyWeldValveFix"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "qtyWeldValveFix",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={
                              row.customFields?.["totalFittingsLength"] !==
                              undefined
                                ? row.customFields["totalFittingsLength"]
                                : ""
                            }
                            className="h-8 w-16 text-right"
                            readOnly
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={
                              row.customFields?.["rmt"] !== undefined
                                ? row.customFields["rmt"]
                                : ""
                            }
                            className="h-8 w-16 text-right"
                            readOnly
                          />
                        </td>
                        <td className="p-3 align-top text-right font-semibold">
                          {row.customFields?.["area"] !== undefined
                            ? row.customFields["area"]
                            : row.totalWeight.toFixed(3)}
                        </td>
                        {breakupKeys.map((key) => {
                          const [itemIdStr] = key.split("-");
                          const status = row.breakupStatus[key];
                          const isLocked = !!status?.done;
                          const completedQty = status?.completedQty || 0;
                          const isPart =
                            completedQty > 0 && completedQty < row.qty;

                          // Get item description for this milestone to check group rules
                          const milestoneItemDesc =
                            headerGroups.find((hg) => hg.itemId === itemIdStr)
                              ?.description || "";
                          const isDisabledByGroup = isMilestoneDisabled(
                            row,
                            milestoneItemDesc,
                          );
                          return (
                            <td key={key} className="p-3 align-top text-center">
                              <div className="flex flex-col items-center gap-1">
                                {isLocked || isRowLocked ? (
                                  <div
                                    className="flex items-center justify-center h-8 w-16 bg-muted rounded-md text-muted-foreground"
                                    title="Locked"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <Input
                                    type="text"
                                    value={
                                      row.breakupStatus[key]?.inputValue || ""
                                    }
                                    onChange={(e) =>
                                      handleInlineQtyUpdate(
                                        row.id,
                                        key,
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-16 text-center border-input"
                                    disabled={isDisabledByGroup}
                                    placeholder=""
                                    title={
                                      isDisabledByGroup
                                        ? "Disabled by group rule"
                                        : "Any input = total qty for billing"
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyRow(row.id)}
                              title="Copy row"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateRow(row.id)}
                              title="Duplicate row"
                              disabled={isRowLocked}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-destructive hover:text-destructive"
                              disabled={isRowLocked}
                              title={
                                isRowLocked
                                  ? "Cannot delete locked row"
                                  : "Delete row"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  if (item?.department === "Structure") {
                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="p-3 align-top">{index + 1}</td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.type || ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                type: e.target.value,
                              })
                            }
                            placeholder="Description"
                            className="h-8 w-48"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["structureType"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "structureType",
                                e.target.value,
                              )
                            }
                            placeholder="Type"
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["mark"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "mark",
                                e.target.value,
                              )
                            }
                            placeholder="Mark No."
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>

                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.unit ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                unit: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-24 text-center"
                            step="0.001"
                            disabled={isRowLocked}
                            placeholder="Unit Wt"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.length ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                length: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-24 text-center"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.width ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                width: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-24 text-center"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.thickness ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                thickness: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-24 text-center"
                            step="0.001"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.qty ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                qty: Number(e.target.value) || 0,
                              })
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            step="1"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top text-right font-semibold">
                          {row.totalWeight.toFixed(3)}
                        </td>
                        {breakupKeys.map((key) => {
                          const [itemIdStr, percentageStr, ...nameParts] =
                            key.split("-");
                          const legacyKey = `${percentageStr}%-${nameParts.join("-")}`;
                          const status =
                            row.breakupStatus[key] ||
                            row.breakupStatus[legacyKey];
                          const isLocked = !!status?.done;
                          const completedQty = status?.completedQty || 0;
                          const isPart =
                            completedQty > 0 && completedQty < row.qty;

                          // Get item description for this milestone to check group rules
                          const milestoneItemDesc =
                            headerGroups.find((hg) => hg.itemId === itemIdStr)
                              ?.description || "";
                          const isDisabledByGroup = isMilestoneDisabled(
                            row,
                            milestoneItemDesc,
                          );
                          return (
                            <td key={key} className="p-3 align-top text-center">
                              <div className="flex flex-col items-center gap-1">
                                {isLocked || isRowLocked ? (
                                  <div
                                    className="flex items-center justify-center h-8 w-16 bg-muted rounded-md text-muted-foreground"
                                    title="Locked"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <Input
                                    type="text"
                                    value={
                                      row.breakupStatus[key]?.inputValue || ""
                                    }
                                    onChange={(e) =>
                                      handleInlineQtyUpdate(
                                        row.id,
                                        key,
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-16 text-center border-input"
                                    disabled={isDisabledByGroup}
                                    placeholder=""
                                    title={
                                      isDisabledByGroup
                                        ? "Disabled by group rule"
                                        : "Any input = total qty for billing"
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        {customColumns.map((column) => (
                          <td key={column.id} className="p-3 align-top">
                            <Input
                              value={row.customFields?.[column.id] ?? ""}
                              onChange={(e) =>
                                handleUpdateCustomField(
                                  row.id,
                                  column.id,
                                  e.target.value,
                                )
                              }
                              className="h-8 text-center"
                              disabled={isRowLocked}
                            />
                          </td>
                        ))}
                        <td className="p-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyRow(row.id)}
                              title="Copy row"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateRow(row.id)}
                              title="Duplicate row"
                              disabled={isRowLocked}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-destructive hover:text-destructive"
                              disabled={isRowLocked}
                              title={
                                isRowLocked
                                  ? "Cannot delete locked row"
                                  : "Delete row"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  if (item?.department === "Piping-Spool Status") {
                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="p-3 align-top">{index + 1}</td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.area || ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                area: e.target.value,
                              })
                            }
                            placeholder="Area"
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["drawingNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "drawingNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["revNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "revNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["sheetNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "sheetNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["spoolNo"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "spoolNo",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(row.customFields?.["lineSize"] || "")}
                            onValueChange={(value) =>
                              handleUpdateCustomField(row.id, "lineSize", value)
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                              {LINE_SIZE_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  DN{option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Select
                            value={String(
                              row.customFields?.["baseMaterial"] || "",
                            )}
                            onValueChange={(value) =>
                              handleUpdateCustomField(
                                row.id,
                                "baseMaterial",
                                value,
                              )
                            }
                            disabled={isRowLocked}
                          >
                            <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent>
                              {MOC_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.length ?? ""}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                length: e.target.value as any,
                              })
                            }
                            onBlur={(e) => {
                              const evaluated = evaluateExpression(
                                e.target.value,
                              );
                              if (evaluated !== null) {
                                handleUpdateRow(row.id, {
                                  length: evaluated,
                                });
                              }
                            }}
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            placeholder="e.g. 2+2"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["inchMeter"] || ""}
                            className="h-8 w-16 bg-muted"
                            disabled
                            title="Auto-calculated: Length × Line Size"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["surfaceArea"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "surfaceArea",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["paintSystem"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "paintSystem",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            disabled={isRowLocked}
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.customFields?.["remarks"] || ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                "remarks",
                                e.target.value,
                              )
                            }
                            className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-32"
                            disabled={isRowLocked}
                          />
                        </td>
                        {breakupKeys.map((key) => {
                          const [itemIdStr] = key.split("-");
                          const status = row.breakupStatus[key];
                          const isLocked = !!status?.done;
                          const completedQty = status?.completedQty || 0;
                          // For Piping-Spool Status, use InchMeter as the quantity for billing
                          const totalQty =
                            item?.department === "Piping-Spool Status"
                              ? parseFloat(
                                  String(
                                    row.customFields?.["inchMeter"] || "0",
                                  ),
                                )
                              : row.qty;
                          const isPart =
                            completedQty > 0 && completedQty < totalQty;

                          // Get item description for this milestone to check group rules
                          const milestoneItemDesc =
                            headerGroups.find((hg) => hg.itemId === itemIdStr)
                              ?.description || "";
                          const isDisabledByGroup = isMilestoneDisabled(
                            row,
                            milestoneItemDesc,
                          );
                          return (
                            <td key={key} className="p-3 align-top text-center">
                              <div className="flex flex-col items-center gap-1">
                                {isLocked || isRowLocked ? (
                                  <div
                                    className="flex items-center justify-center h-8 w-16 bg-muted rounded-md text-muted-foreground"
                                    title="Locked"
                                  >
                                    <Lock className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <Input
                                    type="text"
                                    value={
                                      row.breakupStatus[key]?.inputValue || ""
                                    }
                                    onChange={(e) =>
                                      handleInlineQtyUpdate(
                                        row.id,
                                        key,
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 w-16 text-center border-input"
                                    disabled={isDisabledByGroup}
                                    placeholder=""
                                    title={
                                      isDisabledByGroup
                                        ? "Disabled by group rule"
                                        : "Any input = total qty for billing"
                                    }
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyRow(row.id)}
                              title="Copy row"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateRow(row.id)}
                              title="Duplicate row"
                              disabled={isRowLocked}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-destructive hover:text-destructive"
                              disabled={isRowLocked}
                              title={
                                isRowLocked
                                  ? "Cannot delete locked row"
                                  : "Delete row"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="p-3 align-top">{index + 1}</td>
                      <td className="p-3 align-top space-y-2">
                        <Input
                          value={row.type}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              type: e.target.value,
                            })
                          }
                          className="h-8"
                          disabled={isRowLocked}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <Input
                          value={row.area || ""}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              area: e.target.value,
                            })
                          }
                          placeholder="Area label"
                          className="h-8"
                          disabled={isRowLocked}
                        />
                      </td>

                      <td className="p-3 align-top">
                        <Input
                          type="number"
                          value={row.length ?? ""}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              length: Number(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-center"
                          step="0.001"
                          disabled={isRowLocked}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <Input
                          type="number"
                          value={row.width ?? ""}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              width: Number(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-center"
                          step="0.001"
                          disabled={isRowLocked}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <Input
                          type="number"
                          value={row.thickness ?? ""}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              thickness: Number(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-center"
                          step="0.001"
                          disabled={isRowLocked}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <Input
                          type="number"
                          value={row.qty ?? ""}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              qty: Number(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-center"
                          min={0}
                          disabled={isRowLocked}
                        />
                      </td>
                      <td className="p-3 align-top text-right font-semibold">
                        {row.totalWeight.toFixed(3)}
                      </td>
                      {breakupKeys.map((key) => {
                        const [itemIdStr] = key.split("-");
                        if (itemIdStr !== row.itemId) {
                          return (
                            <td
                              key={key}
                              className="p-3 align-top text-center bg-muted/20"
                            >
                              <span className="text-xs text-muted-foreground/30">
                                -
                              </span>
                            </td>
                          );
                        }
                        const status = row.breakupStatus[key];
                        const isLocked = !!status?.done;
                        const completedQty = status?.completedQty || 0;
                        const isPart =
                          completedQty > 0 && completedQty < row.qty;
                        const breakupValue =
                          row.customFields?.[`breakupValue_${key}`];

                        // Get item description for this milestone to check group rules
                        const milestoneItemDesc =
                          headerGroups.find((hg) => hg.itemId === itemIdStr)
                            ?.description || "";
                        const isDisabledByGroup = isMilestoneDisabled(
                          row,
                          milestoneItemDesc,
                        );
                        return (
                          <td key={key} className="p-3 align-top text-center">
                            {isLocked || isRowLocked ? (
                              <div
                                className="flex items-center justify-center h-8 w-16 bg-muted rounded-md text-muted-foreground mx-auto"
                                title="Locked"
                              >
                                <Lock className="h-4 w-4" />
                              </div>
                            ) : (
                              <Input
                                type="text"
                                value={row.breakupStatus[key]?.inputValue || ""}
                                onChange={(e) =>
                                  handleInlineQtyUpdate(
                                    row.id,
                                    key,
                                    e.target.value,
                                  )
                                }
                                className="h-8 w-16 text-center border-input mx-auto"
                                disabled={isDisabledByGroup}
                                placeholder=""
                                title={
                                  isDisabledByGroup
                                    ? "Disabled by group rule"
                                    : "Any input = total qty for billing"
                                }
                              />
                            )}
                          </td>
                        );
                      })}
                      {customColumns.map((column) => (
                        <td key={column.id} className="p-3 align-top">
                          <Input
                            value={row.customFields?.[column.id] ?? ""}
                            onChange={(e) =>
                              handleUpdateCustomField(
                                row.id,
                                column.id,
                                e.target.value,
                              )
                            }
                            className="h-8 text-center"
                            disabled={isRowLocked}
                          />
                        </td>
                      ))}
                      <td className="p-3 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyRow(row.id)}
                            title="Copy row"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateRow(row.id)}
                            title="Duplicate row"
                            disabled={isRowLocked}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={isRowLocked}
                            title={
                              isRowLocked
                                ? "Cannot delete locked row"
                                : "Delete row"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {isAddingRows &&
                  tempRows.map((row, index) => {
                    if (item?.department === "Piping-LHS") {
                      return (
                        <tr key={row.tempId} className="border-b bg-muted/40">
                          <td className="p-3 align-top text-muted-foreground">
                            {filteredRows.length + index + 1}
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.area || ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  area: e.target.value,
                                })
                              }
                              placeholder="Area"
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["docNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "docNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["lineNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "lineNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["sheetNo"] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "sheetNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["rev"] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "rev",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "moc",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["fjSj"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "fjSj",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["jointNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "jointNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["spoolNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "spoolNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.width || ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  width: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.thickness || ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  thickness: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["schedule"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "schedule",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["jointType"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "jointType",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.type || ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  type: e.target.value,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["componentPart2"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "componentPart2",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top text-right font-semibold">
                            -
                          </td>
                        </tr>
                      );
                    }
                    if (item?.department === "Equipment Insulation") {
                      return (
                        <tr key={row.tempId} className="border-b bg-muted/40">
                          <td className="p-3 align-top text-muted-foreground">
                            {filteredRows.length + index + 1}
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["equipmentNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "equipmentNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["equipmentName"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "equipmentName",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-32"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(
                                row.customFields?.["portion"] || "",
                              )}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "portion",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {EQUIPMENT_PORTION_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(
                                row.customFields?.["position"] || "",
                              )}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "position",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {EQUIPMENT_POSITION_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.customFields?.["temp"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "temp",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-20"
                              step="0.1"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(row.customFields?.["moc"] || "")}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "moc",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-20">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {EQUIPMENT_MOC_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(
                                row.customFields?.["insulationType"] || "",
                              )}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "insulationType",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {EQUIPMENT_INSULATION_TYPE_OPTIONS.map(
                                  (option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.customFields?.["thickness"] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "thickness",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.1"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.customFields?.["insulatedDia"] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "insulatedDia",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.length ?? ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  length: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top text-right font-semibold text-muted-foreground">
                            {row.customFields?.["shellArea"] || "-"}
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.customFields?.["dishFactor"] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "dishFactor",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-20"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.customFields?.["dishEndNos"] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "dishEndNos",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-20"
                              step="1"
                            />
                          </td>
                          <td className="p-3 align-top text-right font-semibold text-muted-foreground">
                            {row.customFields?.["dishArea"] || "-"}
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.customFields?.["otherArea"] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "otherArea",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top text-right font-semibold text-muted-foreground">
                            {row.customFields?.["totalArea"] || "-"}
                          </td>
                          {breakupKeys.map((key) => (
                            <td key={key} className="p-3 align-top"></td>
                          ))}
                          <td className="p-3 align-top text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelTempRows()}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    } else if (item?.department === "Piping Insulation") {
                      return (
                        <tr key={row.tempId} className="border-b bg-muted/40">
                          <td className="p-3 align-top text-muted-foreground">
                            {filteredRows.length + index + 1}
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["location"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "location",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["drawingNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "drawingNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["sheetNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "sheetNo",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(row.customFields?.["moc"] || "")}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "moc",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-16">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {MOC_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(
                                row.customFields?.["lineSize"] || "",
                              )}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "lineSize",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-16">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_SIZE_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    DN{option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.customFields?.["pipeOD"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "pipeOD",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={
                                row.customFields?.["insulationThickness"] || ""
                              }
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "insulationThickness",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(
                                row.customFields?.["insulationType"] || "",
                              )}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "insulationType",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {INSULATION_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["temp"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "temp",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.length || ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  length: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyElbow90"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyElbow90",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyElbow45"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyElbow45",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyTee"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyTee",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyReducer"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyReducer",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyEndCap"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyEndCap",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyFlangeRem"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyFlangeRem",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyValveRem"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyValveRem",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyFlangeFix"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyFlangeFix",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["qtyValveFix"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyValveFix",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={
                                row.customFields?.["qtyWeldValveFix"] || ""
                              }
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "qtyWeldValveFix",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-12"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={
                                row.customFields?.["totalFittingsLength"] !==
                                undefined
                                  ? row.customFields["totalFittingsLength"]
                                  : ""
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-right w-16"
                              readOnly
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={
                                row.customFields?.["rmt"] !== undefined
                                  ? row.customFields["rmt"]
                                  : ""
                              }
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "rmt",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-right w-16"
                              readOnly
                            />
                          </td>
                          <td className="p-3 align-top text-right font-semibold">
                            <Input
                              value={
                                row.customFields?.["area"] !== undefined
                                  ? row.customFields["area"]
                                  : ""
                              }
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "area",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-right w-20"
                              readOnly
                            />
                          </td>
                          <td className="p-3 align-top text-right">-</td>
                        </tr>
                      );
                    }
                    if (item?.department === "Structure") {
                      return (
                        <tr key={row.tempId} className="border-b bg-muted/40">
                          <td className="p-3 align-top text-muted-foreground">
                            {filteredRows.length + index + 1}
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.type || ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  type: e.target.value,
                                })
                              }
                              placeholder="Description"
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-48"
                            />
                          </td>

                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["structureType"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "structureType",
                                  e.target.value,
                                )
                              }
                              placeholder="Type"
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["mark"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "mark",
                                  e.target.value,
                                )
                              }
                              placeholder="Mark No."
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>

                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.unit ?? ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  unit: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.001"
                              placeholder="Unit Wt"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.length ?? ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  length: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.width ?? ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  width: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.thickness ?? ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  thickness: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                              step="0.001"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              type="number"
                              value={row.qty ?? ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  qty: Number(e.target.value) || 0,
                                })
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                              step="1"
                            />
                          </td>
                          <td className="p-3 align-top text-right font-semibold">
                            {(
                              (row.length || 0) *
                              (row.width || 1) *
                              (row.thickness || 1) *
                              (row.qty || 0) *
                              (row.unit ?? 0)
                            ).toFixed(3)}
                          </td>
                          {breakupKeys.map((key) => (
                            <td key={key} className="p-3 align-top text-center">
                              <div className="text-sm font-medium">
                                {row.customFields?.[`breakupValue_${key}`] ||
                                  "-"}
                              </div>
                            </td>
                          ))}
                          {customColumns.map((column) => (
                            <td key={column.id} className="p-3 align-top">
                              <Input
                                value={row.customFields?.[column.id] ?? ""}
                                onChange={(e) =>
                                  handleUpdateTempCustomField(
                                    row.tempId,
                                    column.id,
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-center"
                              />
                            </td>
                          ))}
                          <td className="p-3 align-top text-right">-</td>
                        </tr>
                      );
                    }
                    if (item?.department === "Piping-Spool Status") {
                      return (
                        <tr key={row.tempId} className="border-b bg-muted/40">
                          <td className="p-3 align-top text-muted-foreground">
                            {filteredRows.length + index + 1}
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={
                                row.area !== undefined && row.area !== null
                                  ? row.area
                                  : ""
                              }
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  area: e.target.value,
                                })
                              }
                              placeholder="Area"
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["drawingNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "drawingNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["revNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "revNo",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["sheetNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "sheetNo",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["spoolNo"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "spoolNo",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(
                                row.customFields?.["lineSize"] || "",
                              )}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "lineSize",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-16">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_SIZE_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    DN{option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Select
                              value={String(
                                row.customFields?.["baseMaterial"] || "",
                              )}
                              onValueChange={(value) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "baseMaterial",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24">
                                <SelectValue placeholder="" />
                              </SelectTrigger>
                              <SelectContent>
                                {MOC_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.length || ""}
                              onChange={(e) =>
                                handleUpdateTempRow(row.tempId, {
                                  length: e.target.value as any,
                                })
                              }
                              onBlur={(e) => {
                                const evaluated = evaluateExpression(
                                  e.target.value,
                                );
                                if (evaluated !== null) {
                                  handleUpdateTempRow(row.tempId, {
                                    length: evaluated,
                                  });
                                }
                              }}
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-16"
                              placeholder="e.g. 2+2"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["inchMeter"] || ""}
                              className="h-8 w-16 bg-muted"
                              disabled
                              title="Auto-calculated: Length × Line Size"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["surfaceArea"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "surfaceArea",
                                  e.target.value,
                                )
                              }
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["paintSystem"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "paintSystem",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-24"
                            />
                          </td>
                          <td className="p-3 align-top">
                            <Input
                              value={row.customFields?.["remarks"] || ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  "remarks",
                                  e.target.value,
                                )
                              }
                              className="border-x-0 border-t-0 border-b border-input rounded-none shadow-none bg-transparent focus-visible:ring-0 h-8 px-1 text-center w-32"
                            />
                          </td>
                          <td className="p-3 align-top text-right">-</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={row.tempId} className="border-b bg-muted/40">
                        <td className="p-3 align-top text-muted-foreground">
                          T{index + 1}
                        </td>
                        <td className="p-3 align-top space-y-2">
                          <Input
                            value={row.type || ""}
                            onChange={(e) =>
                              handleUpdateTempRow(row.tempId, {
                                type: e.target.value,
                              })
                            }
                            placeholder="Type *"
                            className="h-8"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            value={row.area || ""}
                            onChange={(e) =>
                              handleUpdateTempRow(row.tempId, {
                                area: e.target.value,
                              })
                            }
                            placeholder="Area"
                            className="h-8"
                          />
                        </td>

                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.length || ""}
                            onChange={(e) =>
                              handleUpdateTempRow(row.tempId, {
                                length: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-center"
                            step="0.001"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.width || ""}
                            onChange={(e) =>
                              handleUpdateTempRow(row.tempId, {
                                width: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-center"
                            step="0.001"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.thickness || ""}
                            onChange={(e) =>
                              handleUpdateTempRow(row.tempId, {
                                thickness: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-center"
                            step="0.001"
                          />
                        </td>
                        <td className="p-3 align-top">
                          <Input
                            type="number"
                            value={row.qty || ""}
                            onChange={(e) =>
                              handleUpdateTempRow(row.tempId, {
                                qty: Number(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-center"
                            min={0}
                          />
                        </td>
                        <td className="p-3 align-top text-right font-semibold">
                          {(
                            (row.length || 1) *
                            (row.width || 1) *
                            (row.thickness || 1) *
                            (row.qty || 1) *
                            (row.unit || 1)
                          ).toFixed(3)}
                        </td>
                        <td className="p-3 align-top text-muted-foreground">
                          Pending save
                        </td>
                        {breakupKeys.map((key) => {
                          const [itemIdStr] = key.split("-");
                          return (
                            <td key={key} className="p-3 align-top text-center">
                              <div className="text-sm font-medium">
                                {row.customFields?.[`breakupValue_${key}`] ||
                                  "-"}
                              </div>
                            </td>
                          );
                        })}
                        {customColumns.map((column) => (
                          <td key={column.id} className="p-3 align-top">
                            <Input
                              value={row.customFields?.[column.id] ?? ""}
                              onChange={(e) =>
                                handleUpdateTempCustomField(
                                  row.tempId,
                                  column.id,
                                  e.target.value,
                                )
                              }
                              className="h-8 text-center"
                            />
                          </td>
                        ))}
                        <td className="p-3 align-top text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="text-muted-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                <tr className="bg-muted/40 font-semibold">
                  <td colSpan={5} className="p-3">
                    Subtotal - {selectedAreaLabel}
                  </td>
                  <td colSpan={3} className="p-3 text-center">
                    Qty: {subtotalQty.toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    {subtotalWeight.toFixed(3)}{" "}
                    {item?.unitOfMeasurement || "MT"}
                  </td>
                </tr>
                <tr className="bg-muted font-semibold"></tr>
              </tbody>
            </table>
          </div>
        </CardContent>

        {isAddingRows && (
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button onClick={handleSaveTempRows} size="sm">
              <Save className="mr-1 h-4 w-4" />
              Save Rows
            </Button>
            <Button variant="outline" onClick={handleCancelTempRows} size="sm">
              Cancel
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">
                  {item?.unitOfMeasurement || "MT"}
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {grandTotalWeight.toFixed(3)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Measured Weight
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-warning/10 flex items-center justify-center">
                <span className="text-warning font-bold text-sm">%</span>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {grandTotalWeight > 0
                    ? Math.round(
                        (calculateTotalMilestoneProgress() / grandTotalWeight) *
                          100,
                      )
                    : 0}
                  %
                </p>
                <p className="text-xs text-muted-foreground">
                  Overall Milestone Progress
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({
            ...prev,
            isOpen: open,
          }))
        }
        title={deleteDialog.title}
        description={deleteDialog.description}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteRow}
        variant="destructive"
      />

      <ConfirmationDialog
        isOpen={unsavedDialog.isOpen}
        onOpenChange={(open) =>
          setUnsavedDialog((prev) => ({
            ...prev,
            isOpen: open,
          }))
        }
        title="Unsaved Changes"
        description="You have unsaved rows. Please click 'Save Rows' first before navigating away. These rows need to be saved before you can lock them in a bill. Are you sure you want to discard them?"
        confirmText="Discard Changes"
        cancelText="Continue Editing"
        onConfirm={unsavedDialog.onConfirm}
        variant="destructive"
      />
      <ColumnGroupConfig
        open={isGroupConfigOpen}
        onOpenChange={setIsGroupConfigOpen}
        availableColumns={
          hasBreakups
            ? headerGroups.map((g) => g.description || "Unknown Item")
            : getDepartmentColumns(item?.department)
        }
        orderId={orderId}
        department={item?.department || ""}
        onGroupsChange={setColumnGroups}
      />
    </div>
  );
}
