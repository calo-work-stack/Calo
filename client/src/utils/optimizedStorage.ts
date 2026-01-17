import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Optimized AsyncStorage utility that prevents "more than 10 items" error
 * and handles SQLITE_FULL errors gracefully by implementing debouncing,
 * batching, queue management, and automatic cleanup.
 */

interface QueuedOperation {
  key: string;
  value: string | null;
  type: "set" | "remove";
  timestamp: number;
}

/**
 * Check if error is a storage full error
 */
const isStorageFullError = (error: any): boolean => {
  const message = error?.message || "";
  return (
    message.includes("database or disk is full") ||
    message.includes("SQLITE_FULL") ||
    message.includes("row too big") ||
    message.includes("CursorWindow") ||
    error?.code === 13 ||
    message.includes("No space left") ||
    message.includes("disk full")
  );
};

class OptimizedStorage {
  private operationQueue: Map<string, QueuedOperation> = new Map();
  private processingQueue: boolean = false;
  private cleanupInProgress: boolean = false;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly DEBOUNCE_MS = 100; // Debounce writes by 100ms
  private readonly BATCH_SIZE = 5; // Process max 5 operations at once
  private readonly QUEUE_DELAY_MS = 50; // Delay between batches

  // Keys to preserve during emergency cleanup
  private readonly KEYS_TO_PRESERVE = [
    "persist:auth",
    "userToken",
    "userId",
    "@user_id",
    "@auth_token",
  ];

  /**
   * Emergency cleanup when storage is full
   */
  private async performEmergencyCleanup(): Promise<boolean> {
    if (this.cleanupInProgress) return false;
    this.cleanupInProgress = true;

    try {
      console.log("🆘 [OptimizedStorage] Emergency cleanup triggered...");

      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(
        (key) => !this.KEYS_TO_PRESERVE.some((preserve) => key.includes(preserve))
      );

      console.log(`🗑️ [OptimizedStorage] Removing ${keysToRemove.length} of ${allKeys.length} keys`);

      // Remove in batches
      const batchSize = 10;
      for (let i = 0; i < keysToRemove.length; i += batchSize) {
        const batch = keysToRemove.slice(i, i + batchSize);
        try {
          await AsyncStorage.multiRemove(batch);
        } catch (e) {
          // Try removing one by one
          for (const key of batch) {
            try {
              await AsyncStorage.removeItem(key);
            } catch (innerErr) {
              // Continue with next key
            }
          }
        }
      }

      console.log("✅ [OptimizedStorage] Emergency cleanup completed");
      return true;
    } catch (error) {
      console.error("❌ [OptimizedStorage] Emergency cleanup failed:", error);
      return false;
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Set item with debouncing to prevent rapid successive writes
   */
  async setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing debounce timer for this key
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Queue the operation
      this.operationQueue.set(key, {
        key,
        value,
        type: "set",
        timestamp: Date.now(),
      });

      // Set debounce timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        await this.processQueue();
        resolve();
      }, this.DEBOUNCE_MS);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Remove item with debouncing
   */
  async removeItem(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing debounce timer
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Queue the operation
      this.operationQueue.set(key, {
        key,
        value: null,
        type: "remove",
        timestamp: Date.now(),
      });

      // Set debounce timer
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(key);
        await this.processQueue();
        resolve();
      }, this.DEBOUNCE_MS);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Get item - direct read, no queuing needed
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  /**
   * Process queued operations in batches with SQLITE_FULL error handling
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.operationQueue.size === 0) {
      return;
    }

    this.processingQueue = true;
    let encounteredStorageError = false;

    try {
      // Get operations sorted by timestamp
      const operations = Array.from(this.operationQueue.values()).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Process in batches
      for (let i = 0; i < operations.length; i += this.BATCH_SIZE) {
        const batch = operations.slice(i, i + this.BATCH_SIZE);

        // Execute batch operations in parallel
        await Promise.all(
          batch.map(async (op) => {
            try {
              if (op.type === "set" && op.value !== null) {
                await AsyncStorage.setItem(op.key, op.value);
              } else if (op.type === "remove") {
                await AsyncStorage.removeItem(op.key);
              }
              // Remove from queue after successful operation
              this.operationQueue.delete(op.key);
            } catch (error: any) {
              if (isStorageFullError(error)) {
                console.warn(`⚠️ [OptimizedStorage] Storage full error for ${op.key}`);
                encounteredStorageError = true;
                // Remove from queue to prevent infinite retries
                this.operationQueue.delete(op.key);
              } else {
                console.error(`Error processing ${op.type} for ${op.key}:`, error);
                // Keep in queue for retry on next process
              }
            }
          })
        );

        // Small delay between batches to prevent overload
        if (i + this.BATCH_SIZE < operations.length) {
          await new Promise((resolve) => setTimeout(resolve, this.QUEUE_DELAY_MS));
        }
      }

      // If we encountered storage errors, perform cleanup
      if (encounteredStorageError) {
        console.log("🆘 [OptimizedStorage] Running emergency cleanup after storage errors...");
        await this.performEmergencyCleanup();
      }
    } catch (error: any) {
      console.error("Error processing storage queue:", error);

      if (isStorageFullError(error)) {
        await this.performEmergencyCleanup();
        // Clear the queue to prevent infinite retries
        this.operationQueue.clear();
      }
    } finally {
      this.processingQueue = false;

      // If more operations were queued during processing, process them
      if (this.operationQueue.size > 0) {
        setTimeout(() => this.processQueue(), this.QUEUE_DELAY_MS);
      }
    }
  }

  /**
   * Flush all pending operations immediately (useful before app closes)
   */
  async flush(): Promise<void> {
    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    // Process remaining queue
    await this.processQueue();
  }

  /**
   * Clear all storage (use with caution)
   */
  async clear(): Promise<void> {
    this.operationQueue.clear();
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    await AsyncStorage.clear();
  }

  /**
   * Get multiple items efficiently
   */
  async multiGet(keys: string[]): Promise<readonly [string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error("Error in multiGet:", error);
      return keys.map((key) => [key, null] as [string, string | null]);
    }
  }

  /**
   * Set multiple items efficiently
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    // Batch the operations
    for (let i = 0; i < keyValuePairs.length; i += this.BATCH_SIZE) {
      const batch = keyValuePairs.slice(i, i + this.BATCH_SIZE);

      await Promise.all(
        batch.map(([key, value]) => this.setItem(key, value))
      );

      if (i + this.BATCH_SIZE < keyValuePairs.length) {
        await new Promise((resolve) => setTimeout(resolve, this.QUEUE_DELAY_MS));
      }
    }
  }
}

// Export singleton instance
export const optimizedStorage = new OptimizedStorage();

// Export helper functions for easy migration from AsyncStorage
export const setItem = (key: string, value: string) => optimizedStorage.setItem(key, value);
export const getItem = (key: string) => optimizedStorage.getItem(key);
export const removeItem = (key: string) => optimizedStorage.removeItem(key);
export const multiGet = (keys: string[]) => optimizedStorage.multiGet(keys);
export const multiSet = (pairs: [string, string][]) => optimizedStorage.multiSet(pairs);
export const flush = () => optimizedStorage.flush();
export const clear = () => optimizedStorage.clear();
