import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import DashboardCharts from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";

type LowStockItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  location: string;
};

type RecentTransaction = {
  id: string;
  transaction_number: string;
  sold_at: string;
  total: number;
  store_name: string;
};

type TransactionItem = {
  name?: string;
  quantity?: number | string;
  cost_price?: number | string;
};

type MonthlyTransactionRow = {
  total: number | string | null;
  items: TransactionItem[] | null;
  sold_at: string;
  payment_method: string | null;
  partner_stores: { name: string | null } | { name: string | null }[] | null;
};

type AdminMitraInventoryRow = {
  id: string;
  stock_quantity: number;
  partner_stores: { name: string | null } | { name: string | null }[] | null;
  products: { sku: string | null; name: string | null; category: string | null } | { sku: string | null; name: string | null; category: string | null }[] | null;
};

type AdminRecentTxRow = {
  id: string;
  transaction_number: string;
  sold_at: string;
  total: number;
  partner_stores: { name: string | null } | { name: string | null }[] | null;
};

type AdjustmentRow = {
  quantity_changed: number | null;
  products: { cost_price: number | null } | { cost_price: number | null }[] | null;
};

const numberFormatter = new Intl.NumberFormat("id-ID");
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const loadError = "";

  let todayRevenue = 0;
  let todayTransactionCount = 0;
  let todayQris = 0;
  let todayTransfer = 0;
  let todayTunai = 0;

  let totalOmzet = 0;
  let totalItemsSold = 0;
  let activePartnersCount = 0;
  let totalHPP = 0;
  let totalLabaKotor = 0;
  let totalKerugianPenyusutan = 0;
  let totalUnitPenyusutan = 0;

  const lowStockItems: LowStockItem[] = [];
  let recentTransactions: RecentTransaction[] = [];

  const salesByDate: Record<string, { date: string; timestamp: number; total: number }> = {};
  const salesByPartner: Record<string, number> = {};
  const salesByProduct: Record<string, number> = {};

  try {
    const now = new Date();
    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(now.getDate() - 30);
    const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: recentMonthTransactions, error: txError } = (await supabase
      .from("sales_transactions")
      .select(`
        total,
        items,
        sold_at,
        payment_method,
        partner_stores ( name )
      `)
      .gte("sold_at", thirtyDaysAgo)
      .order("sold_at", { ascending: true })) as unknown as {
      data: MonthlyTransactionRow[] | null;
      error: { message: string } | null;
    };

    if (txError) throw txError;

    if (recentMonthTransactions) {
      for (const tx of recentMonthTransactions) {
        const total = Number(tx.total || 0);
        const txDate = new Date(tx.sold_at);
        const isToday = txDate.toDateString() === now.toDateString();
        const isThisMonth = tx.sold_at >= startOfMonth;

        if (isToday) {
          todayRevenue += total;
          todayTransactionCount += 1;
          const method = String(tx.payment_method || "cash").toLowerCase().trim();
          if (method === "qris") {
            todayQris += total;
          } else if (method === "transfer") {
            todayTransfer += total;
          } else {
            todayTunai += total;
          }
        }

        const dateKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}-${String(txDate.getDate()).padStart(2, "0")}`;
        const dateString = txDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = {
            date: dateString,
            timestamp: new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime(),
            total: 0,
          };
        }
        salesByDate[dateKey].total += total;

        if (isThisMonth) {
          totalOmzet += total;
          
          const rawStore = Array.isArray(tx.partner_stores)
            ? tx.partner_stores[0]
            : tx.partner_stores;
          const storeName: string = rawStore?.name?.trim() || "Unknown Store";
             
          salesByPartner[storeName] = (salesByPartner[storeName] || 0) + total;

          if (Array.isArray(tx.items)) {
            for (const item of tx.items) {
               const record = item as TransactionItem;
               if (record && typeof record === 'object' && record.quantity && record.name) {
                   const qty = Number(record.quantity);
                   totalItemsSold += qty;
                   salesByProduct[record.name] = (salesByProduct[record.name] || 0) + qty;
                   
                   // Kalkulasi HPP dan laba kotor transaksi berjalan
                   if (isThisMonth && record.cost_price) {
                     totalHPP += qty * Number(record.cost_price);
                   }
               }
            }
          }
        }
      }
    }

    // Fallback: hitung HPP dari master produk jika belum tercatat di riwayat transaksi
    if (totalHPP === 0 && recentMonthTransactions && recentMonthTransactions.length > 0) {
      const productNameSet = new Set<string>();
      for (const tx of recentMonthTransactions) {
        const isThisMonth = tx.sold_at >= startOfMonth;
        if (!isThisMonth) continue;
        if (Array.isArray(tx.items)) {
          for (const item of tx.items as TransactionItem[]) {
            if (item?.name) productNameSet.add(item.name);
          }
        }
      }

      if (productNameSet.size > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("name, cost_price")
          .in("name", Array.from(productNameSet));

        if (productsData && productsData.length > 0) {
          const costByName = new Map(productsData.map((p) => [p.name, Number(p.cost_price || 0)]));

          for (const tx of recentMonthTransactions) {
            if (tx.sold_at < startOfMonth) continue;
            if (Array.isArray(tx.items)) {
              for (const item of tx.items as TransactionItem[]) {
                if (item?.name && item?.quantity) {
                  const costPrice = costByName.get(item.name) ?? 0;
                  totalHPP += Number(item.quantity) * costPrice;
                }
              }
            }
          }
        }
      }
    }

    totalLabaKotor = totalOmzet - totalHPP;

    const dailySales = Object.values(salesByDate)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({ date, total }) => ({ date, total }));

    const topPartners = Object.entries(salesByPartner)
        .map(([storeName, totalSales]) => ({ storeName, totalSales }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5);

    const bestSellers = Object.entries(salesByProduct)
        .map(([productName, quantity]) => ({ productName, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    const { count: partnersCount, error: partnersError } = await supabase
      .from("partner_stores")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (partnersError) throw partnersError;
    activePartnersCount = partnersCount || 0;

    const { data: pusatProducts, error: pusatError } = await supabase
      .from("products")
      .select("id, sku, name, category, stock_quantity")
      .lt("stock_quantity", 10)
      .order("stock_quantity", { ascending: true });

    if (pusatError) throw pusatError;
    if (pusatProducts) {
      pusatProducts.forEach(p => {
        lowStockItems.push({
          id: `pusat-${p.id}`,
          sku: p.sku,
          name: p.name,
          category: p.category,
          stock: p.stock_quantity,
          location: "Pusat",
        });
      });
    }

    const { data: mitraInventory, error: mitraError } = (await supabase
      .from("partner_store_inventory")
      .select(`
        id,
        stock_quantity,
        partner_stores ( name ),
        products ( sku, name, category )
      `)
      .lt("stock_quantity", 10)
      .order("stock_quantity", { ascending: true })) as unknown as {
      data: AdminMitraInventoryRow[] | null;
      error: { message: string } | null;
    };

    if (mitraError) throw mitraError;
    if (mitraInventory) {
      mitraInventory.forEach((inv) => {
        const product = Array.isArray(inv.products) ? inv.products[0] : inv.products;
        const store = Array.isArray(inv.partner_stores) ? inv.partner_stores[0] : inv.partner_stores;
        
        if (product && store) {
            lowStockItems.push({
            id: `mitra-${inv.id}`,
            sku: product.sku || "-",
            name: product.name || "-",
            category: product.category || "-",
            stock: inv.stock_quantity,
            location: `Mitra: ${store.name}`,
            });
        }
      });
    }

    lowStockItems.sort((a, b) => a.stock - b.stock);
    const displayLowStockItems = lowStockItems.slice(0, 5);

    const { data: recentData, error: recentError } = (await supabase
      .from("sales_transactions")
      .select(`
        id,
        transaction_number,
        sold_at,
        total,
        partner_stores ( name )
      `)
      .order("sold_at", { ascending: false })
      .limit(5)) as unknown as {
      data: AdminRecentTxRow[] | null;
      error: { message: string } | null;
    };
      
    if (recentError) throw recentError;
    if (recentData) {
      recentTransactions = recentData.map((tx) => {
        const store = Array.isArray(tx.partner_stores) ? tx.partner_stores[0] : tx.partner_stores;
        return {
            id: tx.id,
            transaction_number: tx.transaction_number,
            sold_at: tx.sold_at,
            total: tx.total,
            store_name: store?.name || "Unknown Store",
        };
      });
    }
    const displayRecentTransactions = recentTransactions.slice(0, 5);

    try {
      const { data: adjustmentsData } = await supabase
        .from("stock_adjustments")
        .select(`
          quantity_changed,
          products ( cost_price )
        `)
        .lt("quantity_changed", 0)
        .gte("created_at", startOfMonth);

      if (adjustmentsData) {
        for (const item of adjustmentsData as unknown as AdjustmentRow[]) {
          const qtyLost = Math.abs(Number(item.quantity_changed || 0));
          const prod = Array.isArray(item.products) ? item.products[0] : item.products;
          const cost = Number(prod?.cost_price || 0);
          totalUnitPenyusutan += qtyLost;
          totalKerugianPenyusutan += qtyLost * cost;
        }
      }
    } catch {
    }

    const metrics: Array<{
      label: string;
      value: string;
      detail: string;
      valueClass: string;
      isProfit?: boolean;
      isLoss?: boolean;
    }> = [
      {
        label: "Total Omzet Bulan Ini",
        value: loadError ? "—" : currencyFormatter.format(totalOmzet),
        detail: "Pendapatan dari seluruh transaksi",
        valueClass: "text-[#9d5c4c]",
      },
      {
        label: "Estimasi Laba Kotor",
        value: loadError ? "—" : currencyFormatter.format(totalLabaKotor),
        detail: "Omzet dikurangi total harga modal",
        valueClass: totalLabaKotor >= 0 ? "text-emerald-700" : "text-rose-700",
        isProfit: true,
      },
      {
        label: "Kerugian Penyusutan",
        value: loadError ? "—" : currencyFormatter.format(totalKerugianPenyusutan),
        detail: `${numberFormatter.format(totalUnitPenyusutan)} unit rusak/hilang`,
        valueClass: "text-rose-700",
        isLoss: true,
      },
      {
        label: "Total Barang Terjual",
        value: loadError ? "—" : numberFormatter.format(totalItemsSold),
        detail: "Unit terjual bulan ini",
        valueClass: "text-[#cc8c7d]",
      },
      {
        label: "Total Mitra Aktif",
        value: loadError ? "—" : numberFormatter.format(activePartnersCount),
        detail: "Toko mitra yang beroperasi",
        valueClass: "text-[#cc8c7d]",
      },
    ];

    return (
      <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
        <header className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[11px] font-bold text-terracotta-clay">
              Ringkasan Operasional
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
              Dashboard Admin
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Pantau performa penjualan, stok, dan mitra secara real-time.
            </p>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="mb-4 rounded-xl border border-rose-300 bg-rose-50/95 px-4 py-2.5 text-xs text-rose-800">
            {loadError}
          </p>
        )}

        <section aria-label="Ringkasan Pendapatan Hari Ini" className="mb-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3.5 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 border border-orange-200/60 text-terracotta-clay">
                  Hari Ini
                </span>
                <span className="text-xs text-gray-500">
                  {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Total Transaksi Hari Ini:{" "}
                <span className="font-bold text-gray-900">
                  {numberFormatter.format(todayTransactionCount)} transaksi
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-gradient-to-br from-terracotta-clay to-rosy-taupe p-3.5 text-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                      Pendapatan Hari Ini
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white border border-white/30 backdrop-blur-sm">
                      Live
                    </span>
                  </div>
                  <p className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                    {currencyFormatter.format(todayRevenue)}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-white/80">
                  Total omzet dari seluruh transaksi hari ini
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Metode QRIS</span>
                    <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      QRIS
                    </span>
                  </div>
                  <p className="mt-2 text-lg sm:text-xl font-black text-gray-900">
                    {currencyFormatter.format(todayQris)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-gray-900">
                    {todayRevenue > 0 ? Math.round((todayQris / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Metode Transfer</span>
                    <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Transfer
                    </span>
                  </div>
                  <p className="mt-2 text-lg sm:text-xl font-black text-gray-900">
                    {currencyFormatter.format(todayTransfer)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-gray-900">
                    {todayRevenue > 0 ? Math.round((todayTransfer / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Metode Tunai</span>
                    <span className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                      Tunai
                    </span>
                  </div>
                  <p className="mt-2 text-lg sm:text-xl font-black text-gray-900">
                    {currencyFormatter.format(todayTunai)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5 text-[11px] text-gray-500">
                  <span>Porsi hari ini</span>
                  <span className="font-bold text-gray-900">
                    {todayRevenue > 0 ? Math.round((todayTunai / todayRevenue) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Statistik Utama" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={`rounded-xl p-3.5 shadow-sm border border-gray-200 flex flex-col justify-between ${
                metric.isProfit
                  ? "bg-gradient-to-br from-emerald-50/50 to-white"
                  : metric.isLoss
                  ? "bg-gradient-to-br from-rose-50/40 to-white"
                  : "bg-white"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500">{metric.label}</p>
                  {metric.isProfit && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                      Laba
                    </span>
                  )}
                  {metric.isLoss && (
                    <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      Penyusutan
                    </span>
                  )}
                </div>
                <p className={`mt-2 break-words text-xl font-black ${metric.valueClass}`}>
                  {metric.value}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-gray-400">{metric.detail}</p>
            </article>
          ))}
        </section>

        <div className="mb-4">
          <DashboardCharts 
            dailySales={dailySales} 
            topPartners={topPartners} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <section
            aria-label="Produk Terlaris"
            className="h-full flex flex-col rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Produk Terlaris</h2>
                <p className="text-[11px] text-gray-500">Top 5 produk terfavorit bulan ini.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-[10px] font-bold text-terracotta-clay">
                Top 5
              </span>
            </div>

            <div className="flex-1 flex flex-col p-4">
              {bestSellers.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-6 my-auto">
                  Belum ada data penjualan produk.
                </p>
              ) : (
                <div
                  className={`flex flex-col flex-1 ${
                    bestSellers.length >= 4 ? "justify-between" : "justify-start gap-2.5"
                  }`}
                >
                  {bestSellers.map((item, index) => (
                    <div
                      key={item.productName}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[11px] font-bold text-gray-700">
                          #{index + 1}
                        </span>
                        <p
                          className="truncate text-xs font-bold text-gray-800"
                          title={item.productName}
                        >
                          {item.productName}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-orange-50 border border-orange-200/60 px-2 py-0.5 text-[11px] font-bold tabular-nums text-terracotta-clay">
                        {numberFormatter.format(item.quantity)} pcs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section
            aria-label="Transaksi Terbaru"
            className="h-full flex flex-col rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Transaksi Terbaru</h2>
                <p className="text-[11px] text-gray-500">5 penjualan gerai kasir terakhir.</p>
              </div>
              <Link
                href="/penjualan"
                className="text-[11px] font-bold text-terracotta-clay hover:underline"
              >
                Semua &rarr;
              </Link>
            </div>

            <div className="flex-1 flex flex-col p-4">
              {loadError ? (
                <p className="px-3 py-6 text-center text-xs text-gray-500 my-auto">
                  Daftar transaksi belum tersedia.
                </p>
              ) : displayRecentTransactions.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-gray-500 my-auto">
                  Belum ada transaksi.
                </p>
              ) : (
                <div
                  className={`flex flex-col flex-1 divide-y divide-gray-100 ${
                    displayRecentTransactions.length >= 4 ? "justify-between" : "justify-start gap-2"
                  }`}
                >
                  {displayRecentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 hover:bg-gray-50 transition-colors rounded-lg"
                    >
                      <div className="min-w-0">
                        <p
                          className="font-bold text-gray-800 truncate max-w-[130px]"
                          title={tx.store_name}
                        >
                          {tx.store_name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {tx.transaction_number}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-black text-terracotta-clay text-xs">
                          {currencyFormatter.format(tx.total)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {dateFormatter.format(new Date(tx.sold_at))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section
            aria-label="Peringatan stok menipis"
            className="h-full flex flex-col rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-terracotta-clay">Stok Menipis</h2>
                <p className="text-[11px] text-gray-500">Maksimal 5 item kritis (&lt; 10 unit).</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                {loadError ? "—" : `${displayLowStockItems.length} item`}
              </span>
            </div>

            <div className="flex-1 flex flex-col p-4">
              {loadError ? (
                <p className="px-3 py-6 text-center text-xs text-gray-500 my-auto">
                  Daftar peringatan belum tersedia.
                </p>
              ) : displayLowStockItems.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-gray-500 my-auto">
                  Tidak ada produk menipis.
                </p>
              ) : (
                <div
                  className={`flex flex-col flex-1 divide-y divide-gray-100 ${
                    displayLowStockItems.length >= 4 ? "justify-between" : "justify-start gap-2"
                  }`}
                >
                  {displayLowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 hover:bg-gray-50 transition-colors rounded-lg"
                    >
                      <div className="min-w-0">
                        <p
                          className="font-bold text-gray-800 truncate max-w-[140px]"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {item.location}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span
                          className={`inline-flex min-w-[2.2rem] justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                            item.stock === 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-orange-50 text-terracotta-clay border border-orange-200/60"
                          }`}
                        >
                          {numberFormatter.format(item.stock)} pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  } catch (error) {
    void error;
    return (
        <div className="p-8">
            <p className="text-red-500">Gagal memuat dashboard. Periksa koneksi ke database.</p>
        </div>
    );
  }
}
