"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getUserSession,
  userRequest,
} from "../../../../lib/userClient";

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

function formatLocation(location) {
  if (!location) return "Location not set";

  if (typeof location === "string") {
    return location;
  }

  if (typeof location === "object") {
    return [
      location.addressLine,
      location.district,
      location.state,
      location.pinCode,
    ]
      .filter(Boolean)
      .join(", ") || "Location not set";
  }

  return "Location not set";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN");
}

export default function EnterpriseDashboard() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getUserSession();
    setUser(session?.user ?? null);

    let cancelled = false;

    async function loadDashboard() {
      try {
        setError("");
        const orderResult = await userRequest("/api/orders");

        if (!cancelled) {
          setOrders(normalizeList(orderResult));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message || "Unable to load dashboard data"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date();

    const isToday = (value) => {
      if (!value) return false;

      const date = new Date(value);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    const validOrders = orders.filter(
      (order) =>
        String(order?.orderStatus ?? "").toLowerCase() !==
        "cancelled"
    );

    return {
      orders: orders.length,

      today: orders.filter((order) =>
        isToday(order?.createdAt || order?.billDate)
      ).length,

      revenue: validOrders.reduce(
        (total, order) =>
          total + (Number(order?.grandTotal) || 0),
        0
      ),
    };
  }, [orders]);

  const chart = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(now);

      start.setDate(
        now.getDate() - (5 - index) * 5 - 4
      );
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 5);

      const count = orders.filter((order) => {
        const value = order?.createdAt || order?.billDate;

        if (!value) return false;

        const date = new Date(value);

        return (
          !Number.isNaN(date.getTime()) &&
          date >= start &&
          date < end
        );
      }).length;

      const lastDay = new Date(end.getTime() - 86400000);

      return {
        label: `${start.getDate()}–${lastDay.getDate()}`,
        count,
      };
    });
  }, [orders]);

  const maxCount = Math.max(
    ...chart.map((item) => item.count),
    1
  );

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const dateA = new Date(
          a?.createdAt || a?.billDate || 0
        ).getTime();

        const dateB = new Date(
          b?.createdAt || b?.billDate || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);
  }, [orders]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-slate-50 px-4 text-sm font-medium text-slate-500">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Dashboard heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">
            Your account at a glance
          </span>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Good to see you, {user?.name || "there"}.
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Here&apos;s what&apos;s happening.......
          </p>
        </div>
      </section>

      {/* Error notice */}
      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Account information */}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm shadow-blue-200">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active dashboard
            </span>

            <strong className="truncate text-sm font-semibold text-slate-800">
              {user?.name || "Name"}
            </strong>
          </div>
        </div>

        <div className="flex min-w-0 items-start gap-2 text-sm text-slate-500 sm:max-w-[55%] sm:items-center">
          <span className="mt-0.5 shrink-0 text-lg text-blue-600 sm:mt-0">
            ⌖
          </span>

          <span className="break-words leading-5">
            {formatLocation(user?.location)}
          </span>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-600">
              ▤
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-500">
              ALL TIME
            </span>
          </div>

          <span className="mt-5 block text-sm font-medium text-slate-500">
            Total orders / bills
          </span>

          <strong className="mt-2 block text-3xl font-bold tracking-tight text-slate-900">
            {stats.orders.toLocaleString("en-IN")}
          </strong>

          <span className="mt-2 block text-xs leading-5 text-slate-400">
            Orders recorded by ShopSync
          </span>
        </article>

        <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl text-orange-600">
              ◷
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-500">
              TODAY
            </span>
          </div>

          <span className="mt-5 block text-sm font-medium text-slate-500">
            Orders today
          </span>

          <strong className="mt-2 block text-3xl font-bold tracking-tight text-slate-900">
            {stats.today.toLocaleString("en-IN")}
          </strong>

          <span className="mt-2 block text-xs leading-5 text-slate-400">
            Based on order creation date
          </span>
        </article>

        <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl font-semibold text-emerald-600">
              ₹
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-500">
              ALL TIME
            </span>
          </div>

          <span className="mt-5 block text-sm font-medium text-slate-500">
            Order value
          </span>

          <strong className="mt-2 block break-words text-3xl font-bold tracking-tight text-slate-900">
            {money(stats.revenue)}
          </strong>

          <span className="mt-2 block text-xs leading-5 text-slate-400">
            Excludes cancelled orders
          </span>
        </article>
      </section>

      {/* Chart and quick actions */}
      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        {/* Order activity chart */}
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                Order activity
              </span>

              <h2 className="mt-2 text-lg font-bold text-slate-900">
                Orders over the last 30 days
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Order counts grouped into five-day periods.
              </p>
            </div>

            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
              Orders
            </span>
          </div>

          <div className="mt-8 grid h-56 grid-cols-6 gap-2 border-b border-slate-100 sm:gap-4">
            {chart.map((item) => (
              <div
                className="flex min-w-0 flex-col items-center justify-end gap-2"
                key={item.label}
              >
                <span className="text-xs font-semibold tabular-nums text-slate-600">
                  {item.count}
                </span>

                <div className="flex h-40 w-full items-end justify-center rounded-t-md bg-slate-50">
                  <div
                    className="w-full max-w-10 rounded-t-md bg-blue-600 transition-all duration-300 hover:bg-blue-700"
                    style={{
                      height: `${
                        item.count > 0
                          ? Math.max(
                              8,
                              (item.count / maxCount) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <span className="whitespace-nowrap text-[10px] font-medium text-slate-500 sm:text-xs">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center text-xs text-slate-400">
            Day of month · five-day groups
          </div>
        </article>

        {/* Quick actions */}
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Shortcuts
            </span>

            <h2 className="mt-2 text-lg font-bold text-slate-900">
              Quick actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Get straight to what matters.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <Link
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/60"
              href="/user/products"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-medium text-blue-600 transition-colors group-hover:bg-blue-100">
                ＋
              </span>

              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-slate-800">
                  View products
                </strong>

                <small className="mt-1 block text-xs leading-5 text-slate-500">
                  Explore our wide variety of Products
                </small>
              </span>

              <span className="shrink-0 text-lg text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600">
                ↗
              </span>
            </Link>

            <Link
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-violet-200 hover:bg-violet-50/60"
              href="/user/enterprises"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-600 transition-colors group-hover:bg-violet-100">
                ▤
              </span>

              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-slate-800">
                  View Enterprises
                </strong>

                <small className="mt-1 block text-xs leading-5 text-slate-500">
                  Check Out the enterprises available for you
                </small>
              </span>

              <span className="shrink-0 text-lg text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-600">
                ↗
              </span>
            </Link>

            <Link
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/60"
              href="/user/profile"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600 transition-colors group-hover:bg-emerald-100">
                ◉
              </span>

              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold text-slate-800">
                  User profile
                </strong>

                <small className="mt-1 block text-xs leading-5 text-slate-500">
                  View and Edit your account details
                </small>
              </span>

              <span className="shrink-0 text-lg text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600">
                ↗
              </span>
            </Link>
          </div>
        </article>
      </section>

      {/* Recent orders */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Latest activity
            </span>

            <h2 className="mt-2 text-lg font-bold text-slate-900">
              Recent orders
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your latest recorded bills and orders.
            </p>
          </div>

          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {orders.length} orders
          </span>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              ▤
            </span>

            <strong className="mt-4 text-sm font-semibold text-slate-800">
              No orders yet
            </strong>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Orders will appear here once customers start purchasing.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 sm:px-6">
                    Bill number
                  </th>

                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500">
                    Date
                  </th>

                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500">
                    Order status
                  </th>

                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500">
                    Payment status
                  </th>

                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 sm:px-6">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order, index) => (
                  <tr
                    className="transition-colors hover:bg-slate-50/70"
                    key={
                      order?._id ||
                      order?.billNumber ||
                      `order-${index}`
                    }
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <strong className="text-sm font-semibold text-slate-800">
                        {order?.billNumber || "—"}
                      </strong>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                      {formatDate(
                        order?.createdAt || order?.billDate
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">
                        {order?.orderStatus || "placed"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm capitalize text-slate-600">
                        {order?.paymentStatus || "pending"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                      <strong className="text-sm font-semibold text-slate-800">
                        {money(order?.grandTotal)}
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