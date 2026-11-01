import { createSupabaseServerClient } from "@/utils/supabase/server";
import AddProductModal from "@/components/admin/AddProductModal";
import ProductTableClient from "./product-table-client";

export const metadata = {
  title: "Katalog Produk | SarniyaSync",
  description: "Kelola seluruh produk katalog SarniyaSync — tambah, lihat harga modal, harga jual, dan stok pusat.",
};

export default async function ProdukPage() {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sku, name, category, cost_price, selling_price, stock_quantity, image_url, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-[11px] font-bold text-terracotta-clay">
            Area Pemilik / Administrator
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Katalog Produk
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Katalog visual produk pusat dengan stok, harga jual, dan aksi kelola.
          </p>
        </div>

        <AddProductModal />
      </header>

      <ProductTableClient products={products ?? []} errorMessage={error?.message} />
    </div>
  );
}
