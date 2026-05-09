import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalog";

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: () => catalogApi.get(),
    staleTime: 60_000,
  });
}
