"use client";

import { useState, useMemo, useEffect } from "react";
import { MessageSquare, X, Send, AlertCircle, Check, Loader2 } from "lucide-react";
import { updateMitraStatus, type MitraStatus } from "./actions";

export type StoreItem = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  is_active: boolean;
  status: string;
  status_message: string | null;
  owner: { full_name: string } | { full_name: string }[] | null;
};

type MitraTableClientProps = {
  stores: StoreItem[];
};

export default function MitraTableClient({ stores }: MitraTableClientProps) {
  const [storesList, setStoresList] = useState<StoreItem[]>(stores);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMitra, setSelectedMitra] = useState<StoreItem | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [updatingStoreId, setUpdatingStoreId] = useState<string | null>(null);

  useEffect(() => {
    setStoresList(stores);
  }, [stores]);

  const statusStyles: Record<MitraStatus, string> = {
    aktif: "border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-300",
    nonaktif: "border-rose-200 bg-rose-50 text-rose-700 focus:ring-rose-300",
    pending: "border-amber-200 bg-amber-50 text-amber-700 focus:ring-amber-300",
  };

  const filteredStores = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return storesList.filter((store) => {
      const ownerName = Array.isArray(store.owner)
        ? store.owner[0]?.full_name ?? ""
        : store.owner?.full_name ?? "";

      const currentStatus = (store.status || (store.is_active ? "aktif" : "pending")).toLowerCase();

      if (filterStatus !== "all" && currentStatus !== filterStatus) {
        return false;
      }

      if (!q) return true;

      const matchName = store.name.toLowerCase().includes(q);
      const matchOwner = ownerName.toLowerCase().includes(q);
      const matchPhone = (store.phone ?? "").toLowerCase().includes(q);
      const matchLocation = `${store.address ?? ""} ${store.city ?? ""}`.toLowerCase().includes(q);

      return matchName || matchOwner || matchPhone || matchLocation;
    });
  }, [storesList, searchTerm, filterStatus]);

  async function handleStatusChange(storeId: string, newStatus: MitraStatus) {
    setUpdatingStoreId(storeId);
    try {
      const currentStore = storesList.find((s) => s.id === storeId);
      const res = await updateMitraStatus(
        storeId,
        newStatus,
        currentStore?.status_message ?? undefined
      );

      if (!res?.error) {
        setStoresList((prev) =>
          prev.map((s) =>
            s.id === storeId
              ? {
                  ...s,
                  status: newStatus,
                  is_active: newStatus === "aktif",
                }
              : s
          )
        );
      } else {
        alert(`Gagal mengubah status: ${res.error}`);
      }
    } catch (err: unknown) {
      alert(`Terjadi kesalahan: ${err instanceof Error ? err.message : "Gagal memperbarui status"}`);
    } finally {
      setUpdatingStoreId(null);
    }
  }

  function handleOpenMessageModal(store: StoreItem) {
    setSelectedMitra(store);
    setMessageInput(store.status_message ?? "");
    setModalFeedback(null);
    setIsModalOpen(true);
  }

  async function handleSaveMessage() {
    if (!selectedMitra) return;

    setIsSaving(true);
    setModalFeedback(null);

    try {
      const currentStatus = selectedMitra.status || (selectedMitra.is_active ? "aktif" : "pending");
      const res = await updateMitraStatus(selectedMitra.id, currentStatus, messageInput);

      if (res?.error) {
        setModalFeedback({ type: "error", text: res.error });
      } else {
        const trimmed = messageInput.trim() || null;
        setStoresList((prev) =>
          prev.map((s) =>
            s.id === selectedMitra.id
              ? { ...s, status_message: trimmed }
              : s
          )
        );

        setModalFeedback({ type: "success", text: "Pesan berhasil disimpan!" });
        setTimeout(() => {
          setIsModalOpen(false);
          setSelectedMitra(null);
          setModalFeedback(null);
        }, 800);
      }
    } catch (err: unknown) {
      setModalFeedback({ type: "error", text: err instanceof Error ? err.message : "Gagal memperbarui pesan" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama toko, pemilik, kota, no telepon..."
            className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-8 text-xs font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs font-bold text-gray-400 hover:text-terracotta-clay"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="filter-status" className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
            Status:
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay cursor-pointer"
          >
            <option value="all">Semua Status ({storesList.length})</option>
            <option value="aktif">Aktif</option>
            <option value="pending">Pending</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
          <span className="rounded-full bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 text-[11px] font-bold text-terracotta-clay">
            {filteredStores.length} dari {storesList.length} toko
          </span>
        </div>
      </div>

      {filteredStores.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs font-medium text-gray-500">
          Tidak ada toko mitra yang cocok dengan pencarian{" "}
          {searchTerm ? <span className="font-bold text-terracotta-clay">&quot;{searchTerm}&quot;</span> : ""}.
        </div>
      ) : (
        <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar px-1 pb-2">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-600 shadow-sm">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-black">Nama Toko</th>
                <th scope="col" className="px-4 py-2.5 font-black">Pemilik</th>
                <th scope="col" className="px-4 py-2.5 font-black">Kontak</th>
                <th scope="col" className="px-4 py-2.5 font-black">Lokasi</th>
                <th scope="col" className="px-4 py-2.5 font-black">STATUS &amp; AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStores.map((store) => {
                const currentStatus = (store.status || (store.is_active ? "aktif" : "pending")) as MitraStatus;

                const ownerName = Array.isArray(store.owner)
                  ? store.owner[0]?.full_name ?? "—"
                  : store.owner?.full_name ?? "—";

                const isRowUpdating = updatingStoreId === store.id;

                return (
                  <tr key={store.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      <div className="font-bold text-gray-900">{store.name}</div>
                      <div className="text-[10px] font-medium text-gray-400">ID: {store.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{ownerName}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-600">{store.phone || "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-600 max-w-xs">
                      <p className="line-clamp-2 text-xs text-gray-900" title={store.address || store.city || "—"}>
                        {store.address || store.city || "—"}
                      </p>
                      {store.address && store.city && !store.address.toLowerCase().includes(store.city.toLowerCase()) && (
                        <span className="text-[10px] text-gray-500 font-normal block mt-0.5">
                          Kota: {store.city}
                        </span>
                      )}
                    </td>
                    
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="relative inline-flex items-center">
                          <select
                            value={currentStatus}
                            disabled={isRowUpdating}
                            onChange={(e) => handleStatusChange(store.id, e.target.value as MitraStatus)}
                            aria-label={`Ubah status untuk toko ${store.name}`}
                            className={`cursor-pointer rounded-xl border px-2.5 py-1 text-xs font-bold shadow-sm outline-none transition-all focus:ring-1 focus:ring-dusty-rose/40 disabled:cursor-wait disabled:opacity-60 ${
                              statusStyles[currentStatus] || statusStyles.pending
                            }`}
                          >
                            <option value="aktif" className="bg-[#e0e5ec] text-emerald-800">
                              ● Aktif
                            </option>
                            <option value="pending" className="bg-[#e0e5ec] text-amber-800">
                              ▲ Pending
                            </option>
                            <option value="nonaktif" className="bg-[#e0e5ec] text-rose-800">
                              ✕ Nonaktif
                            </option>
                          </select>
                          {isRowUpdating && (
                            <Loader2 className="pointer-events-none absolute right-2 h-3 w-3 text-terracotta-clay animate-spin" />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenMessageModal(store)}
                          title={
                            store.status_message
                              ? `Pesan tersimpan: "${store.status_message}"`
                              : "Kirim pesan peringatan / catatan mitra"
                          }
                          aria-label={`Kirim pesan untuk toko ${store.name}`}
                          className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-600 border border-gray-200 transition-all hover:text-terracotta-clay hover:bg-gray-100 shadow-sm active:scale-95"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {store.status_message && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" title="Ada pesan aktif">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terracotta-clay opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-terracotta-clay border border-white" />
                            </span>
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
      )}

      {isModalOpen && selectedMitra && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-all animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg rounded-xl bg-white p-5 sm:p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-terracotta-clay">
                    Pesan Toko Mitra
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {selectedMitra.city || "SarniyaSync"}
                  </span>
                </div>
                <h3
                  id="modal-headline"
                  className="mt-1 text-base sm:text-lg font-black text-gray-800"
                >
                  Kirim Pesan ke {selectedMitra.name}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Pesan peringatan, peninjauan, atau instruksi resmi untuk mitra ini.
                </p>
              </div>

              <button
                type="button"
                onClick={() => !isSaving && setIsModalOpen(false)}
                aria-label="Tutup modal"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mitra-message"
                className="block text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Isi Pesan / Instruksi Khusus:
              </label>
              <textarea
                id="mitra-message"
                rows={4}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Tuliskan pesan peringatan, peninjauan, atau instruksi untuk mitra ini (misal: 'Harap segera lakukan verifikasi dokumen outlet' atau 'Akun sedang dalam tahap peninjauan tim verifikasi'). Kosongkan jika ingin menghapus pesan."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs sm:text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:outline-none focus:ring-2 focus:ring-terracotta-clay/20 focus:border-terracotta-clay"
              />
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>
                  {selectedMitra.status_message ? "Catatan: Mitra ini memiliki pesan aktif sebelumnya" : "Belum ada pesan tersimpan"}
                </span>
                <span>{messageInput.length} karakter</span>
              </div>
            </div>

            {modalFeedback && (
              <div
                role={modalFeedback.type === "error" ? "alert" : "status"}
                className={`flex items-center gap-2 rounded-lg p-2.5 text-xs font-bold ${
                  modalFeedback.type === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {modalFeedback.type === "error" ? (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <Check className="h-4 w-4 shrink-0" />
                )}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="rounded-lg bg-gray-100 border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveMessage}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta-clay px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-wait disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Simpan Pesan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
