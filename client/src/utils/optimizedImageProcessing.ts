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
   * Maintains original aspect ratio - never crops the image
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
      console.log("🖼️ Starting image optimization...");
      const startTime = Date.now();

      // First, get original image dimensions without modifying
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const originalWidth = imageInfo.width;
      const originalHeight = imageInfo.height;
      console.log(`📐 Original dimensions: ${originalWidth}x${originalHeight}`);

      // Calculate target dimensions maintaining aspect ratio
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (originalWidth > maxWidth || originalHeight > maxHeight) {
        const aspectRatio = originalWidth / originalHeight;

        if (aspectRatio > 1) {
          // Landscape: constrain by width
          targetWidth = Math.min(maxWidth, originalWidth);
          targetHeight = Math.round(targetWidth / aspectRatio);
        } else {
          // Portrait or square: constrain by height
          targetHeight = Math.min(maxHeight, originalHeight);
          targetWidth = Math.round(targetHeight * aspectRatio);
        }

        // Ensure we don't exceed either dimension
        if (targetWidth > maxWidth) {
          targetWidth = maxWidth;
          targetHeight = Math.round(targetWidth / aspectRatio);
        }
        if (targetHeight > maxHeight) {
          targetHeight = maxHeight;
          targetWidth = Math.round(targetHeight * aspectRatio);
        }
      }

      console.log(`📐 Target dimensions: ${targetWidth}x${targetHeight}`);

      // Only resize if dimensions changed
      // IMPORTANT: Only specify ONE dimension to let expo-image-manipulator maintain aspect ratio perfectly
      // This prevents any potential cropping or distortion
      const actions: ImageManipulator.Action[] = [];
      if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
        // Use only one dimension constraint - the library will calculate the other
        const aspectRatio = originalWidth / originalHeight;
        if (aspectRatio > 1) {
          // Landscape: constrain by width only
          actions.push({ resize: { width: targetWidth } });
        } else {
          // Portrait or square: constrain by height only
          actions.push({ resize: { height: targetHeight } });
        }
      }

      // Process the image
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: quality,
          format:
            format === "jpeg"
              ? ImageManipulator.SaveFormat.JPEG
              : ImageManipulator.SaveFormat.PNG,
          base64: false, // Don't get base64 yet to save memory
        }
      );

      console.log(`📐 Final dimensions: ${manipResult.width}x${manipResult.height}`);

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: "base64",
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
   * Preserves aspect ratio - never crops
   */
  async processThumbnail(imageUri: string): Promise<string> {
    return this.processImage(imageUri, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.6,
      format: "jpeg",
    });
  }

  /**
   * Add to cache with size limit
   */
  private addToCache(key: string, value: string): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      // Fix: Handle undefined case
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
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
   * Preserves full image content - never crops
   */
  async processForAnalysis(imageUri: string): Promise<string> {
    console.log("⚡ Ultra-fast processing for analysis...");
    try {
      // Use compression but preserve aspect ratio
      const result = await this.processImage(imageUri, {
        maxWidth: 1024, // Increased for better AI recognition
        maxHeight: 1024,
        quality: 0.75, // Slightly higher quality for better analysis
        format: "jpeg",
      });

      // Validate size isn't too large
      const sizeKB = result.length / 1024;
      if (sizeKB > 800) {
        console.warn(
          `⚠️ Image still large (${sizeKB.toFixed(2)} KB), re-compressing...`
        );
        // Recompress with lower quality but keep same dimensions
        return this.processImage(imageUri, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.6,
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
