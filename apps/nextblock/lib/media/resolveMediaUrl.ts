const BUNDLED_PUBLIC_MEDIA_KEYS = new Set([
  'images/NBcover.webp',
  'images/cap.webp',
  'images/commerce-plan.webp',
  'images/commerce-square.webp',
  'images/commerce-wide.webp',
  'images/developer.webp',
  'images/extensibility.webp',
  'images/goals.webp',
  'images/included.webp',
  'images/metadata_image.webp',
  'images/nextblock-logo-small.webp',
  'images/nx-graph.webp',
  'images/pants.webp',
  'images/programmer-upscaled.webp',
  'images/t-shirt.webp',
]);

export function resolveMediaUrl(
  objectKey?: string | null,
  baseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL || ''
) {
  if (!objectKey) return null;

  if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) {
    return objectKey;
  }

  if (objectKey.startsWith('/')) {
    return objectKey;
  }

  if (BUNDLED_PUBLIC_MEDIA_KEYS.has(objectKey)) {
    return `/${objectKey}`;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedObjectKey = objectKey.replace(/^\/+/, '');

  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/${normalizedObjectKey}`
    : `/${normalizedObjectKey}`;
}
