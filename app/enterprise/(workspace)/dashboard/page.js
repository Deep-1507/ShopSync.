
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  enterpriseRequest,
  getEnterpriseSession,
} from "../../../../lib/enterpriseClient";

function normalizeList(result) {
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.orders)) return result.data.orders;
  if (Array.isArray(result?.orders)) return result.orders;
  return [];
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function EnterpriseDashboard() {
  const [enterprise, setEnterprise] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayDate, setTodayDate] = useState(null);

  useEffect(() => {
    const session = getEnterpriseSession();
    setEnterprise(session?.enterprise ?? null);

    async function loadDashboard() {
      try {
        const enterpriseId = localStorage.getItem("Enterprise_id");

        const productPromise = enterpriseRequest(
          `/api/products/allProducts/${enterpriseId}`
        );

        const orderPromise = enterpriseId
          ? enterpriseRequest(`/api/orders/enterprise/${enterpriseId}`)
          : Promise.resolve({ data: [] });

        const [productResult, orderResult] = await Promise.all([
          productPromise,
          orderPromise,
        ]);

        setProducts(normalizeList(productResult));
        setOrders(normalizeList(orderResult));
      } catch (err) {
        setError(err?.message || "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    setTodayDate(new Date());
  }, []);

  const stats = useMemo(() => {
    if (!todayDate) {
      return {
        products: products.length,
        orders: orders.length,
        today: 0,
        revenue: orders
          .filter((order) => order.orderStatus !== "cancelled")
          .reduce(
            (total, order) => total + (Number(order.grandTotal) || 0),
            0
          ),
      };
    }

    const isToday = (value) => {
      if (!value) return false;

      const date = new Date(value);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getDate() === todayDate.getDate() &&
        date.getMonth() === todayDate.getMonth() &&
        date.getFullYear() === todayDate.getFullYear()
      );
    };

    const validOrders = orders.filter(
      (order) => order.orderStatus !== "cancelled"
    );

    return {
      products: products.length,
      orders: orders.length,
      today: orders.filter((order) =>
        isToday(order.createdAt || order.billDate)
      ).length,
      revenue: validOrders.reduce(
        (total, order) => total + (Number(order.grandTotal) || 0),
        0
      ),
    };
  }, [products, orders, todayDate]);

  const chart = useMemo(() => {
    if (!todayDate) return [];

    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(todayDate);

      start.setDate(todayDate.getDate() - (5 - index) * 5 - 4);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 5);

      const count = orders.filter((order) => {
        const date = new Date(order.createdAt || order.billDate);

        return (
          !Number.isNaN(date.getTime()) &&
          date >= start &&
          date < end
        );
      }).length;

      return {
        label: `${start.getDate()}–${new Date(
          end.getTime() - 86400000
        ).getDate()}`,
        count,
      };
    });
  }, [orders, todayDate]);

  const maxCount = Math.max(...chart.map((item) => item.count), 1);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="text-sm font-medium">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Registered products",
      value: stats.products.toLocaleString("en-IN"),
      description: "Products in your catalogue",
      period: "ALL TIME",
      icon: "▦",
      iconClass: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Total orders / bills",
      value: stats.orders.toLocaleString("en-IN"),
      description: "Orders recorded by ShopSync",
      period: "ALL TIME",
      icon: "▤",
      iconClass: "bg-violet-50 text-violet-700",
    },
    {
      label: "Orders today",
      value: stats.today.toLocaleString("en-IN"),
      description: "Based on order creation date",
      period: "TODAY",
      icon: "◷",
      iconClass: "bg-orange-50 text-orange-700",
    },
    {
      label: "Order value",
      value: money(stats.revenue),
      description: "Excludes cancelled orders",
      period: "ALL TIME",
      icon: "₹",
      iconClass: "bg-emerald-50 text-emerald-700",
    },
  ];

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.billDate) -
        new Date(a.createdAt || a.billDate)
    )
    .slice(0, 5);

  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Dashboard heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            Your business at a glance
          </span>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Good to see you, {enterprise?.name || "there"}.
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s what&apos;s happening with{" "}
            {enterprise?.enterpriseName || "your business"}.
          </p>
        </div>

        <Link
          href="/enterprise/products"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:self-center"
        >
          <span className="text-lg leading-none">＋</span>
          Add product
        </Link>
      </section>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {/* Active enterprise workspace */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg font-extrabold text-white">
            S
          </div>

          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Active workspace
            </span>
            <strong className="mt-1 block truncate text-sm font-bold text-slate-900">
              {enterprise?.enterpriseName || "Your business"}
            </strong>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            {enterprise?.category || "Enterprise"}
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-base">⌖</span>
            Workspace active
          </span>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article
            key={card.label}
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${card.iconClass}`}
              >
                {card.icon}
              </span>

              <span className="rounded-full bg-slate-50 px-2 py-1 text-[9px] font-bold tracking-wider text-slate-400">
                {card.period}
              </span>
            </div>

            <span className="mt-4 block text-xs font-semibold text-slate-500">
              {card.label}
            </span>

            <strong className="mt-1 block break-words text-2xl font-extrabold tracking-tight text-slate-900">
              {card.value}
            </strong>

            <span className="mt-2 block text-xs text-slate-400">
              {card.description}
            </span>
          </article>
        ))}
      </section>

      {/* Chart and quick actions */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                Order activity
              </span>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Orders over the last 30 days
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Order counts grouped into five-day periods.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
              Orders
            </span>
          </div>

          <div className="mt-6 grid h-56 grid-cols-6 gap-2 border-b border-slate-100 px-1 sm:gap-4">
            {chart.map((item) => (
              <div
                key={item.label}
                className="flex min-w-0 flex-col items-center justify-end gap-2"
              >
                <span className="text-xs font-semibold tabular-nums text-slate-600">
                  {item.count}
                </span>

                <div className="flex h-40 w-full max-w-10 items-end overflow-hidden rounded-t-md bg-slate-100">
                  <div
                    className="w-full rounded-t-md bg-emerald-600 transition-all duration-500"
                    style={{
                      height: `${Math.max(
                        item.count > 0 ? 8 : 0,
                        (item.count / maxCount) * 100
                      )}%`,
                    }}
                  />
                </div>

                <span className="whitespace-nowrap pb-2 text-[10px] font-medium text-slate-400">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-slate-400">
            Day of month · five-day groups
          </p>
        </article>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
              Shortcuts
            </span>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              Quick actions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Get straight to the work that matters.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <Link
              href="/enterprise/products"
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-100 hover:bg-emerald-50/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
                ＋
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-slate-800">
                  Add a new product
                </strong>
                <small className="mt-1 block text-xs text-slate-500">
                  Expand your product catalogue
                </small>
              </span>
              <span className="text-sm text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600">
                ↗
              </span>
            </Link>

            <Link
              href="/enterprise/products"
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-100 hover:bg-emerald-50/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg font-bold text-violet-700">
                ▤
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-slate-800">
                  Manage inventory
                </strong>
                <small className="mt-1 block text-xs text-slate-500">
                  Review prices and stock levels
                </small>
              </span>
              <span className="text-sm text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600">
                ↗
              </span>
            </Link>

            <Link
              href="/enterprise/profile"
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-100 hover:bg-emerald-50/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-700">
                ◉
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-slate-800">
                  Business profile
                </strong>
                <small className="mt-1 block text-xs text-slate-500">
                  Review your business details
                </small>
              </span>
              <span className="text-sm text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600">
                ↗
              </span>
            </Link>
          </div>
        </article>
      </section>

      {/* Recent orders */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
              Latest activity
            </span>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              Recent orders
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Your latest recorded bills and orders.
            </p>
          </div>

          <span className="self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:self-center">
            {orders.length} orders
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">
              ▤
            </span>
            <strong className="mt-3 text-sm font-bold text-slate-800">
              No orders yet
            </strong>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Orders will appear here once customers start purchasing.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Bill number</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Order status</th>
                  <th className="px-5 py-3">Payment status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <strong className="font-semibold text-slate-800">
                        {order.billNumber || "—"}
                      </strong>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {order.createdAt || order.billDate
                        ? new Date(
                            order.createdAt || order.billDate
                          ).toLocaleDateString("en-IN")
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                        {order.orderStatus || "placed"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="text-xs font-medium capitalize text-slate-600">
                        {order.paymentStatus || "pending"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <strong className="font-semibold text-slate-900">
                        {money(order.grandTotal)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
