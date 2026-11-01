"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ClipboardList, Search } from "lucide-react";
import StockAdjustmentModal, {
  ProductOption,
} from "@/components/partner/StockAdjustmentModal";

export interface AdjustmentHistoryItem {
  id: string;
  date: string;
  productName: string;
  productSku: string;
  quantityChanged: number;
  reason: "Rusak" | "Hilang" | "Kedaluwarsa" | string;
  notes: string;
}

interface StockOpnameClientProps {
  mitraId?: string;
  storeName: string;
  products: ProductOption[];
  initialHistory: AdjustmentHistoryItem[];
}

export default function StockOpnameClient({
  storeName,
  products,
  initialHistory,
}: StockOpnameClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [history, setHistory] = useState<AdjustmentHistoryItem[]>(initialHistory);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  const filteredHistory = history.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getReasonBadge(reason: string) {
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
    <div className="w-full space-y-4 px-2 py-3 sm:px-4 sm:py-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-xs font-bold text-terracotta-clay">
              Portal Mitra
            </span>
            <span className="text-xs text-gray-500">&bull; {storeName}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            Penyesuaian Stok (Stock Opname)
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Catat riwayat barang rusak, cacat, atau selisih hitung.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#9D5C4C] px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#864c3e] active:scale-95"
        >
          <Plus size={16} />
          Tambah Penyesuaian
        </button>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Cari berdasarkan produk, SKU, atau alasan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs text-gray-800 outline-none transition focus:border-[#9D5C4C] focus:ring-1 focus:ring-[#9D5C4C]"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-800">
            Riwayat Penyesuaian Terkini
          </h2>
          <p className="text-xs text-gray-500">
            Menampilkan seluruh catatan selisih stok fisik gerai toko mitra.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-3">Tanggal</th>
                <th scope="col" className="px-4 py-3">Nama Produk</th>
                <th scope="col" className="px-4 py-3 text-right">Kuantitas</th>
                <th scope="col" className="px-4 py-3">Alasan</th>
                <th scope="col" className="px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-gray-500">
                    <ClipboardList className="mx-auto size-8 text-gray-300 mb-2" />
                    Belum ada data penyesuaian stok fisik yang dicatat.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                      {row.date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.productName}</div>
                      <div className="font-mono text-xs text-gray-500">{row.productSku}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                        {row.quantityChanged} unit
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getReasonBadge(
                          row.reason
                        )}`}
                      >
                        {row.reason}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-600" title={row.notes}>
                      {row.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <StockAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        onSuccess={() => {
          router.refresh();
          setTimeout(() => {
            window.location.reload();
          }, 250);
        }}
      />
    </div>
  );
}

