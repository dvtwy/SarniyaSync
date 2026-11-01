"use client";

import { LogOut } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut?: boolean;
}

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut = false,
}: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 transition-all animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoggingOut) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-white p-6 shadow-xl border border-gray-200 text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
          <LogOut className="size-6" />
        </div>

        <div>
          <h3
            id="logout-modal-title"
            className="text-base font-bold text-gray-900"
          >
            Keluar dari SarniyaSync?
          </h3>
          <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
            Sesi operasional Anda saat ini akan diakhiri. Anda perlu masuk kembali menggunakan email dan kata sandi untuk mengakses sistem.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="flex-1 rounded-xl bg-[#9D5C4C] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#864c3e] disabled:opacity-60 active:scale-95"
          >
            {isLoggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </div>
    </div>
  );
}

