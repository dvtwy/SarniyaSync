"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DailySales = {
  date: string;
  total: number;
};

type BestSeller = {
  productName: string;
  quantity: number;
};

type PartnerDashboardChartsProps = {
  dailySales: DailySales[];
  bestSellers: BestSeller[];
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

export default function PartnerDashboardCharts({
  dailySales,
  bestSellers,
}: PartnerDashboardChartsProps) {
  const maxQty = bestSellers.length > 0 ? bestSellers[0].quantity || 1 : 1;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section
        aria-label="Grafik tren penjualan harian"
        className="col-span-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2 flex flex-col"
      >
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-bold text-gray-900">Tren Penjualan Toko Saya (30 Hari Terakhir)</h2>
          <p className="mt-1 text-sm text-gray-500">Akumulasi pendapatan harian dari penjualan di toko Anda.</p>
        </div>
        <div className="h-72 w-full px-6 py-6 sm:h-80 flex-1">
          {dailySales.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Belum ada data transaksi dalam 30 hari terakhir.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailySales}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f2f5" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  tickFormatter={(value) => `Rp ${value >= 1000 ? value / 1000 + "K" : value}`}
                />
                <Tooltip
                  cursor={{ fill: "#f9fafb" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  }}
                  formatter={(value: unknown) => [currencyFormatter.format(Number(value) || 0), "Pendapatan"]}
                  labelStyle={{ color: "#111827", fontWeight: "bold", marginBottom: "4px" }}
                />
                <Bar dataKey="total" fill="#9d5c4c" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section
        aria-label="Produk terlaris toko saya"
        className="col-span-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col"
      >
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-bold text-gray-900">Produk Terlaris di Toko Saya</h2>
          <p className="mt-1 text-sm text-gray-500">Top produk paling laku bulan ini.</p>
        </div>
        <div className="flex-1 p-6">
          {bestSellers.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-gray-500">
              Belum ada data barang terjual bulan ini.
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {bestSellers.map((item, index) => {
                const percentage = Math.max(8, Math.round((item.quantity / maxQty) * 100));

                return (
                  <li key={item.productName} className="group flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            index === 0
                              ? "bg-terracotta-clay text-white"
                              : index === 1
                              ? "bg-orange-50 text-terracotta-clay border border-orange-200/60"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <p className="truncate text-sm font-semibold text-gray-900">{item.productName}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-gray-900">
                        {numberFormatter.format(item.quantity)} pcs
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-terracotta-clay transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
