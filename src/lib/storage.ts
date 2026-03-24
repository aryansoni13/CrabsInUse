import {
  Project,
  Order,
  Item,
  MeasurementRow,
  Department,
  RABill,
  CustomColumn,
} from "@/types";

// --- Local Storage Helper ---
const localDb = {
  get: <T>(key: string): T[] => {
    const data = localStorage.getItem(`crabs_${key}`);
    return data ? JSON.parse(data) : [];
  },
  save: <T>(key: string, data: T[]): void => {
    localStorage.setItem(`crabs_${key}`, JSON.stringify(data));
  },
  insert: <T extends { id: string; createdAt: string; updatedAt: string }>(
    key: string,
    item: Omit<T, "id" | "createdAt" | "updatedAt">,
  ): T => {
    const items = localDb.get<T>(key);
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;
    items.push(newItem);
    localDb.save(key, items);
    return newItem;
  },
  update: <T extends { id: string; updatedAt: string }>(
    key: string,
    id: string,
    updates: Partial<Omit<T, "id" | "createdAt">>,
  ): T | null => {
    const items = localDb.get<T>(key);
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return null;
    const updatedItem = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    } as T;
    items[index] = updatedItem;
    localDb.save(key, items);
    return updatedItem;
  },
  delete: (key: string, id: string): boolean => {
    const items = localDb.get<{ id: string }>(key);
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    localDb.save(key, filtered);
    return true;
  },
  query: <T>(key: string, filter: (item: T) => boolean): T[] => {
    return localDb.get<T>(key).filter(filter);
  },
};

// --- Projects ---
export const projectStorage = {
  getAll: async (userId: string): Promise<Project[]> => {
    return localDb.query<Project>("projects", (p) => p.userId === userId);
  },

  create: async (
    project: Omit<Project, "id" | "createdAt" | "updatedAt">,
  ): Promise<Project> => {
    return localDb.insert<Project>("projects", project);
  },

  update: async (
    id: string,
    updates: Partial<Omit<Project, "id" | "createdAt">>,
  ): Promise<Project | null> => {
    return localDb.update<Project>("projects", id, updates);
  },

  delete: async (id: string): Promise<boolean> => {
    // Also delete related orders
    const orders = localDb.query<Order>("orders", (o) => o.projectId === id);
    for (const order of orders) {
      await orderStorage.delete(order.id);
    }
    return localDb.delete("projects", id);
  },

  getById: async (id: string): Promise<Project | null> => {
    const projects = localDb.get<Project>("projects");
    return projects.find((p) => p.id === id) || null;
  },
};

// --- Orders ---
export const orderStorage = {
  getAll: async (userId: string): Promise<Order[]> => {
    return localDb.query<Order>("orders", (o) => o.userId === userId);
  },

  getByProjectId: async (
    projectId: string,
    userId: string,
  ): Promise<Order[]> => {
    return localDb.query<Order>(
      "orders",
      (o) => o.projectId === projectId && o.userId === userId,
    );
  },

  create: async (
    order: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">,
  ): Promise<Order> => {
    const orderNumber = `${Date.now().toString().slice(-6)}`;
    return localDb.insert<Order>("orders", {
      ...order,
      orderNumber,
    } as any);
  },

  update: async (
    id: string,
    updates: Partial<Omit<Order, "id" | "orderNumber" | "createdAt">>,
  ): Promise<Order | null> => {
    return localDb.update<Order>("orders", id, updates);
  },

  delete: async (id: string): Promise<boolean> => {
    // Also delete related items
    const items = localDb.query<Item>("items", (i) => i.orderId === id);
    for (const item of items) {
      await itemStorage.delete(item.id);
    }
    return localDb.delete("orders", id);
  },

  getById: async (id: string): Promise<Order | null> => {
    const orders = localDb.get<Order>("orders");
    return orders.find((o) => o.id === id) || null;
  },
};

