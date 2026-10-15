"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ENTERPRISE_ID,
  ENTERPRISE_KEY,
  TOKEN_KEY,
  getEnterpriseSession,
} from "../../lib/enterpriseClient";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  UserRound,
  MapPin,
  ChevronDown,
  LogOut,
  HelpCircle,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/enterprise/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    href: "/enterprise/products",
    icon: Package,
    expandable: true,
    children: [
      {
        label: "Create & manage",
        href: "/enterprise/products",
      },
    ],
  },
  {
    label: "Orders",
    href: "/enterprise/orders",
    icon: ClipboardList,
    expandable: true,
    children: [
      {
        label: "Create Order",
        href: "/enterprise/orders/createOrder",
      },
      {
        label: "Manage Orders",
        href: "/enterprise/orders/manageOrder",
      },
    ],
  },
  {
    label: "Profile",
    href: "/enterprise/profile",
    icon: UserRound,
  },
];

export default function EnterpriseShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [enterprise, setEnterprise] = useState(null);
  const [ready, setReady] = useState(false);

  const [productsOpen, setProductsOpen] = useState(
    pathname?.startsWith("/enterprise/products") ?? false
  );

  const [ordersOpen, setOrdersOpen] = useState(
    pathname?.startsWith("/enterprise/orders") ?? false
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    try {
      const storedEnterprise = localStorage.getItem("shopsync_enterprise");
      const currentEnterprise = storedEnterprise
        ? JSON.parse(storedEnterprise)
        : null;

      setLocation(currentEnterprise?.location ?? null);
    } catch (error) {
      console.error("Unable to read stored enterprise:", error);
      setLocation(null);
    }

    const session = getEnterpriseSession();

    if (!session?.token) {
      router.replace("/enterprise/auth");
      return;
    }

    setEnterprise(session.enterprise ?? null);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (pathname?.startsWith("/enterprise/orders")) {
      setOrdersOpen(true);
    }

    if (pathname?.startsWith("/enterprise/products")) {
      setProductsOpen(true);
    }

    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ENTERPRISE_KEY);
    localStorage.removeItem(ENTERPRISE_ID);

    router.replace("/enterprise/auth");
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 text-slate-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-extrabold text-white shadow-lg shadow-blue-600/20">
          S
        </div>

        <p className="text-[13px] font-medium">
          Preparing your workspace...
        </p>
      </div>
    );
  }

  const businessName = enterprise?.enterpriseName || "Your business";
  const initial = businessName.charAt(0).toUpperCase();

  const address = [
    location?.addressLine,
    location?.landmark,
    location?.district,
    location?.state,
    location?.pinCode,
  ]
    .filter(Boolean)
    .join(", ");

  function isActive(item) {
    if (item.label === "Dashboard") {
      return pathname === item.href;
    }

    if (item.label === "Products") {
      return (
        pathname === item.href ||
        pathname?.startsWith("/enterprise/products/")
      );
    }

    if (item.label === "Orders") {
      return pathname?.startsWith("/enterprise/orders");
    }

    return pathname === item.href;
  }

  function toggleDropdown(item) {
    if (item.label === "Products") {
      setProductsOpen((open) => !open);
    }

    if (item.label === "Orders") {
      setOrdersOpen((open) => !open);
    }
  }

  function isDropdownOpen(item) {
    if (item.label === "Products") return productsOpen;
    if (item.label === "Orders") return ordersOpen;
    return false;
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 flex-col overflow-hidden border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <Link
          href="/enterprise/dashboard"
          className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-100 px-5 text-lg font-extrabold tracking-tight text-slate-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-md shadow-blue-600/20">
            S
          </span>

          ShopSync<span className="text-blue-600">.</span>
        </Link>

        {/* Enterprise information */}
        <div className="shrink-0 px-3 pt-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-1">
              <strong className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Current Location
              </strong>

              <span className="truncate text-[13px] font-bold text-slate-900">
                {businessName}
              </span>

              <span className="truncate text-[11px] text-slate-500">
                {enterprise?.phone || "No phone number"}
              </span>

              <div className="flex items-start gap-1.5 text-[11px] leading-4 text-slate-500">
                <MapPin
                  size={13}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <span className="line-clamp-2 break-words">
                  {address || "Location not available"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 px-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />

            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Workspace active
            </span>
          </div>
        </div>

        {/* Navigation heading */}
        <p className="shrink-0 px-5 pb-1.5 pt-4 text-[11px] font-bold tracking-[0.18em] text-slate-400">
          WORKSPACE
        </p>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const isOpen = isDropdownOpen(item);

            if (item.expandable) {
              return (
                <div key={item.href}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                    onClick={() => toggleDropdown(item)}
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon size={18} />
                    </span>

                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>

                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="ml-7 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
                      {item.children.map((child) => {
                        const childActive = pathname === child.href;

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                              childActive
                                ? "bg-blue-50 font-bold text-blue-700"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                childActive
                                  ? "bg-blue-600"
                                  : "bg-slate-300"
                              }`}
                            />

                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    active
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={18} />
                </span>

                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-blue-50 p-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
              <HelpCircle size={17} />
            </span>

            <div className="min-w-0">
              <strong className="block truncate text-xs font-bold text-slate-800">
                Need assistance?
              </strong>

              <small className="mt-0.5 block text-[10px] leading-4 text-slate-500">
                Your workspace is ready.
              </small>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={logout}
          >
            <LogOut size={16} />
            Sign out
          </button>

          <p className="mt-2 text-center text-[11px] text-slate-400">
            © 2026 ShopSync. All rights reserved.
          </p>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="min-h-dvh lg:pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xl sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>

            <div className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />

              <span className="shrink-0 font-medium text-slate-500">
                Enterprise
              </span>

              <span className="text-slate-300">/</span>

              <span className="truncate font-bold capitalize text-slate-900">
                {pathname?.split("/").filter(Boolean).at(-1) || "dashboard"}
              </span>
            </div>
          </div>

          <nav className="hidden shrink-0 items-center gap-5 text-[13px] font-medium text-slate-500 md:flex">
            <Link
              href="/enterprise/dashboard"
              className="transition hover:text-blue-600"
            >
              Overview
            </Link>

            <Link
              href="/enterprise/products"
              className="transition hover:text-blue-600"
            >
              Products
            </Link>
          </nav>

          {/* Profile menu */}
          <div className="relative flex shrink-0 items-center">
            <span
              className="mr-2 h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-50"
              title="Workspace active"
            />

            <button
              type="button"
              className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50 sm:gap-3 sm:px-2"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label="Open enterprise profile menu"
              aria-expanded={profileOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
                {initial}
              </span>

              <span className="hidden text-left sm:block">
                <strong className="block max-w-28 truncate text-[11px] font-bold text-slate-800">
                  {enterprise?.enterpriseName || "Account"}
                </strong>

                <small className="mt-0.5 block text-[11px] text-slate-400">
                  Enterprise
                </small>
              </span>

              <ChevronDown
                size={15}
                className={`hidden text-slate-400 transition-transform sm:block ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
                <Link
                  href="/enterprise/profile"
                  onClick={() => setProfileOpen(false)}
                  className="block rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  View profile
                </Link>

                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  onClick={logout}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}