"use client";

import { useState, useTransition, useId, useMemo } from "react";
import Image from "next/image";
import { recordCartTransaction, type CartItemInput } from "../cart-actions";
import ThermalReceipt, { type ReceiptData } from "@/components/receipt";
import { useSidebar } from "@/context/sidebar-context";

type StoreOption = { id: string; name: string };

type InventoryOption = {
  storeId: string;
  allocationId: string;
  productId: string;
  sku: string;
  name: string;
  category?: string | null;
  sellingPrice: number;
  stock: number;
  imageUrl?: string | null;
};

type CartRow = CartItemInput & {
  rowId: string;
  productName: string;
  sku: string;
  price: number;
  subtotal: number;
  imageUrl?: string | null;
  maxStock: number;
};

type PosCartFormProps = {
  stores: StoreOption[];
  inventory: InventoryOption[];
};

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function PosCartForm({ stores, inventory }: PosCartFormProps) {
  const { isSidebarOpen } = useSidebar();
  const uid = useId();

  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");

  const [searchQuery, setSearchQuery] = useState("");

  const [cart, setCart] = useState<CartRow[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris">("cash");
  const [cashReceivedInput, setCashReceivedInput] = useState<string>("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [isPending, startTransition] = useTransition();

  const availableForStore = useMemo(() => {
    return inventory.filter((item) => item.storeId === storeId);
  }, [inventory, storeId]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const baseList = !q
      ? [...availableForStore]
      : availableForStore.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            (item.category && item.category.toLowerCase().includes(q)),
        );

    return baseList.sort((a, b) => {
      const aKosong = a.stock <= 0;
      const bKosong = b.stock <= 0;

      if (aKosong !== bKosong) return aKosong ? 1 : -1;

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
  }, [availableForStore, searchQuery]);

  const grandTotal = useMemo(() => {
    return cart.reduce((sum, row) => sum + row.subtotal, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, row) => sum + row.quantity, 0);
  }, [cart]);

  const parsedCashReceived = Number(cashReceivedInput.replace(/\D/g, "")) || 0;
  const cashChange = parsedCashReceived - grandTotal;
  const isCashInsufficient = paymentMethod === "cash" && parsedCashReceived < grandTotal;

  function handleStoreChange(newStoreId: string) {
    setStoreId(newStoreId);
    setCart([]);
    setErrorMessage("");
    setSuccessMessage("");
    setLastReceipt(null);
    setCashReceivedInput("");
  }

  function handleCardClick(product: InventoryOption) {
    const existingIndex = cart.findIndex(
      (row) => row.allocationId === product.allocationId,
    );

    if (existingIndex !== -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        setErrorMessage(
          `Batas stok tercapai. Stok toko "${product.name}" hanya tersedia ${product.stock} unit.`,
        );
        return;
      }
      setErrorMessage("");
      setCart((prev) =>
        prev.map((row, i) =>
          i === existingIndex
            ? {
                ...row,
                quantity: row.quantity + 1,
                subtotal: (row.quantity + 1) * row.price,
              }
            : row,
        ),
      );
    } else {
      if (product.stock <= 0) {
        setErrorMessage(`Stok untuk "${product.name}" sedang habis.`);
        return;
      }
      setErrorMessage("");
      const newRow: CartRow = {
        rowId: `${product.allocationId}-${Date.now()}`,
        allocationId: product.allocationId,
        productId: product.productId,
        productName: product.name,
        sku: product.sku,
        price: product.sellingPrice,
        quantity: 1,
        subtotal: product.sellingPrice,
        imageUrl: product.imageUrl,
        maxStock: product.stock,
      };
      setCart((prev) => [...prev, newRow]);
    }
  }

  function handleUpdateQty(allocationId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((row) => {
          if (row.allocationId !== allocationId) return row;
          const nextQty = row.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > row.maxStock) {
            setErrorMessage(`Maksimal stok tersedia hanya ${row.maxStock} unit.`);
            return row;
          }
          setErrorMessage("");
          return {
            ...row,
            quantity: nextQty,
            subtotal: nextQty * row.price,
          };
        })
        .filter((r): r is CartRow => r !== null),
    );
  }

  function handleRemoveItem(allocationId: string) {
    setCart((prev) => prev.filter((r) => r.allocationId !== allocationId));
  }

  function handleClearCart() {
    setCart([]);
    setCashReceivedInput("");
    setErrorMessage("");
  }

  function handleQuickCash(nominal: number) {
    setCashReceivedInput(String(nominal));
  }

  function handleSubmit() {
    if (cart.length === 0) return;
    if (isCashInsufficient) {
      setErrorMessage("Nominal uang yang diterima kurang dari total belanja.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setLastReceipt(null);

    const storeName = stores.find((s) => s.id === storeId)?.name ?? "Toko Mitra";
    const receiptItems = cart.map((r) => ({
      name: r.productName,
      qty: r.quantity,
      price: r.price,
      subtotal: r.subtotal,
    }));
    const total = grandTotal;
    const currentPayment = paymentMethod;
    const currentCashReceived = paymentMethod === "cash" ? parsedCashReceived : undefined;
    const currentCashChange = paymentMethod === "cash" ? Math.max(0, cashChange) : undefined;

    startTransition(async () => {
      const result = await recordCartTransaction({
        partnerStoreId: storeId,
        paymentMethod: currentPayment,
        items: cart.map((row) => ({
          allocationId: row.allocationId,
          productId: row.productId,
          productName: row.productName,
          price: row.price,
          quantity: row.quantity,
        })),
      });

      if (result.error) {
        setErrorMessage(result.error);
      } else {
        const txId = result.transactionId?.slice(0, 8).toUpperCase() ?? "TX-SARNIYA";
        setSuccessMessage(
          `Transaksi berhasil disimpan! ID: ${txId}. Stok toko telah berkurang secara otomatis.`,
        );

        setLastReceipt({
          storeName,
          transactionNumber: txId,
          date: new Date().toLocaleString("id-ID"),
          paymentMethod: currentPayment,
          items: receiptItems,
          grandTotal: total,
          cashReceived: currentCashReceived,
          cashChange: currentCashChange,
        });

        setCart([]);
        setCashReceivedInput("");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2.7fr_1.3fr] gap-4 items-start">
      <section
        aria-label="Katalog Produk Kasir"
        className="min-w-0 rounded-xl bg-white p-3 sm:p-3.5 shadow-sm border border-gray-200 flex flex-col gap-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`${uid}-store-selector`}
              className="text-xs font-bold uppercase tracking-wider text-gray-500"
            >
              Toko:
            </label>
            <select
              id={`${uid}-store-selector`}
              value={storeId}
              onChange={(e) => handleStoreChange(e.target.value)}
              disabled={isPending}
              className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay cursor-pointer"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-gray-800">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk / SKU..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-8 py-2 text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
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
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <p className="font-medium">
            Tersedia <strong className="text-terracotta-clay">{filteredProducts.length}</strong> produk di rak
          </p>
          <span className="hidden sm:inline-block text-[9px] text-gray-400">
            *Klik kartu untuk langsung masukkan ke keranjang
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div
            className="flex min-h-[220px] flex-col items-center justify-center rounded-xl bg-gray-50 border border-gray-200 p-6 text-center"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-gray-200 p-2 text-terracotta-clay shadow-sm mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="font-bold text-xs text-gray-800">Tidak Ada Produk Ditemukan</p>
            <p className="mt-0.5 text-[10px] text-gray-500 max-w-xs">
              {searchQuery
                ? `Tidak ada produk dengan kata kunci "${searchQuery}".`
                : "Belum ada produk yang tersedia untuk toko ini."}
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 ${isSidebarOpen ? 'xl:grid-cols-4' : 'xl:grid-cols-5'} gap-3 transition-all duration-300`}>
            {filteredProducts.map((item) => {
              const inCartQty =
                cart.find((r) => r.allocationId === item.allocationId)?.quantity ?? 0;
              const isOutOfStock = item.stock <= 0;
              const isLimitReached = inCartQty >= item.stock;

              return (
                <div
                  key={item.allocationId}
                  role="button"
                  tabIndex={0}
                  onClick={() => !isOutOfStock && handleCardClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!isOutOfStock) handleCardClick(item);
                    }
                  }}
                  className={`group relative flex flex-col justify-between rounded-xl bg-white border border-gray-200 p-2 sm:p-2.5 text-left transition-all duration-150 select-none shadow-sm ${
                    isOutOfStock
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
                  }`}
                >
                  <div>
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-50 p-1 flex items-center justify-center border border-gray-100">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 25vw, 20vw"
                          className="object-contain p-0.5 transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50 border border-orange-100 p-1 text-terracotta-clay">
                          <Image
                            src="/logo-sarniya.png"
                            alt="Sarniya"
                            width={22}
                            height={22}
                            className="object-contain opacity-80"
                          />
                        </div>
                      )}

                      <span
                        className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black tracking-wide ${
                          isOutOfStock
                            ? "bg-rose-100 text-rose-800"
                            : item.stock <= 5
                            ? "bg-amber-100 text-amber-800"
                            : "bg-orange-50 border border-orange-100 text-terracotta-clay"
                        }`}
                      >
                        {isOutOfStock ? "Habis" : `${item.stock}`}
                      </span>

                      {inCartQty > 0 && (
                        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-terracotta-clay px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold text-white shadow-sm">
                          <span>{inCartQty} di cart</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[9px] font-mono text-gray-400 truncate">
                          {item.sku}
                        </p>
                        {item.category && (
                          <span className="text-[9px] font-semibold text-gray-500 truncate">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-0.5 line-clamp-2 text-[11px] sm:text-xs font-bold text-gray-800 leading-tight min-h-[1.75rem] group-hover:text-terracotta-clay transition-colors" title={item.name}>
                        {item.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5">
                    <div className="min-w-0 pr-1">
                      <p className="text-[8px] text-gray-400">Harga</p>
                      <p className="text-[11px] sm:text-xs font-black text-terracotta-clay truncate">
                        {idr.format(item.sellingPrice)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock || isLimitReached}
                      aria-label={`Tambah ${item.name}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-terracotta-clay text-white shadow-sm transition-transform hover:opacity-90 active:scale-90 disabled:opacity-40"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 4v16m8-8H4"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <aside
        aria-label="Panel Keranjang dan Pembayaran"
        className="w-full rounded-xl bg-white border border-gray-200 p-3 sm:p-3.5 shadow-sm flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-orange-50 border border-orange-100 text-terracotta-clay">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black tracking-tight text-gray-800">
                  Keranjang Kasir
                </h2>
                <p className="text-[10px] font-medium text-gray-500">
                  {totalItemsCount} item dipilih
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="rounded-lg px-2 py-0.5 text-[11px] font-bold text-gray-500 transition hover:text-rose-600 hover:bg-rose-50"
              >
                Reset
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50/95 p-2.5 text-xs font-bold text-rose-800 shadow-sm">
              {errorMessage}
            </div>
          )}

          <div
            className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-50 border border-gray-200 p-2.5 max-h-[260px] sm:max-h-[300px] overflow-y-auto"
          >
            {cart.length === 0 ? (
              <div className="flex min-h-[130px] flex-col items-center justify-center text-center p-3">
                <p className="text-xs font-bold text-gray-600">Keranjang Kosong</p>
                <p className="mt-0.5 text-[10px] text-gray-400 leading-relaxed">
                  Pilih produk pada kartu di sebelah kiri untuk menambah pesanan.
                </p>
              </div>
            ) : (
              cart.map((row) => (
                <div
                  key={row.rowId}
                  className="flex items-center justify-between gap-2.5 rounded-lg bg-white border border-gray-200 p-2.5 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-800">
                      {row.productName}
                    </p>
                    <p className="text-[10px] font-medium text-gray-500">
                      {idr.format(row.price)}
                    </p>
                    <p className="text-xs font-black text-terracotta-clay mt-0.5">
                      {idr.format(row.subtotal)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(row.allocationId, -1)}
                      className="flex size-6 items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 transition hover:bg-gray-200 active:scale-95"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-black text-gray-800">
                      {row.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(row.allocationId, 1)}
                      className="flex size-6 items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 transition hover:bg-gray-200 active:scale-95"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(row.allocationId)}
                      aria-label="Hapus produk"
                      className="ml-0.5 p-1 text-gray-400 hover:text-rose-600 transition"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3.5 border-t border-gray-200 pt-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Total Item ({totalItemsCount} pcs)</span>
              <span>{idr.format(grandTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">Grand Total</span>
              <span className="text-lg sm:text-xl font-black text-terracotta-clay">
                {idr.format(grandTotal)}
              </span>
            </div>
          </div>

          <div className="mt-3.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["cash", "transfer", "qris"] as const).map((method) => {
                const isSelected = paymentMethod === method;
                const labels = { cash: "Tunai", transfer: "Transfer", qris: "QRIS" };

                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      setErrorMessage("");
                    }}
                    className={`h-9 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-terracotta-clay text-white shadow-sm"
                        : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {labels[method]}
                  </button>
                );
              })}
            </div>
          </div>

          {paymentMethod === "cash" && (
            <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${uid}-cash-input`}
                  className="text-[11px] font-bold uppercase tracking-wider text-gray-600"
                >
                  Uang Diterima
                </label>
                {grandTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => handleQuickCash(grandTotal)}
                    className="text-[10px] font-bold text-terracotta-clay underline hover:text-gray-800"
                  >
                    Uang Pas
                  </button>
                )}
              </div>

              <input
                id={`${uid}-cash-input`}
                type="text"
                inputMode="numeric"
                value={cashReceivedInput ? idr.format(parsedCashReceived) : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setCashReceivedInput(raw);
                }}
                placeholder="Rp 0"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
              />

              <div className="flex flex-wrap gap-1 pt-0.5">
                {[50000, 100000, 200000].map((nominal) => (
                  <button
                    key={nominal}
                    type="button"
                    onClick={() => handleQuickCash(nominal)}
                    className="rounded-lg bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700 shadow-sm hover:bg-gray-100 transition"
                  >
                    {idr.format(nominal)}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-1.5 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600">Kembalian:</span>
                <span
                  className={`text-xs sm:text-sm font-black ${
                    parsedCashReceived === 0
                      ? "text-gray-400"
                      : isCashInsufficient
                      ? "text-rose-600"
                      : "text-emerald-700"
                  }`}
                >
                  {parsedCashReceived === 0
                    ? idr.format(0)
                    : isCashInsufficient
                    ? `Kurang ${idr.format(Math.abs(cashChange))}`
                    : idr.format(cashChange)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cart.length === 0 || isPending || isCashInsufficient}
            className="flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-clay text-sm sm:text-base font-bold text-white tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5 text-xs">
                <svg className="animate-spin size-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Memproses...
              </span>
            ) : (
              <span>Proses Transaksi {cart.length > 0 ? `· ${idr.format(grandTotal)}` : ""}</span>
            )}
          </button>
        </div>
      </aside>

      {successMessage && lastReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm print:hidden">
          <div
            className="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 p-6 shadow-xl"
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-black text-gray-800">Transaksi Berhasil!</h3>
                <p className="text-xs text-gray-500">Struk siap dicetak ke printer kasir.</p>
              </div>
            </div>

            <div
              className="my-4 rounded-xl bg-gray-50 border border-gray-200 p-4 font-mono text-xs text-gray-800"
            >
              <div className="text-center pb-2.5 border-b border-dashed border-gray-300">
                <p className="font-black text-sm uppercase text-gray-800">{lastReceipt.storeName}</p>
                <p className="text-[10px] text-gray-500">SarniyaSync POS System</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{lastReceipt.date}</p>
                <p className="text-[10px] font-bold text-terracotta-clay mt-1">
                  No: {lastReceipt.transactionNumber}
                </p>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1.5 max-h-44 overflow-y-auto">
                {lastReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="truncate pr-2">
                      <p className="font-bold text-gray-800 truncate">{it.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {it.qty} x {idr.format(it.price)}
                      </p>
                    </div>
                    <span className="font-black text-gray-800 shrink-0">
                      {idr.format(it.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 space-y-1">
                <div className="flex justify-between font-black text-xs">
                  <span>TOTAL ({lastReceipt.paymentMethod.toUpperCase()}):</span>
                  <span className="text-terracotta-clay font-black">
                    {idr.format(lastReceipt.grandTotal)}
                  </span>
                </div>

                {lastReceipt.paymentMethod.toLowerCase() === "cash" &&
                  lastReceipt.cashReceived !== undefined && (
                    <div className="pt-1.5 border-t border-dashed border-gray-300 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-gray-600">
                        <span>Diterima:</span>
                        <span>{idr.format(lastReceipt.cashReceived)}</span>
                      </div>
                      <div className="flex justify-between font-black text-emerald-800">
                        <span>Kembalian:</span>
                        <span>{idr.format(lastReceipt.cashChange ?? 0)}</span>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-clay px-4 text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90 active:scale-95 shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Cetak Struk Thermal
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessMessage("");
                  setLastReceipt(null);
                }}
                className="h-10 w-full rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Tutup &amp; Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      <ThermalReceipt data={lastReceipt} />
    </div>
  );
}
