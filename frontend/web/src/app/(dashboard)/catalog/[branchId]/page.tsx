import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

/**
 * Catalog module — branch-scoped route (`/catalog/[branchId]`) so it sits in the
 * branch nav context (Phase 1). Placeholder until the product-catalog UI lands;
 * the backend routes (`/v1/catalog/*`) already exist.
 */
export default function CatalogPage() {
  return (
    <PagePlaceholder title="Catalog Management" message="Product catalog module coming soon." />
  );
}
