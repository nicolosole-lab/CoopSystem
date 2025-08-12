// Force cache invalidation for staff data
import { queryClient } from "@/lib/queryClient";

console.log("Clearing React Query cache...");
queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
queryClient.clear();
console.log("Cache cleared successfully!");