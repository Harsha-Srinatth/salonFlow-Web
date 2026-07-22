function resolveDefaultApiBaseUrl() {
    if (typeof window === "undefined") {
        return "http://localhost:8080";
    }
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const hostname = window.location.hostname || "localhost";
    return `${protocol}//${hostname}:8080`;
}
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? resolveDefaultApiBaseUrl()).replace(/\/$/, "");
export function toApiUrl(path) {
    if (/^https?:\/\//.test(path))
        return path;
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
