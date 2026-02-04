import { API_BASE_URL } from "../constants";

// Allowed domains for external image URLs (whitelist)
const ALLOWED_IMAGE_DOMAINS = [
  "ui-avatars.com",
  "localhost",
  // Add trusted CDN/storage domains as needed
] as const;

/**
 * Validates and resolves image URLs with domain whitelist enforcement.
 * - Relative URLs are prefixed with API_BASE_URL
 * - Absolute URLs are validated against the allowed domains whitelist
 * - Invalid/untrusted URLs return undefined for security
 */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Handle blob URLs (local file previews - trusted)
  if (url.startsWith("blob:")) {
    return url;
  }

  // Handle relative URLs (trusted - from our API)
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `${API_BASE_URL}${url}`;
  }

  // Validate absolute URLs against whitelist
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if hostname matches any allowed domain
    const isAllowed = ALLOWED_IMAGE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (isAllowed) {
      return url;
    }

    // Also allow URLs from the same origin as API_BASE_URL
    const apiUrl = new URL(API_BASE_URL);
    if (hostname === apiUrl.hostname.toLowerCase()) {
      return url;
    }

    console.warn(`Blocked untrusted image URL domain: ${hostname}`);
    return undefined;
  } catch {
    // Invalid URL format
    console.warn(`Invalid image URL format: ${url}`);
    return undefined;
  }
}
