/**
 * Cloudinary serves originals unless asked otherwise. Catalog thumbnails are about 100px, so ask
 * for a small auto-format (WebP/AVIF), auto-quality crop. Other URLs pass through untouched.
 * `height` defaults to a square; the details carousel asks for a wide crop.
 */
export function serviceImageUrl(url, size = 192, height = size) {
  if (!url || typeof url !== "string") return "";
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (at === -1 || url.includes(`${marker}f_auto`)) return url;
  const head = url.slice(0, at + marker.length);
  return `${head}f_auto,q_auto,w_${size},h_${height},c_fill,g_auto/${url.slice(at + marker.length)}`;
}
