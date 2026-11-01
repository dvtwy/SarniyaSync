"use client";

import { useState, useMemo } from "react";
import { Search, PackageX, DollarSign, ClipboardList } from "lucide-react";

export interface AdjustmentReportItem {
  id: string;
  storeId: string;
  storeName: string;
  date: string;
  rawDate: string;
  productName: string;
  productSku: string;
  quantityChanged: number;
  costPrice: number;
  totalEstimatedLoss: number;
  reason: string;
  notes: string;
}

interface StoreOption {
  id: string;
  name: string;
  city?: string | null;
}

interface LaporanPenyesuaianClientProps {
  stores: StoreOption[];
  adjustments: AdjustmentReportItem[];
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

export default function LaporanPenyesuaianClient({
  stores,
  adjustments,
}: LaporanPenyesuaianClientProps) {
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedReason, setSelectedReason] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((item) => {
      if (selectedStore !== "all" && item.storeId !== selectedStore && !item.storeName.toLowerCase().includes(selectedStore.toLowerCase())) {
        return false;
      }
      if (selectedReason !== "all" && item.reason !== selectedReason) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.productName.toLowerCase().includes(q);
        const matchSku = item.productSku.toLowerCase().includes(q);
        const matchStore = item.storeName.toLowerCase().includes(q);
        const matchNotes = item.notes.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchStore && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [adjustments, selectedStore, selectedReason, searchQuery]);

  const stats = useMemo(() => {
    let units = 0;
    let loss = 0;
    for (const item of filteredAdjustments) {
      units += Math.abs(item.quantityChanged);
      loss += item.totalEstimatedLoss;
    }
    return {
      casesCount: filteredAdjustments.length,
      totalUnits: units,
      totalLoss: loss,
    };
  }, [filteredAdjustments]);

  function getReasonBadgeClass(reason: string) {
    const r = (reason || "").toLowerCase();
    if (r.includes("rusak") || r.includes("kotor")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (r.includes("cacat") || r.includes("defect")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (r.includes("hilang") || r.includes("selisih")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-gray-50 text-gray-700 border-gray-200";
  }

  return (
    <div className="space-y-4">
      <section aria-label="Metrik Penyesuaian" className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Total Kejadian / Kasus</p>
            <p className="mt-1 text-2xl font-black text-gray-900">
              {numberFormatter.format(stats.casesCount)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Catatan stock opname cabang</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-[#9D5C4C]">
            <ClipboardList size={20} />
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Total Unit Berkurang</p>
            <p className="mt-1 text-2xl font-black text-rose-700">
              {numberFormatter.format(stats.totalUnits)} unit
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Barang rusak, hilang, & kedaluwarsa</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <PackageX size={20} />
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-gradient-to-br from-rose-50/40 to-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-gray-500">Estimasi Kerugian Modal</p>
              <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-800">
                Modal
              </span>
            </div>
            <p className="mt-1 text-2xl font-black text-rose-700">
              {currencyFormatter.format(stats.totalLoss)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Kuantitas &times; harga beli produk</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <DollarSign size={20} />
          </div>
        </article>
      </section>

      <section aria-label="Filter Laporan" className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, toko mitra, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs sm:text-sm text-gray-800 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[190px]">
              <select
                id="filter-store"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs sm:text-sm text-gray-700 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C]"
              >
                <option value="all">Semua Toko Mitra</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.city ? `(${s.city})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[150px]">
              <select
                id="filter-reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs sm:text-sm text-gray-700 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C]"
              >
                <option value="all">Semua Alasan</option>
                <option value="Rusak Fisik / Kotor">Rusak Fisik / Kotor</option>
                <option value="Cacat Pabrik (Defect)">Cacat Pabrik (Defect)</option>
                <option value="Hilang / Selisih Hitung">Hilang / Selisih Hitung</option>
              </select>
            </div>

            {(selectedStore !== "all" || selectedReason !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStore("all");
                  setSelectedReason("all");
                  setSearchQuery("");
                }}
                className="h-10 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Tabel Riwayat Penyesuaian" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Riwayat Log Penyesuaian Cabang
            </h2>
            <p className="text-xs text-gray-500">
              Data terintegrasi dari seluruh gerai mitra secara real-time.
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {filteredAdjustments.length} Baris
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3">Tanggal</th>
                <th scope="col" className="px-4 py-3">Toko Mitra (Cabang)</th>
                <th scope="col" className="px-4 py-3">Nama Produk</th>
                <th scope="col" className="px-4 py-3 text-right">Kuantitas</th>
                <th scope="col" className="px-4 py-3 text-right">Est. Kerugian</th>
                <th scope="col" className="px-4 py-3">Alasan</th>
                <th scope="col" className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-500">
                    <ClipboardList className="mx-auto size-9 text-gray-300 mb-2" />
                    Tidak ada catatan penyesuaian stok yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                      {row.date}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">{row.storeName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.productName}</div>
                      <div className="font-mono text-xs text-gray-400">{row.productSku}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                        {row.quantityChanged} unit
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                      {row.totalEstimatedLoss > 0
                        ? currencyFormatter.format(row.totalEstimatedLoss)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getReasonBadgeClass(
                          row.reason
                        )}`}
                      >
                        {row.reason}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-600" title={row.notes}>
                      {row.notes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

