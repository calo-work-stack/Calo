import crypto from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Get encryption key from environment or generate a secure default
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (key) {
    // If key is provided, ensure it's 32 bytes (256 bits)
    return crypto.scryptSync(key, "calo-salt", 32);
  }
  // Fallback for development - in production, ENCRYPTION_KEY must be set
  console.warn(
    "⚠️ ENCRYPTION_KEY not set - using default key. Set ENCRYPTION_KEY in production!",
  );
  return crypto.scryptSync(
    "default-dev-key-change-in-production",
    "calo-salt",
    32,
  );
};

const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypt sensitive data
 * Returns: iv:authTag:encryptedData (all base64 encoded)
 */
export function encrypt(text: string): string {
  if (!text) return text;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt sensitive data
 * Expects format: iv:authTag:encryptedData
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  // Check if text is encrypted (contains the separator pattern)
  if (!encryptedText.includes(":")) {
    // Not encrypted, return as-is (for backwards compatibility)
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      // Not in expected format, return as-is
      return encryptedText;
    }

    const [ivBase64, authTagBase64, encrypted] = parts;

    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    // If decryption fails, the data might not be encrypted
    // Return as-is for backwards compatibility
    console.warn("Decryption failed, returning original text");
    return encryptedText;
  }
}

/**
 * Create a searchable hash of the email for lookups
 * This allows finding users by email without exposing the actual email
 */
export function hashEmail(email: string): string {
  if (!email) return email;
  const normalized = email.toLowerCase().trim();
  return crypto
    .createHmac("sha256", ENCRYPTION_KEY)
    .update(normalized)
    .digest("hex");
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  const parts = text.split(":");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Encrypt user sensitive fields
 */
export function encryptUserData(userData: {
  email?: string;
  phone_number?: string;
  name?: string;
}): {
  email?: string;
  email_hash?: string;
  phone_number?: string;
  name?: string;
} {
  const result: any = { ...userData };

  if (userData.email) {
    result.email_hash = hashEmail(userData.email);
    result.email = encrypt(userData.email);
  }

  if (userData.name) {
    result.name = encrypt(userData.name);
  }

  if (userData.phone_number) {
    result.phone_number = encrypt(userData.phone_number);
  }

  return result;
}

/**
 * Decrypt user sensitive fields
 */
export function decryptUserData(userData: any): any {
  if (!userData) return userData;

  const result = { ...userData };

  if (result.email && isEncrypted(result.email)) {
    result.email = decrypt(result.email);
  }

  if (result.name && isEncrypted(result.name)) {
    result.name = decrypt(result.name);
  }

  if (result.phone_number && isEncrypted(result.phone_number)) {
    result.phone_number = decrypt(result.phone_number);
  }

  return result;
}

export const EncryptionService = {
  encrypt,
  decrypt,
  hashEmail,
  isEncrypted,
  encryptUserData,
  decryptUserData,
};
