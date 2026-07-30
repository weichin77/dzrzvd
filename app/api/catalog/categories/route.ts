import { getCatalogOverview } from "@/db/repositories/catalog";

export async function GET() {
  const overview = await getCatalogOverview();

  return Response.json(
    {
      status: overview.status,
      lastUpdatedAt: overview.lastUpdatedAt,
      categories: overview.categories.map((category) => ({
        categoryId: category.categoryId,
        slug: category.slug,
        name: category.name,
        productCount: category.products.length,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