// --- Items ---
export const itemStorage = {
  getAll: async (userId: string): Promise<Item[]> => {
    return localDb.query<Item>("items", (i) => i.userId === userId);
  },

  getByOrderId: async (orderId: string, userId: string): Promise<Item[]> => {
    return localDb.query<Item>(
      "items",
      (i) => i.orderId === orderId && i.userId === userId,
    );
  },

  create: async (
    item: Omit<Item, "id" | "amount" | "createdAt" | "updatedAt">,
  ): Promise<Item> => {
    const amount = item.quantity * item.unitRate;
    return localDb.insert<Item>("items", {
      ...item,
      amount,
    } as any);
  },

  update: async (
    id: string,
    updates: Partial<Omit<Item, "id" | "createdAt">>,
  ): Promise<Item | null> => {
    const items = localDb.get<Item>("items");
    const current = items.find((i) => i.id === id);
    if (!current) return null;

    let amount = current.amount;
    if (updates.quantity !== undefined || updates.unitRate !== undefined) {
      const q = updates.quantity ?? current.quantity;
      const r = updates.unitRate ?? current.unitRate;
      amount = q * r;
    }

    return localDb.update<Item>("items", id, { ...updates, amount });
  },

  delete: async (id: string): Promise<boolean> => {
    // Also delete related measurements
    const measures = localDb.query<MeasurementRow>(
      "measurement_rows",
      (m) => m.itemId === id,
    );
    for (const m of measures) {
      localDb.delete("measurement_rows", m.id);
    }
    return localDb.delete("items", id);
  },

  getById: async (id: string): Promise<Item | null> => {
    const items = localDb.get<Item>("items");
    return items.find((i) => i.id === id) || null;
  },
};

// --- Measurement Rows ---
export const measurementStorage = {
  getAll: async (userId: string): Promise<MeasurementRow[]> => {
    return localDb.query<MeasurementRow>(
      "measurement_rows",
      (m) => m.userId === userId,
    );
  },

  getByItemId: async (
    itemId: string,
    userId: string,
  ): Promise<MeasurementRow[]> => {
    return localDb.query<MeasurementRow>(
      "measurement_rows",
      (m) => m.itemId === itemId && m.userId === userId,
    );
  },

  getByItemIds: async (
    itemIds: string[],
    userId: string,
  ): Promise<MeasurementRow[]> => {
    if (itemIds.length === 0) return [];
    return localDb.query<MeasurementRow>(
      "measurement_rows",
      (m) => itemIds.includes(m.itemId) && m.userId === userId,
    );
  },

  create: async (
    row: Omit<MeasurementRow, "id" | "createdAt" | "updatedAt">,
  ): Promise<MeasurementRow> => {
    return localDb.insert<MeasurementRow>("measurement_rows", row);
  },

  update: async (
    id: string,
    updates: Partial<Omit<MeasurementRow, "id" | "createdAt">>,
  ): Promise<MeasurementRow | null> => {
    return localDb.update<MeasurementRow>("measurement_rows", id, updates);
  },

  delete: async (id: string): Promise<boolean> => {
    return localDb.delete("measurement_rows", id);
  },

  updateCustomField: async (
    rowId: string,
    columnId: string,
    value: string | number | null,
  ): Promise<boolean> => {
    const row = await measurementStorage.update(rowId, {});
    if (!row) return false;

    const customFields = row.customFields || {};
    customFields[columnId] = value;

    await localDb.update<MeasurementRow>("measurement_rows", rowId, {
      customFields,
    });
    return true;
  },
};

// --- Departments ---
export const departmentStorage = {
  getAll: async (userId: string): Promise<Department[]> => {
    return localDb.query<Department>(
      "departments",
      (d) => d.userId === userId,
    );
  },

  create: async (name: string, userId: string): Promise<Department> => {
    const departments = localDb.get<Department>("departments");
    const existing = departments.find(
      (d) => d.name === name && d.userId === userId,
    );
    if (existing) return existing;

    return localDb.insert<Department>("departments", {
      name,
      userId,
    } as any);
  },

  getOrCreate: async (name: string, userId: string): Promise<Department> => {
    return await departmentStorage.create(name, userId);
  },
};

