import { supabase } from "./supabase";
import { ColumnGroup } from "@/types";

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

// Helper to convert camelCase to snake_case
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

export const columnGroupStorage = {
  async create(data: Omit<ColumnGroup, "id" | "createdAt" | "updatedAt">) {
    const { data: result, error } = await supabase
      .from("column_groups")
      .insert(toSnakeCase(data))
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(result) as ColumnGroup;
  },

  async update(id: string, data: Partial<ColumnGroup>) {
    const { data: result, error } = await supabase
      .from("column_groups")
      .update({
        ...toSnakeCase(data),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(result) as Partial<ColumnGroup>;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from("column_groups")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  },

  async getByOrderAndDepartment(
    orderId: string,
    department: string,
    userId: string,
  ) {
    const { data, error } = await supabase
      .from("column_groups")
      .select("*")
      .eq("order_id", orderId)
      .eq("department", department)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map(toCamelCase) as ColumnGroup[];
  },
};
