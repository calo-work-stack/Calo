import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png";
}

/**
 * Optimized image processing with aggressive compression and caching
 */
class OptimizedImageProcessor {
  private cache: Map<string, string> = new Map();
  private readonly CACHE_MAX_SIZE = 5; // Keep max 5 images in memory
  private readonly MAX_IMAGE_SIZE = 800; // Reduced from 1024 for faster processing
  private readonly DEFAULT_QUALITY = 0.7; // Reduced from 0.8 for smaller file size

  /**
   * Process and optimize image with caching
   */
  async processImage(
    imageUri: string,
    options: ImageOptimizationOptions = {}
  ): Promise<string> {
    // Check cache first
    const cacheKey = `${imageUri}-${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      console.log("📦 Using cached image");
      return this.cache.get(cacheKey)!;
    }

    const maxWidth = options.maxWidth || this.MAX_IMAGE_SIZE;
    const maxHeight = options.maxHeight || this.MAX_IMAGE_SIZE;
    const quality = options.quality || this.DEFAULT_QUALITY;
    const format = options.format || "jpeg";

    try {
      console.log("🖼️  Starting image optimization...");
      const startTime = Date.now();

      // Resize and compress image
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight,
            },
          },
        ],
        {
          compress: quality,
          format: format === "jpeg" ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
          base64: false, // Don't get base64 yet to save memory
        }
      );

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Clean up temp file
      try {
        await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
      } catch (cleanupError) {
        console.warn("Failed to cleanup temp file:", cleanupError);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Image optimized in ${processingTime}ms`);
      console.log(`📊 Image size: ${(base64.length / 1024).toFixed(2)} KB`);

      // Add to cache
      this.addToCache(cacheKey, base64);

      return base64;
    } catch (error) {
      console.error("❌ Image optimization failed:", error);
      throw error;
    }
  }

  /**
   * Fast processing for preview/thumbnail
   */
  async processThumbnail(imageUri: string): Promise<string> {
    return this.processImage(imageUri, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.5,
      format: "jpeg",
    });
  }

  /**
   * Add to cache with size limit
   */
  private addToCache(key: string, value: string): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear();
    console.log("🧹 Image cache cleared");
  }

  /**
   * Get cache size in MB
   */
  getCacheSize(): number {
    let totalSize = 0;
    this.cache.forEach((value) => {
      totalSize += value.length;
    });
    return totalSize / (1024 * 1024);
  }

  /**
   * Ultra-fast compression for analysis
   * Optimized specifically for AI analysis where quality can be lower
   */
  async processForAnalysis(imageUri: string): Promise<string> {
    console.log("⚡ Ultra-fast processing for analysis...");

    try {
      // Use aggressive compression
      const result = await this.processImage(imageUri, {
        maxWidth: 800, // Smaller for faster upload
        maxHeight: 800,
        quality: 0.65, // Lower quality is fine for AI
        format: "jpeg",
      });

      // Validate size isn't too large
      const sizeKB = result.length / 1024;
      if (sizeKB > 500) {
        console.warn(`⚠️  Image still large (${sizeKB.toFixed(2)} KB), re-compressing...`);
        // Recompress with even lower quality
        return this.processImage(imageUri, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.5,
          format: "jpeg",
        });
      }

      return result;
    } catch (error) {
      console.error("Failed to process image for analysis:", error);
      throw error;
    }
  }
}

// Export singleton
export const optimizedImageProcessor = new OptimizedImageProcessor();

// Export convenience functions
export const processImage = (uri: string, options?: ImageOptimizationOptions) =>
  optimizedImageProcessor.processImage(uri, options);

export const processThumbnail = (uri: string) =>
  optimizedImageProcessor.processThumbnail(uri);

export const processForAnalysis = (uri: string) =>
  optimizedImageProcessor.processForAnalysis(uri);

export const clearImageCache = () => optimizedImageProcessor.clearCache();

export const getImageCacheSize = () => optimizedImageProcessor.getCacheSize();
