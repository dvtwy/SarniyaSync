"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type ReceiveResult = {
  error?: string;
  success?: string;
};

export async function receiveStockTransfer(transferId: string): Promise<ReceiveResult> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(transferId)) {
    return { error: "ID kiriman tidak valid." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Sesi login diperlukan." };

    // Panggil RPC atomik yang memvalidasi kepemilikan, mengubah status, dan melakukan UPSERT ke partner_store_inventory dalam satu transaksi DB.
    const { data, error } = await supabase.rpc("receive_stock_transfer", {
      p_transfer_id: transferId,
    });

    if (error) {
      if (error.message.includes("P0002")) return { error: "Kiriman tidak ditemukan." };
      if (error.message.includes("P0003")) return { error: "Paket ini sudah diterima sebelumnya." };
      if (error.message.includes("42501")) return { error: "Anda tidak berhak menerima kiriman ini." };
      return { error: error.message };
    }

    const resultData = data as { success?: boolean } | null;
    if (!resultData || !resultData.success) {
      return { error: "Penerimaan gagal diproses oleh server." };
    }

    revalidatePath("/partner/penerimaan");
    revalidatePath("/partner/stok");
    revalidatePath("/partner");
    revalidatePath("/dashboard-mitra");

    return { success: `Paket berhasil diterima! Stok telah ditambahkan ke toko Anda.` };
  } catch (error) {
    console.error("receiveStockTransfer failed:", error);
    return { error: error instanceof Error ? error.message : "Penerimaan barang gagal." };
  }
}
