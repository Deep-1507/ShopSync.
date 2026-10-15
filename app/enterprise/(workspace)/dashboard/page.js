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

 

  useEffect(() => {
    const session = getEnterpriseSession();
    setEnterprise(session.enterprise);

    async function loadDashboard() {
      try {
        const enterpriseId = localStorage.getItem("Enterprise_id")

        const productPromise = enterpriseRequest(`/api/products/allProducts/${enterpriseId}`);

        const orderPromise = enterpriseId
          ? enterpriseRequest(
            `/api/orders/enterprise/${enterpriseId}`
          )
          : Promise.resolve({ data: [] });

        const [productResult, orderResult] = await Promise.all([
          productPromise,
          orderPromise,
        ]);

        setProducts(normalizeList(productResult));
        setOrders(normalizeList(orderResult));
      } catch (err) {
        setError(err.message || "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);


const [todayDate, setTodayDate] = useState(null);

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
    return <div className="page-loading">Loading your dashboard...</div>;
  }

  return (
    <div className="page-stack">
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">YOUR BUSINESS AT A GLANCE</span>
          <h1>Good to see you, {enterprise?.name || "there"}.</h1>
          <p>
            Here&apos;s what&apos;s happening with{" "}
            {enterprise?.enterpriseName || "your business"}.
          </p>
        </div>

        <Link
          className="primary-button heading-action"
          href="/enterprise/products"
        >
          <span>＋</span> Add product
        </Link>
      </section>

      {error && <div className="notice-error">{error}</div>}

      <section className="business-strip">
        <div className="business-strip-icon">S</div>
        <div className="business-strip-copy">
          <span>ACTIVE WORKSPACE</span>
          <strong>
            {enterprise?.enterpriseName || "Your business"}
          </strong>
        </div>
        <span className="business-category">
          {enterprise?.category || "Enterprise"}
        </span>
        <div className="business-strip-location">
          <span>⌖</span>
          {enterprise?.location || "Location not set"}
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon stat-blue">▦</span>
            <span className="stat-period">ALL TIME</span>
          </div>
          <span className="stat-label">Registered products</span>
          <strong className="stat-value">
            {stats.products.toLocaleString("en-IN")}
          </strong>
          <span className="stat-foot">Products in your catalogue</span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon stat-purple">▤</span>
            <span className="stat-period">ALL TIME</span>
          </div>
          <span className="stat-label">Total orders / bills</span>
          <strong className="stat-value">
            {stats.orders.toLocaleString("en-IN")}
          </strong>
          <span className="stat-foot">Orders recorded by ShopSync</span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon stat-orange">◷</span>
            <span className="stat-period">TODAY</span>
          </div>
          <span className="stat-label">Orders today</span>
          <strong className="stat-value">
            {stats.today.toLocaleString("en-IN")}
          </strong>
          <span className="stat-foot">Based on order creation date</span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-icon stat-green">₹</span>
            <span className="stat-period">ALL TIME</span>
          </div>
          <span className="stat-label">Order value</span>
          <strong className="stat-value stat-money">
            {money(stats.revenue)}
          </strong>
          <span className="stat-foot">Excludes cancelled orders</span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">ORDER ACTIVITY</span>
              <h2>Orders over the last 30 days</h2>
              <p>Order counts grouped into five-day periods.</p>
            </div>
            <span className="chart-legend">
              <span /> Orders
            </span>
          </div>

          <div className="bar-chart">
            {chart.map((item) => (
              <div className="bar-column" key={item.label}>
                <span className="bar-value">{item.count}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${Math.max(
                        item.count > 0 ? 8 : 0,
                        (item.count / maxCount) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="bar-label">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="chart-axis-note">Day of month · five-day groups</div>
        </article>

        <article className="panel quick-actions-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">SHORTCUTS</span>
              <h2>Quick actions</h2>
              <p>Get straight to the work that matters.</p>
            </div>
          </div>

          <Link className="quick-action" href="/enterprise/products">
            <span className="quick-action-icon stat-blue">＋</span>
            <span>
              <strong>Add a new product</strong>
              <small>Expand your product catalogue</small>
            </span>
            <span className="quick-arrow">↗</span>
          </Link>

          <Link className="quick-action" href="/enterprise/products">
            <span className="quick-action-icon stat-purple">▤</span>
            <span>
              <strong>Manage inventory</strong>
              <small>Review prices and stock levels</small>
            </span>
            <span className="quick-arrow">↗</span>
          </Link>

          <Link className="quick-action" href="/enterprise/profile">
            <span className="quick-action-icon stat-green">◉</span>
            <span>
              <strong>Business profile</strong>
              <small>Review your business details</small>
            </span>
            <span className="quick-arrow">↗</span>
          </Link>
        </article>
      </section>

      <section className="panel recent-orders-panel">
        <div className="panel-heading recent-heading">
          <div>
            <span className="panel-eyebrow">LATEST ACTIVITY</span>
            <h2>Recent orders</h2>
            <p>Your latest recorded bills and orders.</p>
          </div>
          <span className="count-pill">{orders.length} orders</span>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">▤</span>
            <strong>No orders yet</strong>
            <p>Orders will appear here once customers start purchasing.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill number</th>
                  <th>Date</th>
                  <th>Order status</th>
                  <th>Payment status</th>
                  <th className="align-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...orders]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt || b.billDate) -
                      new Date(a.createdAt || a.billDate)
                  )
                  .slice(0, 5)
                  .map((order) => (
                    <tr key={order._id}>
                      <td>
                        <strong>{order.billNumber || "—"}</strong>
                      </td>
                      <td>
                        {order.createdAt || order.billDate
                          ? new Date(
                            order.createdAt || order.billDate
                          ).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        <span className="status-pill">
                          {order.orderStatus || "placed"}
                        </span>
                      </td>
                      <td>{order.paymentStatus || "pending"}</td>
                      <td className="align-right">
                        <strong>{money(order.grandTotal)}</strong>
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
