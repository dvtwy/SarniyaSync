"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import AddProductModal from "@/components/admin/AddProductModal";

type Product = Record<string, unknown>;

type ProductsResponse = {
  products?: Product[];
  error?: string;
};

type ProductActionResponse = {
  error?: string;
};

async function fetchProducts(search: string, category: string, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category && category !== "all") params.set("category", category);
  const query = params.toString();
  const response = await fetch(`/api/products${query ? `?${query}` : ""}`, signal ? { signal } : undefined);
  const result = (await response.json()) as ProductsResponse;

  if (!response.ok) {
    throw new Error(result.error ?? "Produk gagal dimuat.");
  }

  return result.products ?? [];
}

function getText(product: Product, fields: string[], fallback = "-") {
  for (const field of fields) {
    const value = product[field];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

function getStock(product: Product) {
  for (const field of ["stock_quantity", "stock", "stok", "quantity", "jumlah_stok"]) {
    const value = product[field];
    if (typeof value === "number" || typeof value === "string") {
      const stock = Number(value);
      if (Number.isFinite(stock)) return stock;
    }
  }

  return null;
}

function getPrice(product: Product): number | null {
  for (const field of ["selling_price", "price", "harga_jual", "harga"]) {
    const value = product[field];
    if (typeof value === "number" || typeof value === "string") {
      const price = Number(value);
      if (Number.isFinite(price) && price >= 0) return price;
    }
  }
  return null;
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});





function truncateSku(sku: string, maxLen = 12): string {
  if (sku.length <= maxLen) return sku;
  return `${sku.slice(0, 8)}...${sku.slice(-4)}`;
}

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

type InventoryPageProps = {
  searchParams?: {
    search?: string | string[];
    category?: string | string[];
  };
};

export default function InventoryPage({ searchParams = {} }: InventoryPageProps) {
  const search = typeof searchParams.search === "string" ? searchParams.search : "";
  const category = typeof searchParams.category === "string" ? searchParams.category : "all";
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const notifications = [
      ["inventory-product-added", "Produk berhasil ditambahkan."],
      ["inventory-product-updated", "Produk berhasil diperbarui."],
    ] as const;

    for (const [key, message] of notifications) {
      if (window.sessionStorage.getItem(key) === "true") {
        window.sessionStorage.removeItem(key);
        setSuccessMessage(message);
        break;
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        setProducts(await fetchProducts(search, category, controller.signal));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setErrorMessage(
          error instanceof Error ? error.message : "Terjadi kesalahan saat memuat produk.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, [search, category]);

  async function handleDelete(product: Product) {
    const productId = getText(product, ["id"], "");
    const productName = getText(product, ["name"], "produk ini");
    if (!productId || !window.confirm(`Yakin ingin menghapus produk "${productName}"?`)) return;

    setDeletingId(productId);
    setActionError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ProductActionResponse;

      if (!response.ok) {
        throw new Error(result.error ?? "Produk gagal dihapus.");
      }

      setProducts(await fetchProducts(search, category));
      setSuccessMessage("Produk berhasil dihapus.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Produk gagal dihapus.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-[#f7e4d4] px-2.5 py-0.5 text-xs font-bold text-[#9d5c4c]">
            Area Pemilik / Administrator
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Kelola Stok</h1>
          <p className="mt-0.5 text-sm text-gray-500">Daftar produk dan ketersediaan stok pusat.</p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-xs text-[#68756e]" aria-live="polite">
            {isLoading ? "Memuat produk..." : `${products.length} produk`}
          </p>
          <AddProductModal
            onSuccess={async () => {
              try {
                const refreshed = await fetchProducts(search, category);
                setProducts(refreshed);
                setSuccessMessage("Produk berhasil ditambahkan.");
              } catch {
              }
            }}
          />





        </div>
      </header>

      {successMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-[#cfe2d0] bg-[#edf5e8] px-3.5 py-2 text-xs sm:text-sm text-[#315d3e]"
        >
          <p>{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="font-medium underline underline-offset-2 hover:text-[#9d5c4c]"
          >

            Tutup
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="rounded-lg border border-[#f0d4cc] bg-[#fff5f1] px-3.5 py-2 text-xs sm:text-sm text-[#9b4936]">
          {actionError}
        </p>
      )}

      <form
        action="/inventory"
        method="get"
        className="flex flex-col gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 sm:flex-row sm:items-end shadow-sm"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="inventory-search" className="mb-1 block text-xs font-semibold text-[#576071]">
            Cari nama produk atau SKU
          </label>
          <input
            id="inventory-search"
            name="search"
            type="search"
            defaultValue={search}
            placeholder="Contoh: Pashmina atau HJ-001"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
          />
        </div>
        <div className="sm:w-48">
          <label htmlFor="inventory-category" className="mb-1 block text-xs font-semibold text-[#576071]">
            Kategori
          </label>
          <select
            id="inventory-category"
            name="category"
            defaultValue={category || "all"}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-[#2d3440] outline-none focus:border-[#cc9787] focus:ring-2 focus:ring-[#cc9787]/25"
          >

            <option value="all">Semua kategori</option>
            <option value="Pashmina">Pashmina</option>
            <option value="Segi empat">Segi empat</option>
            <option value="Bergo">Bergo</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-[#cc9787] via-[#cc8c7d] to-[#9d5c4c] px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:brightness-105"
        >
          Cari
        </button>
      </form>

      <section aria-label="Daftar produk" className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-bold text-[#2d3440]">Inventaris produk</h2>
          <p className="mt-0.5 text-xs text-[#7b877f]">Data diperbarui dari katalog SarniyaSync.</p>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-xs sm:text-sm text-[#68756e]" role="status">
            Memuat data produk...
          </div>
        ) : (
          <>
            {!isLoading && errorMessage && (
              <div
                role="alert"
                className="border-b border-[#f1dfc5] bg-[#fff9ef] px-4 py-2.5 text-xs sm:text-sm text-[#765a36]"
              >
    
                Produk gagal dimuat dari Supabase: {errorMessage}
              </div>
            )}
            {!isLoading && !errorMessage && products.length === 0 && (
              <div role="status" className="border-b border-[#edf0ec] px-4 py-6 text-center text-xs sm:text-sm text-[#68756e]">
                Belum ada produk di inventaris.
              </div>
            )}
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-[#f7f9f6] backdrop-blur-md text-[11px] uppercase tracking-wider text-[#68756e] shadow-sm">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-bold">SKU</th>
                  <th scope="col" className="px-3.5 py-2.5 font-bold">Nama produk</th>
                  <th scope="col" className="px-3.5 py-2.5 font-bold">Kategori</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-bold">Stok</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right font-bold">Harga</th>
                  <th scope="col" className="px-3.5 py-2.5 font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ec]">
                {products.map((product, index) => {
                  const stock = getStock(product);
                  const productName = getText(product, ["name", "nama", "nama_produk", "product_name"]);
                  const imageUrl = getText(product, ["image_url"], "");

                  return (
                    <tr key={getText(product, ["id", "sku", "kode_produk"], String(index))} className="transition-colors hover:bg-[#fafbf9]">
                      <td className="whitespace-nowrap px-3.5 py-2 text-xs font-mono text-[#7b877f]">
                        {(() => {
                          const sku = getText(product, ["sku", "code", "kode_produk", "id"]);
                          const truncated = truncateSku(sku);
                          return sku !== truncated ? (
                            <span title={sku}>{truncated}</span>
                          ) : (
                            sku
                          );
                        })()}
                      </td>
                      <th scope="row" className="whitespace-nowrap px-3.5 py-2 font-medium text-[#2d3440]">
                        <div className="flex items-center gap-2.5">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={`Foto ${productName}`}
                              width={36}
                              height={36}
                              sizes="36px"
                              className="size-9 shrink-0 rounded border border-[#e1e7e0] object-cover"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="flex size-9 shrink-0 items-center justify-center rounded border border-[#e1e7e0] bg-[#f7f9f6] text-[10px] font-medium text-[#7b877f]"
                            >
                  
                              Foto
                            </span>
                          )}
                          <span className="font-semibold">{productName}</span>
                        </div>
                      </th>
                      <td className="whitespace-nowrap px-3.5 py-2">
                        {(() => {
                          const categoryName = getText(product, ["category", "kategori", "jenis"], "Hijab");
                          return (
                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClass(categoryName)}`}>
                              {categoryName}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2 text-right font-bold text-[#2d3440]">
                        {stock ?? "-"} <span className="font-normal text-[11px] text-[#7b877f]">{getText(product, ["unit", "satuan"], "pcs")}</span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2 text-right font-semibold text-[#2d3440]">
                        {(() => {
                          const price = getPrice(product);
                          return price !== null ? currencyFormatter.format(price) : "-";
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/inventory/edit/${encodeURIComponent(getText(product, ["id"], ""))}`}
                            aria-label={`Edit ${productName}`}
                            title={`Edit ${productName}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-[#f7f9f6] text-[#576071] transition-all hover:border-[#cc9787]/50 hover:bg-[#fdf5f1] hover:text-[#9d5c4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cc9787] active:scale-95"
                          >
                
                            <Pencil size={14} strokeWidth={2} />
                          </Link>
                
                          <button
                            type="button"
                            onClick={() => void handleDelete(product)}
                            disabled={deletingId === getText(product, ["id"], "")}
                            aria-label={`Hapus ${productName}`}
                            title={`Hapus ${productName}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ead5cf] bg-[#fff5f1] text-[#c0665a] transition-all hover:border-[#c0665a]/60 hover:bg-[#fdecea] hover:text-[#9b4936] active:scale-95 disabled:cursor-wait disabled:opacity-40"
                          >
                
                            {deletingId === getText(product, ["id"], "") ? (
                              <Loader2 size={14} className="animate-spin text-[#c0665a]" />
                            ) : (
                              <Trash2 size={14} strokeWidth={2} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}