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

type PartnerPerformance = {
  storeName: string;
  totalSales: number;
};

type DashboardChartsProps = {
  dailySales: DailySales[];
  topPartners: PartnerPerformance[];
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function DashboardCharts({
  dailySales,
  topPartners,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-8 gap-4 items-stretch">
      <section
        aria-label="Grafik Tren Penjualan"
        className="lg:col-span-5 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col justify-between h-full border border-gray-200"
      >
        <div className="border-b border-gray-100 px-4 py-3 sm:px-5 flex flex-col gap-0.5">
          <h2 className="text-sm sm:text-base font-black text-gray-900">
            Grafik Tren Penjualan (30 Hari Terakhir)
          </h2>
          <p className="text-xs text-gray-500">
            Akumulasi pendapatan harian dari seluruh transaksi gerai mitra.
          </p>
        </div>

        <div className="h-72 w-full p-3 sm:p-4 flex-1 flex flex-col justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailySales}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(value) => `Rp ${value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${value / 1000}K`}`}
              />
              <Tooltip
                cursor={{ fill: "rgba(204, 151, 135, 0.08)" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                }}
                formatter={(value: unknown) => [currencyFormatter.format(Number(value) || 0), "Pendapatan"]}
                labelStyle={{ color: "#111827", fontWeight: "bold", marginBottom: "3px" }}
              />
              <Bar
                dataKey="total"
                fill="#cc9787"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section
        aria-label="Leaderboard Mitra Terbaik"
        className="lg:col-span-3 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col justify-between h-full border border-gray-200"
      >
        <div className="border-b border-gray-100 px-4 py-3 sm:px-5 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-gray-900">
              Leaderboard Mitra Terbaik
            </h2>
            <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200/60 px-2 py-0.5 text-[10px] font-bold text-terracotta-clay">
              Bulan Ini
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Top 5 gerai mitra dengan akumulasi omzet tertinggi.
          </p>
        </div>

        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-around">
          {topPartners.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8">
              Belum ada data penjualan mitra bulan ini.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {topPartners.map((partner, index) => {
                const maxSales = topPartners[0].totalSales || 1;
                const percentage = Math.max(4, Math.round((partner.totalSales / maxSales) * 100));

                return (
                  <div key={partner.storeName} className="group">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex size-5.5 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                            index === 0
                              ? "bg-terracotta-clay text-white"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="text-xs sm:text-[13px] font-bold text-gray-800 truncate">
                          {partner.storeName}
                        </span>
                      </div>
                      <span className="text-xs sm:text-[13px] font-black tabular-nums text-terracotta-clay shrink-0 ml-2">
                        {currencyFormatter.format(partner.totalSales)}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-terracotta-clay to-rosy-taupe transition-all duration-700 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
