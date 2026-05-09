import { AxiosError } from "axios";

/** Turn FastAPI / axios errors into a single user-visible string. */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.code === "ERR_NETWORK") {
      return "Network error — check your connection and that the API is running.";
    }
    const data = error.response?.data as { detail?: unknown } | undefined;
    const d = data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((item) => {
          if (typeof item === "object" && item !== null && "msg" in item) {
            const loc = "loc" in item && Array.isArray((item as { loc?: unknown }).loc)
              ? `${(item as { loc: unknown[] }).loc.filter((x) => x !== "body").join(" · ")}: `
              : "";
            return `${loc}${(item as { msg: string }).msg}`;
          }
          return String(item);
        })
        .join(" ");
    }
    if (error.response?.status) {
      return `Request failed (${error.response.status}).`;
    }
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
