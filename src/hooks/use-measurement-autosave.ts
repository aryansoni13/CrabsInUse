import { useCallback, useRef, useEffect } from "react";
import { MeasurementRow } from "@/types";
import { measurementStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

interface AutoSaveConfig {
  measurementRows: MeasurementRow[];
  debounceMs?: number;
  onSaveComplete?: () => void;
}

export function useMeasurementAutoSave(config: AutoSaveConfig) {
  const { measurementRows, debounceMs = 1500, onSaveComplete } = config;
  const { toast } = useToast();
  const pendingUpdatesRef = useRef<Map<string, Partial<MeasurementRow>>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedRef = useRef<Date | null>(null);

  const flushPendingUpdates = useCallback(async () => {
    if (pendingUpdatesRef.current.size === 0 || isSavingRef.current) return;

    isSavingRef.current = true;
    const updates = new Map(pendingUpdatesRef.current);
    pendingUpdatesRef.current.clear();

    try {
      const promises = Array.from(updates.entries()).map(([rowId, updates]) =>
        measurementStorage.update(rowId, updates)
      );
      await Promise.all(promises);
      lastSavedRef.current = new Date();
      onSaveComplete?.();
    } catch (error) {
      console.error("Auto-save failed:", error);
      // Re-add failed updates to retry
      updates.forEach((value, key) => {
        pendingUpdatesRef.current.set(key, value);
      });
      toast({
        title: "Auto-save failed",
        description: "Changes will be retried automatically",
        variant: "destructive",
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [toast, onSaveComplete]);

  const scheduleAutoSave = useCallback(
    (rowId: string, updates: Partial<MeasurementRow>) => {
      // Merge updates for the same row
      const existingUpdates = pendingUpdatesRef.current.get(rowId) || {};
      pendingUpdatesRef.current.set(rowId, { ...existingUpdates, ...updates });

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule new save
      saveTimeoutRef.current = setTimeout(() => {
        flushPendingUpdates();
      }, debounceMs);
    },
    [debounceMs, flushPendingUpdates]
  );

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }
    };
  }, [flushPendingUpdates]);

  // Periodic save every 30 seconds if there are pending updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [flushPendingUpdates]);

  return {
    scheduleAutoSave,
    flushPendingUpdates,
    hasPendingChanges: () => pendingUpdatesRef.current.size > 0,
    lastSaved: () => lastSavedRef.current,
  };
}
