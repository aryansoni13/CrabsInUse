export interface Project {
  id: string;
  name: string;
  clientName: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  projectId: string;
  orderNumber: string;
  orderCode?: string;
  title: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingBreakup {
  id: string;
  name: string;
  percentage: number;
}

export interface Item {
  id: string;
  orderId: string;
  itemCode?: string;
  description: string;
  shortDescription?: string;
  unitOfMeasurement: string;
  quantity: number;
  unitRate: number;
  amount: number;
  department: string;
  billingBreakup: BillingBreakup[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomColumn {
  id: string;
  title: string;
  position: number; // Position in the column order
  department: string; // Department this column belongs to
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnGroup {
  id: string;
  name: string;
  isActive: boolean;
  selectedColumns: string[]; // Item IDs or column names
  department: string;
  orderId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementRow {
  id: string;
  itemId: string;
  check: boolean;
  type: string;
  mark: string;
  area?: string | null;
  unit: number;
  length: number;
  width?: number | null;
  thickness?: number | null;
  qty: number;
  totalWeight: number;
  breakupStatus: Record<
    string,
    {
      done: boolean;
      completedQty?: number;
      completedWeight?: number;
      date?: string;
      lockedInRA?: string;
      lockedQty?: number;
      lockedWeight?: number;
      itemId: string;
      inputValue?: string;
    }
  >;
  customFields: Record<string, string | number | null>; // Custom column data
  userId: string;
  createdAt: string;
  updatedAt: string;
  department: string;
}

export interface RABill {
  id: string;
  orderId: string;
  raNumber: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lockedData: Array<{
    itemId: string;
    rowId: string;
    breakupKey: string;
    executedQty: number;
    executedWeight: number;
    previousQty?: number;
    previousWeight?: number;
  }>;
}

export interface Department {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}


// Computed values
export interface ProjectWithCalculations extends Project {
  totalBudget: number;
  ordersCount: number;
}

export interface OrderWithCalculations extends Order {
  totalAmount: number;
  itemsCount: number;
  projectName: string;
}

export interface ItemWithCalculations extends Item {
  totalMeasuredAmount: number;
  completedPercentage: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  mobileNumber?: string;
  gstNumber?: string;
  createdAt: string;
  updatedAt: string;
}
