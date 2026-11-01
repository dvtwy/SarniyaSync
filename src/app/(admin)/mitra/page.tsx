import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getProfileRole } from "@/utils/supabase/auth";
import { redirect } from "next/navigation";
import MitraTableClient, { StoreItem } from "./mitra-table-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manajemen Mitra | SarniyaSync",
  description: "Kontrol status dan daftar toko mitra SarniyaSync.",
};

export default async function PartnerManagementPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getProfileRole(supabase, user.id);
  if (role !== "admin" && role !== "pemilik") redirect("/");

  const { data: storesData, error: storeError } = await supabase
    .from("partner_stores")
    .select("id, owner_id, name, address, city, phone, is_active, status, status_message")
    .order("name", { ascending: true });

  const ownerIds = Array.from(new Set((storesData ?? []).map((s) => s.owner_id).filter(Boolean)));
  let ownerMap = new Map<string, string>();

  if (ownerIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ownerIds);

    if (profilesData) {
      ownerMap = new Map(profilesData.map((p) => [p.id, p.full_name ?? ""]));
    }
  }

  const stores: StoreItem[] = (storesData ?? []).map((s) => ({
    id: s.id,
    owner_id: s.owner_id,
    name: s.name,
    address: s.address,
    city: s.city,
    phone: s.phone,
    is_active: Boolean(s.is_active),
    status: s.status,
    status_message: s.status_message,
    owner: { full_name: ownerMap.get(s.owner_id) || "—" },
  }));

  const errorMessage = storeError?.message ?? "";

  return (
    <div className="w-full px-2 py-3 sm:px-4 sm:py-4">
      <header className="mb-4">
        <span className="inline-block rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[11px] font-bold text-terracotta-clay">
          Area Pemilik / Administrator
        </span>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">
          Manajemen Mitra
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Kelola status operasional toko mitra (Aktif, Pending, atau Nonaktif) secara langsung dengan kendali terpadu.
        </p>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50/95 p-3.5 text-xs font-semibold text-rose-800"
        >
          Data mitra gagal dimuat: {errorMessage}
        </div>
      ) : (
        <section
          aria-label="Daftar mitra"
          className="overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm"
        >
          <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
            <h2 className="text-base font-semibold text-gray-800">Daftar Toko Mitra</h2>
            <p className="mt-0.5 text-xs font-medium text-gray-500">
              {stores.length} toko mitra terdaftar dalam ekosistem SarniyaSync
            </p>
          </div>

          {!stores.length ? (
            <p className="px-4 py-8 text-center text-xs font-medium text-[#7a8394]">
              Belum ada toko mitra yang terdaftar.
            </p>
          ) : (
            <MitraTableClient stores={stores} />
          )}
        </section>
      )}
    </div>
  );
}
