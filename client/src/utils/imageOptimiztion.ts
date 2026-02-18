import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

export async function optimizeImageForUpload(
  imageUri: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    format = "jpeg",
  } = options;

  try {
    console.log("🖼️ Optimizing image...");
    console.log("📏 Max dimensions:", maxWidth, "x", maxHeight);
    console.log("🎯 Quality:", quality);

    // Validate input URI
    if (!imageUri || imageUri.trim() === "") {
      throw new Error("Invalid image URI provided");
    }

    // Get image info first
    const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });

    console.log("📊 Original image info:", imageInfo);

    // Validate image dimensions
    const { width: originalWidth, height: originalHeight } = imageInfo;
    if (
      !originalWidth ||
      !originalHeight ||
      originalWidth < 10 ||
      originalHeight < 10
    ) {
      throw new Error("Invalid image dimensions");
    }

    // Calculate resize dimensions while maintaining aspect ratio
    let { width: targetWidth, height: targetHeight } = imageInfo;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const aspectRatio = originalWidth / originalHeight;

      if (originalWidth > originalHeight) {
        targetWidth = Math.min(maxWidth, originalWidth);
        targetHeight = targetWidth / aspectRatio;
      } else {
        targetHeight = Math.min(maxHeight, originalHeight);
        targetWidth = targetHeight * aspectRatio;
      }
    }

    // Ensure minimum dimensions
    targetWidth = Math.max(100, Math.round(targetWidth));
    targetHeight = Math.max(100, Math.round(targetHeight));

    // Apply optimizations
    const manipulatorFormat =
      format === "jpeg"
        ? ImageManipulator.SaveFormat.JPEG
        : format === "png"
        ? ImageManipulator.SaveFormat.PNG
        : ImageManipulator.SaveFormat.WEBP;

    // Only specify ONE dimension to let expo-image-manipulator maintain aspect ratio perfectly
    // This prevents any potential cropping or distortion
    const needsResize = originalWidth > maxWidth || originalHeight > maxHeight;
    const resizeAction: ImageManipulator.Action[] = needsResize
      ? [
          {
            resize:
              originalWidth > originalHeight
                ? { width: targetWidth } // Landscape: constrain by width only
                : { height: targetHeight }, // Portrait: constrain by height only
          },
        ]
      : [];

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      resizeAction,
      {
        compress: quality,
        format: manipulatorFormat,
        base64: true,
      }
    );

    const base64Result = manipulatedImage.base64;
    if (!base64Result || base64Result.length < 1000) {
      throw new Error("Image optimization produced invalid result");
    }

    // Check file size (approximate)
    const estimatedSizeBytes = (base64Result.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (estimatedSizeBytes > maxSizeBytes) {
      console.warn(
        "⚠️ Image still too large after optimization, attempting higher compression..."
      );

      // Try with higher compression - only specify ONE dimension
      const smallerWidth = Math.round(targetWidth * 0.8);
      const smallerHeight = Math.round(targetHeight * 0.8);
      const recompressedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize:
              originalWidth > originalHeight
                ? { width: smallerWidth }
                : { height: smallerHeight },
          },
        ],
        {
          compress: 0.6,
          format: manipulatorFormat,
          base64: true,
        }
      );

      const recompressedBase64 = recompressedImage.base64;
      if (recompressedBase64 && recompressedBase64.length >= 1000) {
        console.log("✅ Image recompressed successfully");
        console.log(
          "📏 Final dimensions:",
          recompressedImage.width,
          "x",
          recompressedImage.height
        );
        console.log(
          "📦 Final base64 size:",
          recompressedBase64.length,
          "characters"
        );
        return recompressedBase64;
      }
    }

    console.log("✅ Image optimized successfully");
    console.log(
      "📏 Final dimensions:",
      manipulatedImage.width,
      "x",
      manipulatedImage.height
    );
    console.log("📦 Final base64 size:", base64Result.length, "characters");

    return base64Result;
  } catch (error) {
    console.error("💥 Image optimization failed:", error);
    throw new Error(
      `Failed to optimize image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function getOptimalImageSettings(
  purpose: "analysis" | "thumbnail" | "display"
): ImageOptimizationOptions {
  switch (purpose) {
    case "analysis":
      return {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85,
        format: "jpeg",
      };
    case "thumbnail":
      return {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.7,
        format: "jpeg",
      };
    case "display":
      return {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        format: "jpeg",
      };
    default:
      return {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        format: "jpeg",
      };
  }
}

export function estimateBase64Size(
  width: number,
  height: number,
  quality: number = 0.8
): number {
  // Rough estimation of base64 size in bytes
  const pixelCount = width * height;
  const bytesPerPixel = quality * 3; // RGB with compression
  const estimatedBytes = pixelCount * bytesPerPixel;
  const base64Overhead = 1.37; // Base64 encoding overhead

  return Math.round(estimatedBytes * base64Overhead);
}

export function shouldCompressImage(
  imageUri: string,
  maxSizeBytes: number = 1024 * 1024
): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      // For web, we can't easily get file size without loading it
      resolve(true);
      return;
    }

    // For mobile, always compress for consistency
    resolve(true);
  });
}

export const processImage = async (imageUri: string): Promise<string> => {
  try {
    console.log("🔄 Processing image:", imageUri);

    // If it's already a base64 data URL, extract the base64 part
    if (imageUri.startsWith("data:image/")) {
      const base64Data = imageUri.split(",")[1];
      if (base64Data) {
        console.log("✅ Image already in base64 format");
        return base64Data;
      }
    }

    // For file URIs, optimize and convert to base64
    const optimizedBase64 = await optimizeImageForUpload(imageUri, {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.85,
      format: "jpeg",
    });

    return optimizedBase64;
  } catch (error) {
    console.error("❌ Error processing image:", error);
    throw error;
  }
};
