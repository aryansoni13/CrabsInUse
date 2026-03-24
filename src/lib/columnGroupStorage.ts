import { ColumnGroup } from "@/types";

// --- Local Storage Helper ---
const localDb = {
  get: <T>(key: string): T[] => {
    const data = localStorage.getItem(`crabs_${key}`);
    return data ? JSON.parse(data) : [];
  },
  save: <T>(key: string, data: T[]): void => {
    localStorage.setItem(`crabs_${key}`, JSON.stringify(data));
  },
};

export const columnGroupStorage = {
  async create(data: Omit<ColumnGroup, "id" | "createdAt" | "updatedAt">) {
    const groups = localDb.get<ColumnGroup>("column_groups");
    const newGroup = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ColumnGroup;
    groups.push(newGroup);
    localDb.save("column_groups", groups);
    return newGroup;
  },

  async update(id: string, data: Partial<ColumnGroup>) {
    const groups = localDb.get<ColumnGroup>("column_groups");
    const index = groups.findIndex((g) => g.id === id);
    if (index === -1) return data;
    const updated = {
      ...groups[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    groups[index] = updated;
    localDb.save("column_groups", groups);
    return updated;
  },

  async delete(id: string) {
    const groups = localDb.get<ColumnGroup>("column_groups");
    const filtered = groups.filter((g) => g.id !== id);
    localDb.save("column_groups", filtered);
    return true;
  },

  async getByOrderAndDepartment(
    orderId: string,
    department: string,
    userId: string,
  ) {
    const groups = localDb.get<ColumnGroup>("column_groups");
    return groups.filter(
      (g) =>
        g.orderId === orderId &&
        g.department === department &&
        g.userId === userId,
    );
  },
};

