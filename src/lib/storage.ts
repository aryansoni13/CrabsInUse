import {
  Project,
  Order,
  Item,
  MeasurementRow,
  Department,
  RABill,
  CustomColumn,
} from "@/types";
import { supabase } from "./supabase";

// Helper to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== "object") return obj;

  const camelObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    camelObj[camelKey] = toCamelCase(obj[key]);
  }
  return camelObj;
};

// Helper to convert camelCase to snake_case for database
const toSnakeCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== "object") return obj;

  const snakeObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    snakeObj[snakeKey] = toSnakeCase(obj[key]);
  }
  return snakeObj;
};

// --- Projects ---
export const projectStorage = {
  getAll: async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as Project[];
  },

  create: async (
    project: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project> => {
    const { data, error } = await supabase
      .from("projects")
      .insert(toSnakeCase(project))
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as Project;
  },

  update: async (
    id: string,
    updates: Partial<Omit<Project, "id" | "createdAt">>,
  ): Promise<Project | null> => {
    const { data, error } = await supabase
      .from("projects")
      .update({ ...toSnakeCase(updates), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as Project;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  getById: async (id: string): Promise<Project | null> => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toCamelCase(data) as Project;
  },
};

// --- Orders ---
export const orderStorage = {
  getAll: async (userId: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as Order[];
  },

  getByProjectId: async (
    projectId: string,
    userId: string,
  ): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as Order[];
  },

  create: async (
    order: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">,
  ): Promise<Order> => {
    const orderNumber = `${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase
      .from("orders")
      .insert({
        ...toSnakeCase(order),
        order_number: orderNumber,
      })
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as Order;
  },

  update: async (
    id: string,
    updates: Partial<Omit<Order, "id" | "orderNumber" | "createdAt">>,
  ): Promise<Order | null> => {
    const { data, error } = await supabase
      .from("orders")
      .update({ ...toSnakeCase(updates), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as Order;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  getById: async (id: string): Promise<Order | null> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toCamelCase(data) as Order;
  },
};

// --- Items ---
export const itemStorage = {
  getAll: async (userId: string): Promise<Item[]> => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as Item[];
  },

  getByOrderId: async (orderId: string, userId: string): Promise<Item[]> => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as Item[];
  },

  create: async (
    item: Omit<Item, "id" | "amount" | "createdAt" | "updatedAt">,
  ): Promise<Item> => {
    const amount = item.quantity * item.unitRate;

    const { data, error } = await supabase
      .from("items")
      .insert({
        ...toSnakeCase(item),
        amount,
      })
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as Item;
  },

  update: async (
    id: string,
    updates: Partial<Omit<Item, "id" | "createdAt">>,
  ): Promise<Item | null> => {
    // First get current item to calculate amount if needed
    const { data: current, error: fetchError } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") return null;
      throw fetchError;
    }

    let amount = current.amount;
    if (updates.quantity !== undefined || updates.unitRate !== undefined) {
      const q = updates.quantity ?? current.quantity;
      const r = updates.unitRate ?? current.unit_rate;
      amount = q * r;
    }

    const { data, error } = await supabase
      .from("items")
      .update({
        ...toSnakeCase(updates),
        amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as Item;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  getById: async (id: string): Promise<Item | null> => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toCamelCase(data) as Item;
  },
};

// --- Measurement Rows ---
export const measurementStorage = {
  getAll: async (userId: string): Promise<MeasurementRow[]> => {
    const { data, error } = await supabase
      .from("measurement_rows")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as MeasurementRow[];
  },

  getByItemId: async (
    itemId: string,
    userId: string,
  ): Promise<MeasurementRow[]> => {
    const { data, error } = await supabase
      .from("measurement_rows")
      .select("*")
      .eq("item_id", itemId)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as MeasurementRow[];
  },

  create: async (
    row: Omit<MeasurementRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<MeasurementRow> => {
    const { data, error } = await supabase
      .from("measurement_rows")
      .insert(toSnakeCase(row))
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as MeasurementRow;
  },

  update: async (
    id: string,
    updates: Partial<Omit<MeasurementRow, "id" | "createdAt">>,
  ): Promise<MeasurementRow | null> => {
    const { data, error } = await supabase
      .from("measurement_rows")
      .update({ ...toSnakeCase(updates), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as MeasurementRow;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("measurement_rows")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  updateCustomField: async (
    rowId: string,
    columnId: string,
    value: string | number | null,
  ): Promise<boolean> => {
    // First get current custom fields
    const { data: current, error: fetchError } = await supabase
      .from("measurement_rows")
      .select("custom_fields")
      .eq("id", rowId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") return false;
      throw fetchError;
    }

    const customFields = current.custom_fields || {};
    customFields[columnId] = value;

    const { error } = await supabase
      .from("measurement_rows")
      .update({
        custom_fields: customFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId);

    if (error) throw error;
    return true;
  },
};

// --- Departments ---
export const departmentStorage = {
  getAll: async (userId: string): Promise<Department[]> => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as Department[];
  },

  create: async (name: string, userId: string): Promise<Department> => {
    // Check if department already exists
    const { data: existing, error: checkError } = await supabase
      .from("departments")
      .select("*")
      .eq("name", name)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) return toCamelCase(existing) as Department;

    // Create new department
    const { data, error } = await supabase
      .from("departments")
      .insert({
        name,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as Department;
  },

  getOrCreate: async (name: string, userId: string): Promise<Department> => {
    return await departmentStorage.create(name, userId);
  },
};

// --- RA Bills ---
export const raBillStorage = {
  getAll: async (userId: string): Promise<RABill[]> => {
    const { data, error } = await supabase
      .from("ra_bills")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as RABill[];
  },

  getByOrderId: async (orderId: string, userId: string): Promise<RABill[]> => {
    const { data, error } = await supabase
      .from("ra_bills")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as RABill[];
  },

  create: async (
    raBill: Omit<RABill, "id" | "createdAt" | "updatedAt">,
  ): Promise<RABill> => {
    const { data, error } = await supabase
      .from("ra_bills")
      .insert(toSnakeCase(raBill))
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as RABill;
  },

  getById: async (id: string): Promise<RABill | null> => {
    const { data, error } = await supabase
      .from("ra_bills")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toCamelCase(data) as RABill;
  },
};

// --- Custom Columns ---
export const customColumnStorage = {
  getAll: async (userId: string): Promise<CustomColumn[]> => {
    const { data, error } = await supabase
      .from("custom_columns")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as CustomColumn[];
  },

  getByDepartment: async (
    department: string,
    userId: string,
  ): Promise<CustomColumn[]> => {
    const { data, error } = await supabase
      .from("custom_columns")
      .select("*")
      .eq("department", department)
      .eq("user_id", userId)
      .order("position", { ascending: true });

    if (error) throw error;
    return (data || []).map(toCamelCase) as CustomColumn[];
  },

  create: async (
    column: Omit<CustomColumn, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomColumn> => {
    const { data, error } = await supabase
      .from("custom_columns")
      .insert(toSnakeCase(column))
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as CustomColumn;
  },

  update: async (
    id: string,
    updates: Partial<Omit<CustomColumn, "id" | "createdAt">>,
  ): Promise<CustomColumn | null> => {
    const { data, error } = await supabase
      .from("custom_columns")
      .update({ ...toSnakeCase(updates), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as CustomColumn;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from("custom_columns")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  reorderPositions: async (
    department: string,
    columnIds: string[],
  ): Promise<void> => {
    // Update positions one by one (Supabase doesn't have batch update like Firestore)
    for (let i = 0; i < columnIds.length; i++) {
      const { error } = await supabase
        .from("custom_columns")
        .update({
          position: i,
          updated_at: new Date().toISOString(),
        })
        .eq("id", columnIds[i]);

      if (error) throw error;
    }
  },
};

// --- Utils ---
export const initializeSampleData = async (userId: string): Promise<void> => {
  // Check if projects exist
  const projects = await projectStorage.getAll(userId);
  if (projects.length > 0) return;

  // Create sample departments
  await departmentStorage.create("Structure", userId);
  await departmentStorage.create("Piping", userId);
  await departmentStorage.create("Cable Tray", userId);

  // Create sample project
  const sampleProject = await projectStorage.create({
    name: "Shivam Enterprises Project",
    clientName: "Shivam Enterprises",
    userId,
  });

  // Create sample order
  await orderStorage.create({
    projectId: sampleProject.id,
    orderCode: "ORD-001",
    title: "Main Construction Work",
    description:
      "Primary construction activities including structure, piping and cable tray work",
    userId,
  });
};

export const clearUserData = async (userId: string): Promise<void> => {
  console.warn(
    "Clear User Data not fully implemented for Cloud Storage safety",
  );
};

// --- Users ---
export const userStorage = {
  create: async (
    userId: string,
    data: {
      email: string;
      displayName?: string;
      companyName?: string;
      mobileNumber?: string;
      gstNumber?: string;
    },
  ): Promise<void> => {
    const { error } = await supabase.from("users").upsert({
      uid: userId,
      email: data.email,
      display_name: data.displayName,
      company_name: data.companyName,
      mobile_number: data.mobileNumber,
      gst_number: data.gstNumber,
    });

    if (error) throw error;
  },

  get: async (userId: string): Promise<any> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("uid", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toCamelCase(data);
  },

  update: async (
    userId: string,
    updates: Partial<{
      displayName: string;
      companyName: string;
      mobileNumber: string;
      gstNumber: string;
    }>,
  ): Promise<void> => {
    const { error } = await supabase
      .from("users")
      .update({
        ...toSnakeCase(updates),
        updated_at: new Date().toISOString(),
      })
      .eq("uid", userId);

    if (error) throw error;
  },
};