// --- RA Bills ---
export const raBillStorage = {
  getAll: async (userId: string): Promise<RABill[]> => {
    return localDb.query<RABill>("ra_bills", (b) => b.userId === userId);
  },

  getByOrderId: async (orderId: string, userId: string): Promise<RABill[]> => {
    return localDb.query<RABill>(
      "ra_bills",
      (b) => b.orderId === orderId && b.userId === userId,
    );
  },

  create: async (
    raBill: Omit<RABill, "id" | "createdAt" | "updatedAt">,
  ): Promise<RABill> => {
    return localDb.insert<RABill>("ra_bills", raBill);
  },

  getById: async (id: string): Promise<RABill | null> => {
    const bills = localDb.get<RABill>("ra_bills");
    return bills.find((b) => b.id === id) || null;
  },
};

// --- Custom Columns ---
export const customColumnStorage = {
  getAll: async (userId: string): Promise<CustomColumn[]> => {
    return localDb.query<CustomColumn>(
      "custom_columns",
      (c) => c.userId === userId,
    );
  },

  getByDepartment: async (
    department: string,
    userId: string,
  ): Promise<CustomColumn[]> => {
    return localDb
      .query<CustomColumn>(
        "custom_columns",
        (c) => c.department === department && c.userId === userId,
      )
      .sort((a, b) => a.position - b.position);
  },

  create: async (
    column: Omit<CustomColumn, "id" | "createdAt" | "updatedAt">,
  ): Promise<CustomColumn> => {
    return localDb.insert<CustomColumn>("custom_columns", column);
  },

  update: async (
    id: string,
    updates: Partial<Omit<CustomColumn, "id" | "createdAt">>,
  ): Promise<CustomColumn | null> => {
    return localDb.update<CustomColumn>("custom_columns", id, updates);
  },

  delete: async (id: string): Promise<boolean> => {
    return localDb.delete("custom_columns", id);
  },

  reorderPositions: async (
    department: string,
    columnIds: string[],
  ): Promise<void> => {
    const columns = localDb.get<CustomColumn>("custom_columns");
    for (let i = 0; i < columnIds.length; i++) {
      const index = columns.findIndex((c) => c.id === columnIds[i]);
      if (index !== -1) {
        columns[index].position = i;
        columns[index].updatedAt = new Date().toISOString();
      }
    }
    localDb.save("custom_columns", columns);
  },
};

// --- Utils ---
export const initializeSampleData = async (userId: string): Promise<void> => {
  const projects = await projectStorage.getAll(userId);
  if (projects.length > 0) return;

  await departmentStorage.create("Structure", userId);
  await departmentStorage.create("Piping", userId);
  await departmentStorage.create("Cable Tray", userId);

  const sampleProject = await projectStorage.create({
    name: "Shivam Enterprises Project (Local)",
    clientName: "Shivam Enterprises",
    userId,
  });

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
  const keys = [
    "projects",
    "orders",
    "items",
    "measurement_rows",
    "departments",
    "ra_bills",
    "custom_columns",
    "column_groups",
    "users",
  ];
  keys.forEach((key) => {
    const items = localDb.get<any>(key);
    const filtered = items.filter((i: any) => i.userId !== userId && i.uid !== userId);
    localDb.save(key, filtered);
  });
};

// --- Users ---
export interface LocalUser {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  mobileNumber?: string;
  gstNumber?: string;
  updatedAt?: string;
}

export const userStorage = {
  create: async (userId: string, data: any): Promise<void> => {
    const users = localDb.get<LocalUser>("users");
    const index = users.findIndex((u) => u.uid === userId);
    const newUser = {
      ...data,
      uid: userId,
      updatedAt: new Date().toISOString(),
    };
    if (index !== -1) {
      users[index] = newUser;
    } else {
      users.push(newUser);
    }
    localDb.save("users", users);
  },

  get: async (userId: string): Promise<LocalUser | null> => {
    const users = localDb.get<LocalUser>("users");
    return users.find((u) => u.uid === userId) || null;
  },

  update: async (userId: string, updates: any): Promise<void> => {
    const users = localDb.get<LocalUser>("users");
    const index = users.findIndex((u) => u.uid === userId);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      localDb.save("users", users);
    }
  },
};

