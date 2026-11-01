"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { AppRole, getProfileRole } from "@/utils/supabase/auth";
import { useSidebar } from "@/context/sidebar-context";
import LogoutModal from "@/components/LogoutModal";

type NavigationItem = { label: string; href: string };

function getNavIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("dashboard")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    );
  }
  if (l.includes("produk") || l.includes("katalog")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    );
  }
  if (l.includes("stok") || l.includes("inventory")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    );
  }
  if (l.includes("alokasi")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    );
  }
  if (l.includes("pengiriman") || l.includes("logistik")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    );
  }
  if (l.includes("mitra")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  if (l.includes("penyesuaian") || l.includes("opname")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    );
  }
  if (l.includes("penjualan") || l.includes("laporan")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }
  if (l.includes("kasir")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="7" y1="15" x2="7.01" y2="15" />
        <line x1="12" y1="15" x2="12.01" y2="15" />
        <line x1="17" y1="15" x2="17.01" y2="15" />
      </svg>
    );
  }
  if (l.includes("transaksi") || l.includes("riwayat")) {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function SidebarNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<AppRole | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();

  useEffect(() => {
    if (
      pathname === "/login" || pathname === "/register" ||
      pathname === "/partner" || pathname.startsWith("/partner/") ||
      pathname === "/dashboard-mitra" || pathname.startsWith("/dashboard-mitra/") ||
      pathname === "/store" || pathname.startsWith("/store/")
    ) return;
    let isActive = true;

    async function loadNavigation() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        const userRole = await getProfileRole(supabase, user.id);
        if (!userRole) {
          router.replace("/login?error=profile");
          return;
        }

        if (!isActive) return;
        setRole(userRole);

        if (userRole === "mitra") {
          const { data: stores } = await supabase
            .from("partner_stores")
            .select("id, name")
            .eq("owner_id", user.id)
            .order("name", { ascending: true });
          if (!isActive) return;

          const storeItems = (stores ?? []).map((store) => ({
            label: (stores ?? []).length === 1 ? "Laporan Penjualan Toko Saya" : `Laporan ${store.name}`,
            href: `/store/${store.id}`,
          }));
          setNavigationItems([
            { label: "Dashboard Mitra", href: "/dashboard-mitra" },
            { label: "Katalog Produk", href: "/partner/katalog" },
            { label: "Stok Toko", href: "/partner/stok" },
            { label: "Kasir", href: "/partner/kasir" },
            { label: "Riwayat Transaksi", href: "/partner/transaksi" },
            ...storeItems,
            { label: "Pengaturan Akun", href: "/profil-mitra" },
          ]);
          return;
        }

        setNavigationItems([
          { label: "Dashboard Utama", href: "/dashboard" },
          { label: "Katalog Produk", href: "/produk" },
          { label: "Kelola Stok Keseluruhan", href: "/inventory" },
          { label: "Alokasi Stok", href: "/alokasi" },
          { label: "Status Pengiriman", href: "/pengiriman" },
          { label: "Manajemen Mitra", href: "/mitra" },
          { label: "Laporan Penyesuaian", href: "/laporan-penyesuaian" },
          { label: "Laporan Penjualan", href: "/penjualan" },
          { label: "Pengaturan Akun", href: "/profil-admin" },
        ]);
      } catch {
        if (isActive) router.replace("/login?error=profile");
      }
    }

    void loadNavigation();
    return () => {
      isActive = false;
    };
  }, [pathname, router]);

  async function handleLogout() {
    setIsLoggingOut(true);
    setLogoutError("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLogoutError(error.message);
      setIsLoggingOut(false);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  if (
    pathname === "/login" || pathname === "/register" ||
    pathname === "/partner" || pathname.startsWith("/partner/") ||
    pathname === "/dashboard-mitra" || pathname.startsWith("/dashboard-mitra/") ||
    pathname === "/store" || pathname.startsWith("/store/")
  ) return null;

  return (
    <aside
      className={`relative flex flex-col h-screen lg:sticky lg:top-0 border-b border-gray-200 bg-white text-gray-800 shadow-sm transition-all duration-300 ease-in-out lg:shrink-0 lg:border-b-0 lg:border-r ${
        isSidebarOpen ? "w-full lg:w-64" : "w-full lg:w-20"
      }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col min-h-0">
        <div
          className={`flex items-center py-5 transition-all duration-300 flex-shrink-0 ${
            isSidebarOpen ? "justify-between px-5" : "flex-col justify-center gap-3 px-3"
          }`}
        >
          <div className={`flex items-center gap-3 ${!isSidebarOpen ? "justify-center" : ""}`}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50/60 border border-orange-100 p-1.5 shadow-sm">
              <Image
                src="/logo-sarniya.png"
                alt="Sarniya Logo"
                width={36}
                height={36}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap transition-opacity duration-200">
                <span className="text-base font-black tracking-tight text-gray-900">
                  SarniyaSync
                </span>
                <p className="text-[10px] font-medium text-gray-500">
                  Ruang Operasional
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Ciutkan Sidebar" : "Buka Sidebar"}
            title={isSidebarOpen ? "Sembunyikan Menu" : "Buka Menu"}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-terracotta-clay text-white shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            <svg
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>

        <nav
          aria-label="Navigasi utama"
          className="flex gap-1.5 overflow-x-auto px-3 pb-3 lg:flex-col"
        >
          {navigationItems.map((item) => {
            const isPenjualanAlias =
              (item.href === "/penjualan" || item.href === "/partner/transaksi") &&
              (pathname.startsWith("/riwayat") || pathname.startsWith("/riwayat-admin") || pathname.startsWith("/riwayat-mitra"));
            const isKatalogAlias =
              (item.href === "/produk" || item.href === "/partner/katalog") &&
              (pathname.startsWith("/katalog") || pathname.startsWith("/partner/katalog"));
            const isProfilAlias =
              (item.href === "/profil-admin" && pathname.startsWith("/profil-admin")) ||
              (item.href === "/profil-mitra" && (pathname.startsWith("/profil-mitra") || pathname.startsWith("/partner/profil")));
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ||
              isPenjualanAlias ||
              isKatalogAlias ||
              isProfilAlias;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                title={!isSidebarOpen ? item.label : undefined}
                className={`group flex w-auto lg:w-full shrink-0 items-center justify-start rounded-xl h-10 px-3.5 text-xs overflow-hidden transition-all duration-200 ${
                  isActive
                    ? "bg-terracotta-clay text-white shadow-sm font-semibold"
                    : "text-gray-700 font-medium hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center mr-3 transition-colors ${
                    isActive ? "text-white" : "text-gray-700 group-hover:text-terracotta-clay"
                  }`}
                >
                  {getNavIcon(item.label)}
                </span>

                <span
                  className={`truncate whitespace-nowrap transition-all duration-200 ${
                    isSidebarOpen ? "opacity-100" : "hidden opacity-0 w-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {role === "mitra" && navigationItems.length === 1 && isSidebarOpen && (
            <p className="px-3 py-2 text-[11px] font-medium text-gray-500">
              Belum ada toko yang ditugaskan.
            </p>
          )}
        </nav>
      </div>

      <div
        className="flex-shrink-0 mt-auto border-t border-gray-200 px-3 py-4 transition-all duration-300"
      >
        {isSidebarOpen && (
          <p className="text-[11px] font-medium text-gray-500 mb-2 truncate px-1">
            Rantai pasok, lebih terhubung.
          </p>
        )}

        {logoutError && isSidebarOpen && (
          <p role="alert" className="mb-2.5 rounded-lg border border-rose-300 bg-rose-50/90 p-2 text-[10px] font-semibold text-rose-800 truncate">
            {logoutError}
          </p>
        )}

        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          disabled={isLoggingOut}
          title={!isSidebarOpen ? "Keluar Sesi" : undefined}
          className="group flex w-auto lg:w-full shrink-0 items-center justify-start rounded-xl h-10 px-3.5 text-xs font-semibold uppercase tracking-wider text-terracotta-clay bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden"
        >
          <span className="flex size-6 shrink-0 items-center justify-center mr-3 transition-colors">
            <svg
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>

          <span
            className={`truncate transition-all duration-200 ${
              isSidebarOpen ? "opacity-100" : "hidden opacity-0 w-0"
            }`}
          >
            {isLoggingOut ? "Keluar..." : "Keluar Sesi"}
          </span>
        </button>
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => void handleLogout()}
        isLoggingOut={isLoggingOut}
      />
    </aside>
  );
}