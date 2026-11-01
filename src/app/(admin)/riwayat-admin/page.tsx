import { redirect } from "next/navigation";
import type { Json } from "@/utils/supabase/database.types";
import { getProfileRole } from "@/utils/supabase/auth";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import AdminTransactionClient, {
  AdminTransaction,
  AdminTransactionItem,
} from "./admin-transaction-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Riwayat Transaksi | Admin SarniyaSync",
  description: "Laporan riwayat transaksi dan penjualan toko mitra SarniyaSync.",
};

const PAGE_SIZE = 1000;

function parseTransactionItems(items: Json): AdminTransactionItem[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, Json | undefined>;
    const quantity = Number(record.quantity);
    const unitPrice = Number(record.unit_price);
    const lineTotal = Number(record.line_total);

    return [
      {
        productId: typeof record.product_id === "string" ? record.product_id : "",
        name: typeof record.name === "string" ? record.name : "Produk",
        quantity: Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        lineTotal: Number.isFinite(lineTotal)
          ? lineTotal
          : Number.isFinite(unitPrice)
          ? unitPrice * quantity
          : 0,
      },
    ];
  });
}

export default async function AdminRiwayatPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/partner");

  const rawTransactions: Array<{
    id: string;
    transaction_number: string;
    partner_store_id: string;
    items: Json;
    total: number;
    payment_method: string | null;
    sold_at: string;
    status: string;
  }> = [];

  let errorMessage = "";

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("id, transaction_number, partner_store_id, items, total, payment_method, sold_at, status")
      .order("sold_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      errorMessage = error.message;
      break;
    }

    const page = (data ?? []) as typeof rawTransactions;
    rawTransactions.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const { data: stores, error: storesError } = await supabase
    .from("partner_stores")
    .select("id, name");

  if (!errorMessage && storesError) errorMessage = storesError.message;

  const storeMap = new Map((stores ?? []).map((store) => [store.id, store.name]));

  const transactions: AdminTransaction[] = rawTransactions.map((tx) => ({
    id: tx.id,
    transactionNumber: tx.transaction_number,
    partnerStoreId: tx.partner_store_id,
    storeName: storeMap.get(tx.partner_store_id) ?? "Toko tidak diketahui",
    soldAt: tx.sold_at,
    total: Number(tx.total || 0),
    paymentMethod: tx.payment_method,
    status: tx.status || "completed",
    items: parseTransactionItems(tx.items),
  }));

  const storeOptions = (stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
      <header className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[11px] font-bold text-terracotta-clay">
            Area Pemilik / Administrator
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Riwayat Transaksi
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Pantau seluruh riwayat transaksi penjualan mitra dengan filter tanggal terpadu dan ekspor data.
          </p>
        </div>
      </header>

      <AdminTransactionClient
        initialTransactions={transactions}
        stores={storeOptions}
        errorMessage={errorMessage}
      />
    </div>
  );
}
