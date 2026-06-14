import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "../api/catalog";
import type { OrderFormType } from "../types";

export function useCatalog(formType: OrderFormType = "AG_GROW") {
  return useQuery({
    queryKey: ["catalog", formType],
    queryFn: () => catalogApi.get(formType),
    staleTime: 60_000,
  });
}
