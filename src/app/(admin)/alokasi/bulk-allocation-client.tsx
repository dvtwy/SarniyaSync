"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { bulkAllocatePartnerStock } from "./actions";
import { Package, ShoppingCart, Store, ClipboardList, AlertCircle, CheckCircle } from "lucide-react";

export type StoreOption = {
  id: string;
  name: string;
  city?: string | null;
};

export type WarehouseProduct = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  stock_quantity: number;
};

export type ExistingAllocation = {
  id: string;
  partner_store_id: string;
  product_id: string;
  stock_quantity: number;
  // Data toko di-join langsung dari query (tanpa filter is_active)
  store_name: string | null;
  store_city: string | null;
  store_is_active: boolean | null;
  product_name?: string | null;
  product_sku?: string | null;
  product_category?: string | null;
};

type BulkAllocationClientProps = {
  stores: StoreOption[];
  products: WarehouseProduct[];
  allocations: ExistingAllocation[];
};

const numberFormatter = new Intl.NumberFormat("id-ID");

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

export default function BulkAllocationClient({
  stores,
  products,
  allocations,
}: BulkAllocationClientProps) {
  const router = useRouter();

  const [selectedProducts, setSelectedProducts] = useState<Array<{ product: WarehouseProduct; quantity: number }>>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterAllocationStoreId, setFilterAllocationStoreId] = useState<string>("all");

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function formatStoreName(alloc: ExistingAllocation): string {
    return alloc.store_name?.trim() || "Toko tidak diketahui";
  }

  const selectedProductIds = useMemo(
    () => new Set(selectedProducts.map((p) => p.product.id)),
    [selectedProducts],
  );

  const totalUnits = useMemo(() => {
    return selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [products, searchQuery]);

  const isAllSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedProductIds.has(p.id));
  }, [filteredProducts, selectedProductIds]);

  const handleSelectProduct = (product: WarehouseProduct) => {
    setSelectedProducts((prev) => {
      if (prev.find((p) => p.product.id === product.id)) {
        return prev.filter((p) => p.product.id !== product.id);
      }
      const defaultQty = Math.min(10, Math.max(1, product.stock_quantity));
      return [...prev, { product, quantity: defaultQty }];
    });
    setErrorMessage("");
  };

  function handleSelectAll() {
    if (isAllSelected) {
      const filteredIds = new Set(filteredProducts.map((p) => p.id));
      setSelectedProducts((prev) => prev.filter((p) => !filteredIds.has(p.product.id)));
    } else {
      setSelectedProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.product.id));
        const toAdd = filteredProducts
          .filter((p) => !existingIds.has(p.id))
          .map((product) => ({
            product,
            quantity: Math.min(10, Math.max(1, product.stock_quantity)),
          }));
        return [...prev, ...toAdd];
      });
    }
    setErrorMessage("");
  }

  const handleUpdateQuantity = (productId: string, operation: "increase" | "decrease") => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = Math.max(1, item.product.stock_quantity);
          if (operation === "increase") {
            return { ...item, quantity: Math.min(maxStock, item.quantity + 10) };
          } else if (operation === "decrease") {
            return { ...item, quantity: Math.max(1, item.quantity - 10) };
          }
        }
        return item;
      }),
    );
  };

  const handleDirectQuantityChange = (productId: string, value: number) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = Math.max(1, item.product.stock_quantity);
          const clamped = Math.min(Math.max(1, value || 1), maxStock);
          return { ...item, quantity: clamped };
        }
        return item;
      }),
    );
  };

  function handleRemoveFromCart(productId: string) {
    setSelectedProducts((prev) => prev.filter((p) => p.product.id !== productId));
  }

  function handleResetSelection() {
    setSelectedProducts([]);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleBulkAllocationSubmit() {
    if (!selectedStoreId) {
      setErrorMessage("Silakan pilih Toko Mitra tujuan terlebih dahulu.");
      return;
    }

    if (selectedProducts.length === 0) {
      setErrorMessage("Silakan pilih minimal 1 produk pada tabel gudang.");
      return;
    }

    // Validasi kuantitas sebelum submit: cegah melebihi stok gudang pusat
    const overStockItems = selectedProducts.filter(
      (item) => item.quantity > item.product.stock_quantity
    );

    if (overStockItems.length > 0) {
      const firstViolation = overStockItems[0];
      setErrorMessage(
        `Gagal: Alokasi "${firstViolation.product.name}" (${firstViolation.quantity} pcs) ` +
        `melebihi stok gudang tersedia (${firstViolation.product.stock_quantity} pcs). ` +
        `Kurangi jumlahnya dan coba lagi.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const items = selectedProducts.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const result = await bulkAllocatePartnerStock({
        storeId: selectedStoreId,
        items,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccessMessage(
        result.success || `Berhasil mengalokasikan ${items.length} produk ke toko mitra!`,
      );
      setSelectedProducts([]);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Alokasi massal gagal diproses.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayedAllocations = useMemo(() => {
    if (filterAllocationStoreId === "all") return allocations;
    return allocations.filter((a) => a.partner_store_id === filterAllocationStoreId);
  }, [allocations, filterAllocationStoreId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-terracotta-clay text-white shadow-sm">
                    <Package size={13} />
                  </span>
                  Stok Gudang Pusat
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Centang produk yang ingin dialokasikan ke toko mitra.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Cari SKU / nama produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-lg bg-gray-50 border border-gray-200 px-3.5 pl-8 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
                />
                <svg
                  className="size-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 px-1 text-xs">
              <span className="text-[11px] font-semibold text-gray-500">
                Menampilkan <strong className="text-gray-900">{filteredProducts.length}</strong> produk
                tersedia di gudang pusat
              </span>

              {selectedProducts.length > 0 && (
                <span className="text-[11px] font-bold text-terracotta-clay bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 rounded-full">
                  {selectedProducts.length} produk terpilih ({totalUnits} unit)
                </span>
              )}
            </div>

            <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 shadow-sm">
                  <tr>
                    <th scope="col" className="w-10 px-3 py-2.5 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          aria-label="Pilih semua produk"
                          className="sr-only"
                        />
                        <span
                          className={`size-4.5 rounded-md flex items-center justify-center transition-all ${
                            isAllSelected
                              ? "bg-terracotta-clay text-white shadow-sm"
                              : "bg-white border border-gray-300 text-transparent"
                          }`}
                        >
                          <svg
                            className="size-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      </label>
                    </th>
                    <th scope="col" className="px-3 py-2.5">Produk</th>
                    <th scope="col" className="px-3 py-2.5 hidden sm:table-cell">Kategori</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Stok Gudang</th>
                    <th scope="col" className="px-3 py-2.5 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a3b1c6]/15">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#7a8394]">
                        {searchQuery
                          ? `Tidak ada produk dengan kata kunci "${searchQuery}".`
                          : "Tidak ada stok produk yang tersedia di gudang pusat."}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const cartItem = selectedProducts.find((p) => p.product.id === product.id);
                      const isSelected = Boolean(cartItem);
                      const currentQty = cartItem?.quantity ?? 10;

                      return (
                        <tr
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-almond-cream/40"
                              : "hover:bg-almond-cream/15"
                          }`}
                        >
                          <td
                            className="px-3 py-2.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectProduct(product)}
                                aria-label={`Pilih ${product.name}`}
                                className="sr-only"
                              />
                              <span
                                className={`size-4.5 rounded-md flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-terracotta-clay text-white"
                                    : "bg-white border border-gray-300 text-transparent hover:border-terracotta-clay/60"
                                }`}
                              >
                                <svg
                                  className="size-3"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            </label>
                          </td>

                          <td className="px-3 py-2.5 min-w-0">
                            <p className="font-bold text-[#2d3440] truncate max-w-[200px] sm:max-w-xs" title={product.name}>
                              {product.name}
                            </p>
                            <span className="font-mono text-[10px] text-[#7a8394]">
                              {product.sku}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 hidden sm:table-cell whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClass(product.category)}`}>
                              {product.category || "Umum"}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex min-w-[2.5rem] justify-center rounded-lg px-2 py-0.5 text-xs font-black border ${
                                product.stock_quantity <= 5
                                  ? "bg-rose-50 border-rose-200/60 text-rose-800"
                                  : "bg-orange-50 border-orange-200/60 text-terracotta-clay"
                              }`}
                            >
                              {numberFormatter.format(product.stock_quantity)} pcs
                            </span>
                          </td>

                          <td
                            className="px-3 py-2.5 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectProduct(product)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                isSelected
                                  ? "bg-terracotta-clay text-white hover:opacity-90 active:scale-95"
                                  : "bg-gray-100 border border-gray-200 text-gray-600 hover:text-terracotta-clay hover:border-terracotta-clay/30 active:scale-95"
                              }`}
                            >
                              {isSelected ? `${currentQty} pcs` : "+ Pilih"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-terracotta-clay text-white shadow-sm text-sm">
                  <ShoppingCart size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Keranjang Alokasi</h3>
                  <p className="text-[10px] text-gray-500">Alokasi massal ke gerai mitra</p>
                </div>
              </div>

              {selectedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetSelection}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Batal Semua
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor="target-mitra-store"
                className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1.5"
              >
                Pilih Toko Mitra Tujuan
              </label>
              <div className="relative">
                <select
                  id="target-mitra-store"
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  disabled={stores.length === 0}
                  className="w-full h-10 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-900 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay disabled:opacity-50"
                >
                  {stores.length ? (
                    stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Belum ada toko mitra aktif</option>
                  )}
                </select>
              </div>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center flex flex-col items-center justify-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <ClipboardList size={20} />
                </div>
                <p className="text-xs font-bold text-[#576071]">Belum Ada Produk Dipilih</p>
                <p className="text-[11px] text-[#7a8394] max-w-[220px]">
                  Beri tanda centang pada checkbox produk di tabel sebelah kiri untuk menambahkannya ke keranjang ini.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                  {selectedProducts.map(({ product: prod, quantity: qty }) => {
                    const maxStock = prod.stock_quantity;

                    return (
                      <div
                        key={prod.id}
                        className="rounded-xl bg-gray-50 p-2.5 border border-gray-200 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#2d3440] truncate" title={prod.name}>
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-[#7a8394] font-mono">
                              {prod.sku} | Gudang: <span className="font-bold text-terracotta-clay">{maxStock} pcs</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(prod.id)}
                            title="Hapus dari keranjang"
                            className="size-6 shrink-0 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-100/60 active:scale-95 transition-all"
                          >
                            <svg
                              className="size-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#a3b1c6]/15">
                          <span className="text-[11px] font-semibold text-[#576071]">
                            Jumlah Alokasi:
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(prod.id, "decrease")}
                              disabled={qty <= 1}
                              title="Kurangi 10 unit (min. 1)"
                              className="size-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-700 hover:text-terracotta-clay hover:border-terracotta-clay/30 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={maxStock}
                              value={qty}
                              onChange={(e) => handleDirectQuantityChange(prod.id, Number(e.target.value))}
                              className={`w-16 h-7 rounded-lg bg-gray-50 border text-center text-xs font-black outline-none focus:ring-2 transition-all ${
                                qty >= maxStock
                                  ? "border-rose-300 text-rose-600 focus:ring-rose-400/20"
                                  : "border-gray-200 text-gray-800 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
                              }`}
                            />

                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(prod.id, "increase")}
                              disabled={qty >= maxStock}
                              title={qty >= maxStock ? `Maksimal ${maxStock} pcs (batas stok gudang)` : "Tambah 10 unit"}
                              className="size-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-black text-gray-700 hover:text-terracotta-clay hover:border-terracotta-clay/30 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {qty >= maxStock && (
                          <p className="text-[10px] font-bold text-rose-600 bg-rose-50 rounded-lg px-2 py-1 border border-rose-200/60 flex items-center gap-1">
                            <AlertCircle size={11} className="shrink-0" />
                            Batas maksimal stok gudang tercapai ({maxStock} pcs)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-orange-50 border border-orange-200/60 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#576071]">
                    <span>Total Jenis Produk:</span>
                    <strong className="text-[#2d3440]">{selectedProducts.length} macam</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#576071]">
                    <span>Total Kuantitas Dialokasikan:</span>
                    <strong className="text-terracotta-clay text-sm font-black">
                      {numberFormatter.format(totalUnits)} pcs
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-rose-300 bg-rose-50/90 p-2.5 text-xs font-semibold text-rose-800 flex items-start gap-2"
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 text-xs font-semibold text-emerald-800 flex items-start gap-2"
              >
                <CheckCircle size={14} className="shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleBulkAllocationSubmit}
              disabled={isSubmitting || selectedProducts.length === 0 || !selectedStoreId}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-terracotta-clay to-[#804233] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Menyimpan Alokasi Massal...</span>
                </>
              ) : (
                <span>
                  Alokasikan {selectedProducts.length > 0 ? `${selectedProducts.length} Produk (${numberFormatter.format(totalUnits)} Pcs)` : "Produk"} &rarr;
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <section
        aria-label="Daftar alokasi stok"
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-terracotta-clay text-white shadow-sm">
                <Store size={13} />
              </span>
              Stok Aktif di Toko Mitra
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Daftar stok yang telah dialokasikan dan tersedia di gerai mitra.
            </p>
          </div>

          <div className="w-full sm:w-60">
            <select
              value={filterAllocationStoreId}
              onChange={(e) => setFilterAllocationStoreId(e.target.value)}
              className="w-full h-8 rounded-lg bg-gray-50 border border-gray-200 px-3 text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
            >
              <option value="all">Semua Toko Mitra ({allocations.length} alokasi)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {displayedAllocations.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-500">
            Belum ada data stok yang dialokasikan untuk pilihan ini.
          </p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar rounded-xl border border-gray-200 bg-white mt-3">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-medium uppercase tracking-wider text-gray-500 border-b border-gray-200 shadow-sm">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5">Toko Mitra</th>
                  <th scope="col" className="px-3.5 py-2.5">SKU</th>
                  <th scope="col" className="px-3.5 py-2.5">Nama Produk</th>
                  <th scope="col" className="px-3.5 py-2.5">Kategori</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">Stok di Mitra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedAllocations.map((alloc) => {
                  const prod = productsById.get(alloc.product_id);
                  const productName = alloc.product_name || prod?.name || "Produk tidak ditemukan";
                  const productSku = alloc.product_sku || prod?.sku || "-";
                  const categoryName = alloc.product_category || prod?.category || "Hijab";

                  return (
                    <tr key={alloc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3.5 py-2 font-medium text-gray-600">
                        <span
                          className={alloc.store_is_active === false ? "text-gray-400" : undefined}
                          title={formatStoreName(alloc)}
                        >
                          {formatStoreName(alloc)}
                        </span>
                        {alloc.store_is_active === false && (
                          <span className="ml-1.5 inline-block rounded-md bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-400 align-middle">
                            NONAKTIF
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-[11px] text-gray-500">
                        {productSku}
                      </td>
                      <td className="px-3.5 py-2 font-bold text-gray-800">
                        {productName}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClass(categoryName)}`}>
                          {categoryName}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <span className="inline-block rounded-md bg-orange-50 border border-orange-200/60 px-2 py-0.5 text-xs font-bold text-terracotta-clay">
                          {numberFormatter.format(alloc.stock_quantity)} pcs
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

