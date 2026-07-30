import { getCatalogOverview } from "@/db/repositories/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");
  const overview = await getCatalogOverview();
  const categories = categoryId
    ? overview.categories.filter(
        (category) => category.categoryId === categoryId,
      )
    : overview.categories;

  return Response.json(
    {
      status: overview.status,
      lastUpdatedAt: overview.lastUpdatedAt,
      products: categories.flatMap((category) =>
        category.products.map((product) => ({
          ...product,
          categorySlug: category.slug,
          categoryName: category.name,
        }))
      ),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
