import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Optimized AsyncStorage utility that prevents "more than 10 items" error
 * by implementing debouncing, batching, and queue management
 */

interface QueuedOperation {
  key: string;
  value: string | null;
  type: "set" | "remove";
  timestamp: number;
}

class OptimizedStorage {
  private operationQueue: Map<string, QueuedOperation> = new Map();
  private processingQueue: boolean = false;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 100; // Debounce writes by 100ms
  private readonly BATCH_SIZE = 5; // Process max 5 operations at once
  private readonly QUEUE_DELAY_MS = 50; // Delay between batches

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
   * Process queued operations in batches
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.operationQueue.size === 0) {
      return;
    }

    this.processingQueue = true;

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
            } catch (error) {
              console.error(
                `Error processing ${op.type} for ${op.key}:`,
                error
              );
              // Keep in queue for retry on next process
            }
          })
        );

        // Small delay between batches to prevent overload
        if (i + this.BATCH_SIZE < operations.length) {
          await new Promise((resolve) => setTimeout(resolve, this.QUEUE_DELAY_MS));
        }
      }
    } catch (error) {
      console.error("Error processing storage queue:", error);
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
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error("Error in multiGet:", error);
      return keys.map((key) => [key, null]);
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
