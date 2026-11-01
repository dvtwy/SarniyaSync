"use client";

import { useState, useMemo } from "react";

const numberFormatter = new Intl.NumberFormat("id-ID");
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function getCategoryBadgeClass(category: string | null | undefined): string {
  const cat = String(category || "").toLowerCase().trim();
  if (cat.includes("pashmina")) {
    return "bg-purple-100 text-purple-700";
  }
  if (cat.includes("bergo")) {
    return "bg-orange-100 text-orange-700";
  }
  if (cat.includes("segi empat") || cat.includes("segiempat") || cat.includes("square")) {
    return "bg-teal-100 text-teal-700";
  }
  return "bg-gray-100 text-gray-700";
}

export type PartnerStockProduct = {
  allocationId: string;
  storeName: string;
  stock_quantity: number;
  id: string;
  sku: string;
  name: string;
  category: string;
  selling_price: number;
  image_url: string | null;
};

type PartnerStockClientProps = {
  initialInventory: PartnerStockProduct[];
};

export default function PartnerStockClient({ initialInventory }: PartnerStockClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [stockSortOrder, setStockSortOrder] = useState<"default" | "asc" | "desc">("default");

  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    for (const item of initialInventory) {
      if (item.category && item.category.trim()) {
        categoriesSet.add(item.category.trim());
      }
    }
    const defaults = ["Pashmina", "Bergo", "Segi empat"];
    for (const d of defaults) {
      categoriesSet.add(d);
    }
    return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b));
  }, [initialInventory]);

  const filteredAndSortedInventory = useMemo(() => {
    let result = [...initialInventory];

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q)),
      );
    }

    if (selectedCategory !== "Semua") {
      result = result.filter(
        (item) => (item.category || "").toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    result.sort((a, b) => {
      if (stockSortOrder === "asc") {
        return a.stock_quantity - b.stock_quantity;
      }
      if (stockSortOrder === "desc") {
        return b.stock_quantity - a.stock_quantity;
      }

      const katA = (a.category || "").toLowerCase();
      const katB = (b.category || "").toLowerCase();
      if (katA < katB) return -1;
      if (katA > katB) return 1;

      const namaA = a.name.toLowerCase();
      const namaB = b.name.toLowerCase();
      if (namaA < namaB) return -1;
      if (namaA > namaB) return 1;

      return 0;
    });

    return result;
  }, [initialInventory, searchQuery, selectedCategory, stockSortOrder]);

  return (
    <section aria-label="Inventori toko mitra" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Produk Toko</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Menampilkan {filteredAndSortedInventory.length} dari {initialInventory.length} alokasi produk
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-8 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs font-bold text-gray-400 hover:text-terracotta-clay"
              >
                ✕
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter Kategori"
              className="h-10 w-full sm:w-auto rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20 shadow-sm cursor-pointer"
            >
              <option value="Semua">Semua Kategori</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={stockSortOrder}
              onChange={(e) => setStockSortOrder(e.target.value as "default" | "asc" | "desc")}
              aria-label="Urutan Stok"
              className="h-10 w-full sm:w-auto rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition-all focus:border-terracotta-clay focus:ring-2 focus:ring-terracotta-clay/20 shadow-sm cursor-pointer"
            >
              <option value="default">Urutan Default</option>
              <option value="asc">Stok Terdikit (Naik)</option>
              <option value="desc">Stok Terbanyak (Turun)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[550px] text-left text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 shadow-sm">
            <tr>
              <th scope="col" className="px-3.5 py-2.5">Produk</th>
              <th scope="col" className="px-3.5 py-2.5">Kategori</th>
              <th scope="col" className="px-3.5 py-2.5 text-right">Stok</th>
              <th scope="col" className="px-3.5 py-2.5 text-right">Harga Jual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAndSortedInventory.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs sm:text-sm text-gray-500">
                  Tidak ada produk yang cocok dengan filter atau kata kunci pencarian.
                </td>
              </tr>
            ) : (
              filteredAndSortedInventory.map((product) => (
                <tr key={product.allocationId} className="hover:bg-gray-50 transition-colors">
                  <th scope="row" className="px-3.5 py-2.5 text-left font-normal">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{product.sku}</p>
                  </th>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClass(product.category)}`}>
                      {product.category || "Hijab"}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-3.5 py-2.5 text-right ${
                    product.stock_quantity <= 10
                      ? "text-red-600 font-bold"
                      : "text-gray-900 font-semibold"
                  }`}>
                    {numberFormatter.format(product.stock_quantity)}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-black text-gray-900">
                    {currencyFormatter.format(product.selling_price)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
