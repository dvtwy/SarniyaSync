import { redirect } from "next/navigation";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import LaporanPenyesuaianClient, {
  AdjustmentReportItem,
} from "./laporan-penyesuaian-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Laporan Penyesuaian Stok (Stock Opname) | SarniyaSync",
  description: "Monitoring log penyusutan barang rusak, hilang, dan kedaluwarsa dari seluruh cabang toko mitra.",
};

interface StockAdjustmentProductRelation {
  name: string | null;
  sku: string | null;
  cost_price: number | null;
}

interface StockAdjustmentRecord {
  id: string;
  mitra_id: string;
  quantity_changed: number;
  reason: string;
  notes: string | null;
  created_at: string;
  products: StockAdjustmentProductRelation | StockAdjustmentProductRelation[] | null;
}

export default async function AdminStockAdjustmentReportPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") {
    redirect("/dashboard-mitra");
  }

  const { data: storesData } = await supabase
    .from("partner_stores")
    .select("id, name, city, owner_id")
    .order("name", { ascending: true });

  const stores = storesData ?? [];
  const storeMapByOwner = new Map(stores.map((s) => [s.owner_id, s]));
  const storeMapById = new Map(stores.map((s) => [s.id, s]));

  let adjustments: AdjustmentReportItem[] = [];
  try {
    const { data: adjustmentsData, error: adjError } = (await supabase
      .from("stock_adjustments")
      .select(`
        id,
        mitra_id,
        quantity_changed,
        reason,
        notes,
        created_at,
        products (
          name,
          sku,
          cost_price
        )
      `)
      .order("created_at", { ascending: false })) as unknown as {
      data: StockAdjustmentRecord[] | null;
      error: { message: string } | null;
    };

    if (!adjError && adjustmentsData) {
      adjustments = adjustmentsData.map((item: StockAdjustmentRecord) => {
        const prod = Array.isArray(item.products) ? item.products[0] : item.products;
        const matchedStore = storeMapByOwner.get(item.mitra_id) || storeMapById.get(item.mitra_id);

        const storeName = matchedStore ? matchedStore.name : "Toko Mitra";
        const storeCity = matchedStore?.city ? `(${matchedStore.city})` : "";
        const costPrice = Number(prod?.cost_price || 0);
        const qtyChanged = Number(item.quantity_changed || 0);

        return {
          id: item.id,
          storeId: matchedStore?.id || item.mitra_id,
          storeName: `${storeName} ${storeCity}`.trim(),
          date: new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(item.created_at)),
          rawDate: item.created_at,
          productName: prod?.name || "Produk Tidak Dikenal",
          productSku: prod?.sku || "-",
          quantityChanged: qtyChanged,
          costPrice,
          totalEstimatedLoss: Math.abs(qtyChanged) * costPrice,
          reason: item.reason || "Lainnya",
          notes: item.notes || "-",
        };
      });
    }
  } catch {
    adjustments = [];
  }

  return (
    <div className="w-full space-y-4 px-2 py-3 sm:px-4 sm:py-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-bold text-terracotta-clay">
            Gudang & Audit Pusat
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Laporan Penyesuaian Stok (Stock Opname)
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Pantau dan audit seluruh riwayat barang rusak, hilang, dan kedaluwarsa dari cabang toko mitra.
          </p>
        </div>
      </header>

      <LaporanPenyesuaianClient
        stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
        adjustments={adjustments}
      />
    </div>
  );
}

