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

export default function UserDashboard() {
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


const generateUserReport = () => {
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("Please allow pop-ups to generate your report.");
    return;
  }

  const escapeHtml = (value) =>
    String(value ?? "—").replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[char];
    });

  // Calculate report metrics
  const cancelledOrders = orders.filter(
    (order) =>
      String(order?.orderStatus ?? "").toLowerCase() === "cancelled"
  );

  const completedValue = orders
    .filter(
      (order) =>
        String(order?.orderStatus ?? "").toLowerCase() !== "cancelled"
    )
    .reduce(
      (total, order) => total + (Number(order?.grandTotal) || 0),
      0
    );

  // Summarize order and payment statuses
  const orderStatusSummary = {};
  const paymentStatusSummary = {};

  orders.forEach((order) => {
    const orderStatus = String(order?.orderStatus || "placed").toLowerCase();
    const paymentStatus = String(
      order?.paymentStatus || "pending"
    ).toLowerCase();

    orderStatusSummary[orderStatus] =
      (orderStatusSummary[orderStatus] || 0) + 1;

    paymentStatusSummary[paymentStatus] =
      (paymentStatusSummary[paymentStatus] || 0) + 1;
  });

  // Generate summary table rows
  const summaryRows = (summary) =>
    Object.entries(summary)
      .map(
        ([status, count]) => `
          <tr>
            <td>${escapeHtml(status)}</td>
            <td>${count}</td>
          </tr>
        `
      )
      .join("");

  // Generate order history rows
  const orderRows = [...orders]
    .sort(
      (a, b) =>
        new Date(b?.createdAt || b?.billDate || 0).getTime() -
        new Date(a?.createdAt || a?.billDate || 0).getTime()
    )
    .map(
      (order) => `
        <tr>
          <td>${escapeHtml(order?.billNumber)}</td>
          <td>${escapeHtml(
            formatDate(order?.createdAt || order?.billDate)
          )}</td>
          <td>${escapeHtml(order?.orderStatus || "placed")}</td>
          <td>${escapeHtml(order?.paymentStatus || "pending")}</td>
          <td class="amount">${escapeHtml(money(order?.grandTotal))}</td>
        </tr>
      `
    )
    .join("");

  // Generate order activity table rows
  const activityRows = chart
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.label)}</td>
          <td>${item.count}</td>
        </tr>
      `
    )
    .join("");

  // Prepare chart data
  const statusChartData = Object.entries(orderStatusSummary);
  const paymentChartData = Object.entries(paymentStatusSummary);

  // Generate horizontal bar charts
  const makeBarChart = (items, barColor) => {
    if (!items.length) {
      return `<p class="muted">No data available for this chart.</p>`;
    }

    const maxValue = Math.max(...items.map(([, count]) => count), 1);

    return `
      <div class="chart">
        ${items
          .map(
            ([label, count]) => `
              <div class="chart-row">
                <span class="chart-label">${escapeHtml(label)}</span>

                <div class="chart-track">
                  <div
                    class="chart-bar"
                    style="width:${(count / maxValue) * 100}%;background:${barColor}"
                  ></div>
                </div>

                <strong class="chart-value">${count}</strong>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  };

  // Prepare the six-period activity graph
  const activityMax = Math.max(
    ...chart.map((item) => item.count),
    1
  );

  const activityChart = chart
    .map(
      (item) => `
        <div class="activity-column">
          <strong>${item.count}</strong>

          <div class="activity-track">
            <div
              class="activity-bar"
              style="height:${
                item.count > 0
                  ? Math.max(3, (item.count / activityMax) * 100)
                  : 0
              }%"
            ></div>
          </div>

          <span>${escapeHtml(item.label)}</span>
        </div>
      `
    )
    .join("");

  const generatedAt = new Date().toLocaleString("en-IN");

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>ShopSync User Report</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 32px;
            color: #0f172a;
            background: #f8fafc;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
          }

          .report {
            max-width: 1000px;
            margin: 0 auto;
            padding: 32px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding-bottom: 22px;
            border-bottom: 2px solid #2563eb;
          }

          .brand {
            color: #2563eb;
            font-size: 27px;
            font-weight: 800;
          }

          h1 {
            margin: 8px 0;
            font-size: 24px;
          }

          h2 {
            margin: 28px 0 12px;
            font-size: 17px;
            break-after: avoid;
          }

          .muted {
            color: #64748b;
            line-height: 1.7;
          }

          .cards {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 22px;
          }

          .card {
            min-width: 0;
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
          }

          .card span {
            display: block;
            margin-bottom: 10px;
            color: #64748b;
          }

          .card strong {
            font-size: 21px;
            overflow-wrap: anywhere;
          }

          /* Horizontal bar charts */
          .chart {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 18px;
          }

          .chart-row {
            display: grid;
            grid-template-columns: 110px minmax(0, 1fr) 32px;
            align-items: center;
            gap: 12px;
          }

          .chart-label {
            overflow-wrap: anywhere;
            color: #475569;
            text-transform: capitalize;
          }

          .chart-track {
            height: 18px;
            overflow: hidden;
            background: #eff6ff;
            border-radius: 5px;
          }

          .chart-bar {
            height: 100%;
            border-radius: 5px;
          }

          .chart-value {
            text-align: right;
            color: #334155;
          }

          /* Order activity column chart */
          .activity-chart {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            align-items: end;
            gap: 14px;
            height: 230px;
            margin-top: 20px;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
          }

          .activity-column {
            display: flex;
            height: 100%;
            min-width: 0;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            color: #475569;
            font-size: 11px;
          }

          .activity-track {
            display: flex;
            width: 100%;
            height: 150px;
            align-items: flex-end;
            overflow: hidden;
            border-radius: 5px 5px 0 0;
            background: #eff6ff;
          }

          .activity-bar {
            width: 100%;
            min-height: 0;
            border-radius: 5px 5px 0 0;
            background: #2563eb;
          }

          .activity-column span {
            max-width: 100%;
            overflow-wrap: anywhere;
            text-align: center;
            font-size: 10px;
          }

          /* Tables */
          .table-wrap {
            width: 100%;
            overflow-x: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }

          th,
          td {
            padding: 11px 9px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
            overflow-wrap: anywhere;
          }

          th {
            background: #eff6ff;
            color: #1e40af;
          }

          .amount {
            text-align: right;
            white-space: nowrap;
          }

          .actions {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
          }

          button {
            padding: 11px 18px;
            color: white;
            background: #2563eb;
            border: 0;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
          }

          @media (max-width: 600px) {
            body {
              padding: 10px;
            }

            .report {
              padding: 16px;
            }

            .cards {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .header {
              flex-direction: column;
            }

            .activity-chart {
              gap: 6px;
            }

            .chart-row {
              grid-template-columns: 80px minmax(0, 1fr) 24px;
              gap: 7px;
            }

            table {
              min-width: 600px;
            }
          }

          @media print {
            @page {
              size: A4;
              margin: 14mm;
            }

            body {
              padding: 0;
              background: white;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .report {
              max-width: none;
              padding: 0;
              border: 0;
              border-radius: 0;
            }

            .actions {
              display: none;
            }

            .chart,
            .activity-chart,
            .cards {
              break-inside: avoid;
            }

            tr {
              break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <main class="report">
          <div class="actions">
            <button onclick="window.print()">
              Print / Save as PDF
            </button>
          </div>

          <header class="header">
            <div>
              <div class="brand">ShopSync</div>
              <h1>User Activity Report</h1>

              <div class="muted">
                Account: ${escapeHtml(user?.name || "User")}<br />
                Location: ${escapeHtml(formatLocation(user?.location))}<br />
                Generated: ${escapeHtml(generatedAt)}
              </div>
            </div>

            <div class="muted">
              Report type: Account and order activity<br />
              Currency: Indian Rupee (INR)
            </div>
          </header>

          <!-- Summary cards -->
          <section class="cards">
            <div class="card">
              <span>Total orders / bills</span>
              <strong>${stats.orders.toLocaleString("en-IN")}</strong>
            </div>

            <div class="card">
              <span>Orders today</span>
              <strong>${stats.today.toLocaleString("en-IN")}</strong>
            </div>

            <div class="card">
              <span>Order value excluding cancellations</span>
              <strong>${escapeHtml(money(completedValue))}</strong>
            </div>

            <div class="card">
              <span>Cancelled orders</span>
              <strong>${cancelledOrders.length.toLocaleString("en-IN")}</strong>
            </div>

            <div class="card">
              <span>Other orders</span>
              <strong>${(
                orders.length - cancelledOrders.length
              ).toLocaleString("en-IN")}</strong>
            </div>

            <div class="card">
              <span>Activity periods</span>
              <strong>${chart.length}</strong>
            </div>
          </section>

          <!-- Graph 1: Order activity -->
          <h2>Order activity graph — last 30 days</h2>

          <div class="activity-chart">
            ${activityChart}
          </div>

          <p class="muted">
            Each bar represents the number of orders recorded in a five-day
            period. The graph uses the activity data calculated by your dashboard.
          </p>

          <!-- Graph 2: Order status -->
          <h2>Order status distribution</h2>

          ${makeBarChart(statusChartData, "#2563eb")}

          <!-- Graph 3: Payment status -->
          <h2>Payment status distribution</h2>

          ${makeBarChart(paymentChartData, "#059669")}

          <!-- Activity data table -->
          <h2>Order activity details</h2>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Five-day period</th>
                  <th>Number of orders</th>
                </tr>
              </thead>

              <tbody>
                ${
                  activityRows ||
                  "<tr><td colspan='2'>No activity data available.</td></tr>"
                }
              </tbody>
            </table>
          </div>

          <!-- Order status summary -->
          <h2>Order status summary</h2>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order status</th>
                  <th>Count</th>
                </tr>
              </thead>

              <tbody>
                ${
                  summaryRows(orderStatusSummary) ||
                  "<tr><td colspan='2'>No orders found.</td></tr>"
                }
              </tbody>
            </table>
          </div>

          <!-- Payment status summary -->
          <h2>Payment status summary</h2>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Payment status</th>
                  <th>Count</th>
                </tr>
              </thead>

              <tbody>
                ${
                  summaryRows(paymentStatusSummary) ||
                  "<tr><td colspan='2'>No orders found.</td></tr>"
                }
              </tbody>
            </table>
          </div>

          <!-- Order history -->
          <h2>Order history</h2>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bill number</th>
                  <th>Date</th>
                  <th>Order status</th>
                  <th>Payment status</th>
                  <th class="amount">Amount</th>
                </tr>
              </thead>

              <tbody>
                ${
                  orderRows ||
                  "<tr><td colspan='5'>No orders found.</td></tr>"
                }
              </tbody>
            </table>
          </div>

          <p class="muted" style="margin-top:24px">
            This report is based on the order data currently loaded in your
            ShopSync dashboard. Order value excludes cancelled orders and is
            not necessarily the same as settled payments.
          </p>
        </main>
      </body>
    </html>
  `;

  reportWindow.document.open();
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
};



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

      {/* Dashboard heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
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

        <button
          type="button"
          onClick={generateUserReport}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:self-center"
        >
          <span aria-hidden="true">▤</span>
          Generate Report
        </button>
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
                      height: `${item.count > 0
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