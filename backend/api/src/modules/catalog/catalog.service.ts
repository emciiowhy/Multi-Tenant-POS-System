import { and, eq, isNull } from "drizzle-orm";
import { tables, withCompany } from "@vendme/db";
import type {
  CreateProductInput,
  CreateStockItemInput,
  CreateVariantInput,
  DefineRecipeInput,
} from "@vendme/contracts";
import { badRequest } from "../../lib/context.js";

export async function createStockItem(
  companyId: string,
  input: CreateStockItemInput,
) {
  return withCompany(companyId, async (tx) => {
    const [row] = await tx
      .insert(tables.stockItems)
      .values({ companyId, name: input.name, unit: input.unit })
      .returning();
    return row!;
  });
}

export async function createProduct(companyId: string, input: CreateProductInput) {
  return withCompany(companyId, async (tx) => {
    const [row] = await tx
      .insert(tables.products)
      .values({
        companyId,
        name: input.name,
        kind: input.kind,
        price: input.price,
        sku: input.sku ?? null,
      })
      .returning();
    return row!;
  });
}

export async function listProducts(companyId: string) {
  return withCompany(companyId, async (tx) => {
    return tx
      .select()
      .from(tables.products)
      .where(
        and(eq(tables.products.companyId, companyId), isNull(tables.products.deletedAt)),
      );
  });
}

export async function createVariant(companyId: string, input: CreateVariantInput) {
  return withCompany(companyId, async (tx) => {
    // Confirm the product belongs to this company (RLS already scopes, but we
    // return a clean 400 rather than an FK error).
    const product = await tx
      .select({ id: tables.products.id })
      .from(tables.products)
      .where(eq(tables.products.id, input.productId))
      .limit(1);
    if (product.length === 0) throw badRequest("Unknown product");

    const [row] = await tx
      .insert(tables.productVariants)
      .values({
        companyId,
        productId: input.productId,
        name: input.name,
        barcode: input.barcode ?? null,
        priceDelta: input.priceDelta,
      })
      .returning();
    return row!;
  });
}

/** Replaces the product's bill of materials with the supplied components. */
export async function defineRecipe(companyId: string, input: DefineRecipeInput) {
  return withCompany(companyId, async (tx) => {
    await tx
      .delete(tables.recipes)
      .where(
        and(
          eq(tables.recipes.companyId, companyId),
          eq(tables.recipes.productId, input.productId),
        ),
      );
    if (input.components.length > 0) {
      await tx.insert(tables.recipes).values(
        input.components.map((c) => ({
          companyId,
          productId: input.productId,
          stockItemId: c.stockItemId,
          quantity: c.quantity,
        })),
      );
    }
    return { productId: input.productId, components: input.components.length };
  });
}
