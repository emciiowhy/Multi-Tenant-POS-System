import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

/**
 * Inventory module — branch-scoped route (`/inventory/[branchId]`) so it sits in
 * the branch nav context (Phase 1). Placeholder until the stock-control UI lands;
 * the backend routes (`/v1/inventory/*`) already exist.
 */
export default function InventoryPage() {
  return (
    <PagePlaceholder title="Inventory Control" message="Inventory tracking module coming soon." />
  );
}
