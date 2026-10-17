"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { enterpriseRequest, getEnterpriseSession } from "../../../../../lib/enterpriseClient";

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

const PAGE_SIZE = 10;

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateText = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    : "—";

const dateInputText = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(
      2,
      "0"
    )}`;
};

function normaliseOrders(result) {
  const candidates = [
    result?.orders,
    result?.data?.orders,
    result?.data,
    result?.orders?.data,
    result?.data?.data?.orders,
  ];

  return candidates.find(Array.isArray) || [];
}

function normalisePagination(result, requestedPage) {
  const data =
    result?.pagination ||
    result?.data?.pagination ||
    result?.data?.data?.pagination ||
    {};

  const total = Number(data.total) || 0;
  const limit = Number(data.limit) || PAGE_SIZE;
  const totalPages =
    Number(data.totalPages) ||
    Math.max(1, Math.ceil(total / limit));

  const page = Math.min(
    Math.max(1, Number(data.page) || requestedPage),
    totalPages
  );

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage:
      typeof data.hasNextPage === "boolean"
        ? data.hasNextPage
        : page < totalPages,
    hasPreviousPage:
      typeof data.hasPreviousPage === "boolean"
        ? data.hasPreviousPage
        : page > 1,
  };
}

export default function ManageOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const [orderToReview, setOrderToReview] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(false);

  const [orderToVerify, setOrderToVerify] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Fetch the requested page from the backend.
  const loadOrders = useCallback(async (requestedPage = 1) => {
    setLoading(true);
    setError("");

    try {
      const enterpriseId = localStorage.getItem("Enterprise_id");

      if (!enterpriseId) {
        throw new Error(
          "Enterprise ID not found. Please sign in again."
        );
      }

      const token = localStorage.getItem(
        "shopsync_enterprise_token"
      );

      if (!token) {
        throw new Error(
          "Authentication token not found. Please sign in again."
        );
      }

      const result = await enterpriseRequest(
        `/api/orders/enterprise/${enterpriseId}?page=${requestedPage}&limit=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const fetchedOrders = normaliseOrders(result);
      const fetchedPagination = normalisePagination(
        result,
        requestedPage
      );

      setOrders(fetchedOrders);
      setPagination(fetchedPagination);

      // Keep the UI in sync with the page returned by the API.
      setCurrentPage(fetchedPagination.page);
    } catch (err) {
      setError(err?.message || "Unable to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the initial page.
  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  // Reset to the first page when filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, dateFrom, dateTo]);

  // Fetch a page whenever the current page changes.
  useEffect(() => {
    loadOrders(currentPage);
  }, [currentPage, loadOrders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const date = dateInputText(
        order.billDate || order.createdAt
      );

      const matchesSearch =
        !q ||
        [
          order.billNumber,
          order.customerId?.name,
          order.customerId?.email,
          order.customerId,
          order.orderType,
          order.paymentStatus,
          order.orderStatus,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        );

      const matchesStatus =
        status === "all" ||
        String(order.orderStatus || "").toLowerCase() ===
        status ||
        String(order.paymentStatus || "").toLowerCase() ===
        status;

      const matchesFrom =
        !dateFrom || (date && date >= dateFrom);

      const matchesTo =
        !dateTo || (date && date <= dateTo);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [orders, search, status, dateFrom, dateTo]);

  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + (Number(order.grandTotal) || 0),
    0
  );

  const paidAmount = filteredOrders.reduce(
    (sum, order) => sum + (Number(order.amountPaid) || 0),
    0
  );

  function printOrder(order) {
    setSelectedOrder(order);

    window.setTimeout(() => {
      window.print();
    }, 100);
  }

  function printAll() {
    window.print();
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  }

  function statusClass(value) {
    const v = String(value || "pending").toLowerCase();

    const base =
      "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize";

    if (
      ["paid", "successful", "completed", "confirmed"].includes(v)
    ) {
      return `${base} bg-emerald-50 text-emerald-800`;
    }

    if (["failed", "cancelled", "refunded"].includes(v)) {
      return `${base} bg-red-50 text-red-700`;
    }

    if (["partially_paid", "processing"].includes(v)) {
      return `${base} bg-amber-50 text-amber-800`;
    }

    return `${base} bg-slate-100 text-slate-700`;
  }

  function renderBill(order) {
    return (
      <div
        key={order._id || order.billNumber}
        className="mx-auto my-0 hidden max-w-[800px] bg-white p-8 text-black print:my-0 print:block print:max-w-none print:p-0"
      >
        <div className="flex items-start justify-between gap-5 border-b-2 border-black pb-5 [&_h1]:my-2 [&_h1]:text-3xl [&_h1]:font-bold [&_p]:text-xs">
          <div>
            <span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-700">
              SHOPSYNC · TAX INVOICE
            </span>

            <h1>Invoice</h1>

            <p>
              Bill number:{" "}
              <strong>{order.billNumber || "—"}</strong>
            </p>
          </div>

          <div className="grid gap-1 text-right text-xs [&>span]:mt-2 [&>span]:text-gray-500 [&>strong]:font-semibold">
            <span>Bill date</span>
            <strong>
              {dateText(order.billDate || order.createdAt)}
            </strong>

            <span>Order status</span>
            <strong>{order.orderStatus || "placed"}</strong>
          </div>
        </div>

        <div className="my-5 grid grid-cols-2 gap-6 border-b border-gray-300 pb-5 text-xs [&_span]:mb-1 [&_span]:block [&_span]:text-gray-500 [&_strong]:block [&_p]:mt-1 [&_p]:text-gray-600">
          <div>
            <span>Bill to / Customer ID</span>

            <strong>
              {order.customerId?.name ||
                order.customerName ||
                String(order.customerId || "—")}
            </strong>

            <p>
              {order.billingAddress ||
                order.customerId?.email ||
                ""}
            </p>
          </div>

          <div>
            <span>Order type</span>
            <strong>{order.orderType || "—"}</strong>

            <span>Payment status</span>
            <strong>{order.paymentStatus || "pending"}</strong>
          </div>
        </div>

        <table className="w-full border-collapse text-xs [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-gray-300 [&_td]:p-2">
          <thead>
            <tr>
              <th>#</th>
              <th>Product ID / Name</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Discount</th>
              <th>Tax</th>
              <th className="text-right">Line total</th>
            </tr>
          </thead>

          <tbody>
            {(order.products || []).map((item, index) => (
              <tr
                key={
                  item._id ||
                  item.productId?._id ||
                  `${item.productId}-${index}`
                }
              >
                <td>{index + 1}</td>

                <td>
                  {item.productId?.name ||
                    item.name ||
                    String(item.productId || "Product")}
                </td>

                <td>{item.quantity}</td>
                <td>{money(item.unitPrice)}</td>
                <td>{money(item.discount)}</td>
                <td>{Number(item.taxRate) || 0}%</td>

                <td className="text-right">
                  {money(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-5 w-full max-w-[320px] text-xs [&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:border-b [&>div]:border-gray-200 [&>div]:py-2">
          <div>
            <span>Subtotal</span>
            <strong>{money(order.subtotal)}</strong>
          </div>

          <div>
            <span>Discount</span>
            <strong>{money(order.totalDiscount)}</strong>
          </div>

          <div>
            <span>Tax</span>
            <strong>{money(order.totalTax)}</strong>
          </div>

          <div>
            <span>Shipping</span>
            <strong>{money(order.shippingCharges)}</strong>
          </div>

          <div className="border-t-2 border-black font-bold [&>strong]:text-base">
            <span>Grand total</span>
            <strong>{money(order.grandTotal)}</strong>
          </div>

          <div>
            <span>Amount paid</span>
            <strong>{money(order.amountPaid)}</strong>
          </div>

          <div>
            <span>Balance due</span>
            <strong>{money(order.balanceDue)}</strong>
          </div>
        </div>

        {order.notes && (
          <p className="mt-5 border-t border-gray-300 pt-3 text-xs">
            <strong>Notes:</strong> {order.notes}
          </p>
        )}

        <div className="mt-8 border-t border-gray-300 pt-3 text-center text-xs text-gray-500">
          Thank you for your business.
        </div>
      </div>
    );
  }

  const updateOrderStatus = async (order, nextStatus) => {
    const action = nextStatus === "confirmed" ? "accept" : "cancel";

    if (!window.confirm(`Are you sure you want to ${action} this order?`)) {
      return;
    }

    try {
      setUpdatingOrder(true);

      const session = getEnterpriseSession();
      const token = session?.token;

      if (!token) {
        alert("Your session has expired. Please log in again.");
        return;
      }

      const response = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderStatus: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update order status");
      }

      // Update the order in the currently displayed list.
      // Replace setOrders with your existing orders state setter if named differently.
      setOrders((previousOrders) =>
        previousOrders.map((item) =>
          item._id === order._id
            ? { ...item, ...result.order, orderStatus: nextStatus }
            : item
        )
      );

      setOrderToReview(null);
      alert(`Order ${nextStatus === "confirmed" ? "accepted" : "cancelled"} successfully.`);
    } catch (error) {
      console.error("Order status update failed:", error);
      alert(error.message || "Something went wrong.");
    } finally {
      setUpdatingOrder(false);
    }
  };

  const verifyOrderOtp = async (event) => {
    event.preventDefault();

    if (!orderToVerify?._id) {
      setOtpError("Order ID is missing.");
      return;
    }

    if (!/^\d{4}$/.test(otpValue)) {
      setOtpError("Please enter a valid 4-digit OTP.");
      return;
    }

    try {
      setUpdatingOrder(true);
      setOtpError("");

      const session = getEnterpriseSession();
      const token = session?.token;

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch("/api/orders/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: orderToVerify._id,
          otp: otpValue,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "OTP verification failed.");
      }

      // Update the order in the current table without a page reload.
      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order._id === orderToVerify._id
            ? {
              ...order,
              ...(result.order || {}),
              orderStatus: "completed",
              paymentStatus: "paid",
            }
            : order
        )
      );

      setOrderToVerify((previousOrder) => ({
        ...previousOrder,
        ...(result.order || {}),
        orderStatus: "completed",
        paymentStatus: "paid",
      }));

      setOtpVerified(true);
    } catch (error) {
      setOtpError(error.message || "Something went wrong. Please try again.");
    } finally {
      setUpdatingOrder(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Page heading and actions */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            ORDER MANAGEMENT
          </span>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Orders &amp; Bills
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review enterprise orders, inspect invoices, and
            print individual or filtered bills.
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-3 sm:ml-auto sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={() => loadOrders(currentPage)}
            disabled={loading}
            className="rounded-lg border border-[#dfe8e2] bg-white px-2 py-1 text-xs font-bold text-[#44564a] transition-colors hover:bg-[#f5f9f6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            onClick={printAll}
            disabled={!filteredOrders.length}
            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-extrabold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ▤ Print filtered bills
          </button>
        </div>


      </section>



      {/* Error message */}
      {error && (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 [&>span]:font-black [&>p]:flex-1"
          role="alert"
        >
          <span>!</span>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 [&>div]:rounded-xl [&>div]:border [&>div]:border-[#e5ece7] [&>div]:bg-white [&>div]:p-4 [&>div]:shadow-sm [&_span]:block [&_span]:text-xs [&_span]:text-[#78857c] [&_strong]:mt-2 [&_strong]:block [&_strong]:text-2xl [&_strong]:font-extrabold [&_small]:mt-1 [&_small]:block [&_small]:text-[11px] [&_small]:text-[#8a968e]">
        <div>
          <span>Orders found</span>
          <strong>{filteredOrders.length}</strong>
          <small>Matching orders on this page</small>
        </div>

        <div>
          <span>Order value</span>
          <strong>{money(totalRevenue)}</strong>
          <small>Grand total of matching orders on this page</small>
        </div>

        <div>
          <span>Payments received</span>
          <strong>{money(paidAmount)}</strong>
          <small>Amount paid on matching orders on this page</small>
        </div>
      </section>

      {/* Order register */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e5ece7] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_p]:text-xs [&_p]:text-[#738078]">
          <div>
            <span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-600">
              ORDER REGISTER
            </span>

            <h2>All enterprise orders</h2>

            <p>
              Use the date range to narrow down bills before
              printing.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
            {pagination.total} total bills
          </span>
        </div>

        {/* Search and filters */}
        <div className="grid grid-cols-1 gap-3 border-y border-[#edf1ee] bg-[#fbfdfb] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1.5fr)_repeat(3,minmax(120px,1fr))_auto] [&>label]:flex [&>label]:min-w-0 [&>label]:flex-col [&>label]:gap-1.5 [&>label]:text-[10px] [&>label]:font-bold [&>label]:text-[#78857c] [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-[#dfe8e2] [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-xs [&_select]:rounded-lg [&_select]:border [&_select]:border-[#dfe8e2] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-xs">
          <label className="flex min-w-0 flex-row items-center gap-3 rounded-lg border border-[#dfe8e2] bg-white px-3 py-2.5 text-[#8a968e] focus-within:border-[#b8cbbd] focus-within:ring-2 focus-within:ring-[#edf4ef]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill, customer or status..."
              className="w-full min-w-0 border-0 bg-transparent p-0 text-xs leading-5 text-[#44564a] outline-none ring-0 placeholder:text-[#a0aaa3] focus:border-0 focus:outline-none focus:ring-0"
            />
          </label>

          <label>
            <span>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label>
            <span>To</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="placed">Placed</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially paid</option>
              <option value="pending">Pending payment</option>
              <option value="failed">Failed payment</option>
            </select>
          </label>

          <button
            type="button"
            onClick={clearFilters}
            className="self-end rounded-lg border border-[#dfe8e2] bg-white px-3 py-2.5 text-xs font-bold text-[#44564a] hover:bg-[#f5f9f6]"
          >
            Clear
          </button>
        </div>

        {/* Orders table */}
        {loading ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center [&>strong]:text-sm [&>p]:mt-2 [&>p]:text-xs [&>p]:text-[#8a968e]">
            <span className="mb-4 h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-100 border-t-emerald-700" />
            <strong>Loading orders</strong>
            <p>Fetching your enterprise bills.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center [&>strong]:text-sm [&>p]:mt-2 [&>p]:text-xs [&>p]:text-[#8a968e]">
            <span>▤</span>
            <strong>No orders found</strong>
            <p>
              Try changing the filters or create a new bill from
              the billing counter.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-xs [&_th]:border-b [&_th]:border-[#e8eee9] [&_th]:bg-[#f8faf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-extrabold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[#78857c] [&_td]:border-b [&_td]:border-[#edf1ee] [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td>strong]:block [&_td>small]:mt-1 [&_td>small]:block [&_td>small]:text-[10px] [&_td>small]:text-[#829087] [&_tbody_tr:hover]:bg-[#fbfdfb]">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Bill / Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Grand total</th>
                  <th>Payment</th>
                  <th>Order status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id || order.billNumber}>
                    {/* Action column */}
                    {/* Action column */}
                    <td>
                      {String(order.orderStatus || "placed").toLowerCase() ===
                        "placed" ? (
                        <button
                          type="button"
                          onClick={() => setOrderToReview(order)}
                          className="min-w-[180px] rounded-lg border border-amber-300 bg-amber-100 px-3 py-2.5 text-left text-xs font-extrabold text-amber-900 transition hover:bg-amber-200"
                        >
                          <span className="block">Order placed</span>
                          <span className="mt-1 block text-[10px] font-semibold">
                            Click to view and confirm →
                          </span>
                        </button>
                      ) : String(order.orderStatus || "").toLowerCase() ===
                        "confirmed" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderToVerify(order);
                            setOtpValue("");
                            setOtpError("");
                            setOtpVerified(false);
                          }}
                          className="min-w-[150px] rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs font-extrabold text-blue-800 transition hover:bg-blue-100"
                        >
                          <span className="block">Verify Order</span>
                          <span className="mt-1 block text-[10px] font-semibold">
                            Verify by OTP →
                          </span>
                        </button>
                      ) : String(order.orderStatus || "").toLowerCase() ===
                        "completed" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                          <span>✓</span> Verified & Completed
                        </span>
                      ) : (
                        <span className="text-xs text-[#829087]">—</span>
                      )}
                    </td>

                    {/* Bill / Date */}
                    <td>
                      <strong className="font-extrabold text-[#26372c]">
                        {order.billNumber || "—"}
                      </strong>

                      <small>
                        {dateText(order.billDate || order.createdAt)}
                      </small>
                    </td>

                    {/* Customer */}
                    <td>
                      <strong>
                        {order.customerId?.name ||
                          order.customerName ||
                          "Customer"}
                      </strong>

                      <small>
                        {order.customerId?.email ||
                          (typeof order.customerId === "string"
                            ? order.customerId
                            : "—")}
                      </small>
                    </td>

                    {/* Items */}
                    <td>
                      <strong>
                        {(order.products || []).reduce(
                          (sum, item) => sum + (Number(item.quantity) || 0),
                          0
                        )}{" "}
                        items
                      </strong>

                      <small>
                        {(order.products || []).length} product types
                      </small>
                    </td>

                    {/* Grand total */}
                    <td>
                      <strong className="font-extrabold text-emerald-700">
                        {money(order.grandTotal)}
                      </strong>

                      <small>
                        Paid {money(order.amountPaid)}
                      </small>
                    </td>

                    {/* Payment status */}
                    <td>
                      <span className={statusClass(order.paymentStatus)}>
                        {String(order.paymentStatus || "pending").replaceAll("_", " ")}
                      </span>
                    </td>

                    {/* Order status */}
                    <td>
                      <span className={statusClass(order.orderStatus)}>
                        {String(order.orderStatus || "placed").replaceAll("_", " ")}
                      </span>
                    </td>

                    {/* Existing actions */}
                    <td>
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap [&>button]:rounded-md [&>button]:border [&>button]:border-[#dfe8e2] [&>button]:bg-white [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-[10px] [&>button]:font-bold [&>button]:text-[#44564a] [&>button:hover]:bg-[#f5f9f6]">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View details
                        </button>

                        <button
                          type="button"
                          className="text-emerald-700"
                          onClick={() => printOrder(order)}
                          title={`Print ${order.billNumber || "bill"}`}
                          aria-label={`Print ${order.billNumber || "bill"}`}
                        >
                          ⎙
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex flex-col gap-4 border-t border-[#edf1ee] bg-[#fbfdfb] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[#829087]">
            <p>
              Showing{" "}
              {pagination.total === 0
                ? 0
                : (pagination.page - 1) * pagination.limit + 1}{" "}
              to{" "}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )}{" "}
              of {pagination.total} orders
            </p>

            <p className="mt-1">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={
                !pagination.hasPreviousPage || loading
              }
              className="rounded-lg border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-bold text-[#44564a] transition-colors hover:bg-[#f5f9f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              First
            </button>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) =>
                  Math.max(1, page - 1)
                )
              }
              disabled={
                !pagination.hasPreviousPage || loading
              }
              className="rounded-lg border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-bold text-[#44564a] transition-colors hover:bg-[#f5f9f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>

            <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(
                    pagination.totalPages,
                    page + 1
                  )
                )
              }
              disabled={!pagination.hasNextPage || loading}
              className="rounded-lg border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-bold text-[#44564a] transition-colors hover:bg-[#f5f9f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>

            <button
              type="button"
              onClick={() =>
                setCurrentPage(pagination.totalPages)
              }
              disabled={!pagination.hasNextPage || loading}
              className="rounded-lg border border-[#dfe8e2] bg-white px-3 py-2 text-xs font-bold text-[#44564a] transition-colors hover:bg-[#f5f9f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Last
            </button>
          </div>

          <p className="text-[10px] text-[#829087]">
            Date filters apply to bill date.
          </p>
        </div>
      </section>

      {/* Order details modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-auto bg-[#10251bd1] p-2 sm:p-5 print:hidden"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <section
            className="relative max-h-[calc(100vh-20px)] w-full max-w-4xl overflow-auto rounded-2xl border border-[#e5ece7] bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-44px)] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-heading"
          >
            <button
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-[#e4ebe6] bg-white text-xl text-[#526158]"
              type="button"
              onClick={() => setSelectedOrder(null)}
              aria-label="Close"
            >
              ×
            </button>

            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center [&_h2]:text-xl [&_h2]:font-extrabold [&_p]:mt-2 [&_p]:text-xs [&_p]:text-[#829087]">
              <div>
                <span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-700">
                  BILL DETAILS
                </span>

                <h2 id="order-detail-heading">
                  {selectedOrder.billNumber || "Order details"}
                </h2>

                <p>
                  Created{" "}
                  {dateText(
                    selectedOrder.billDate ||
                    selectedOrder.createdAt
                  )}
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white hover:bg-emerald-800"
                onClick={() => printOrder(selectedOrder)}
              >
                ⎙ Print bill
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>div]:rounded-lg [&>div]:border [&>div]:border-[#e8eee9] [&>div]:p-3 [&_span]:block [&_span]:text-[10px] [&_span]:text-[#87938a] [&_strong]:mt-1 [&_strong]:block [&_strong]:break-words [&_strong]:text-xs">
              <div>
                <span>Customer ID</span>

                <strong>
                  {selectedOrder.customerId?.name ||
                    selectedOrder.customerName ||
                    (typeof selectedOrder.customerId === "string"
                      ? selectedOrder.customerId
                      : "—")}
                </strong>
              </div>

              <div>
                <span>Order type</span>
                <strong>{selectedOrder.orderType || "—"}</strong>
              </div>

              <div>
                <span>Order status</span>
                <strong>
                  {String(
                    selectedOrder.orderStatus || "placed"
                  ).replaceAll("_", " ")}
                </strong>
              </div>

              <div>
                <span>Payment status</span>
                <strong>
                  {String(
                    selectedOrder.paymentStatus || "pending"
                  ).replaceAll("_", " ")}
                </strong>
              </div>

              <div className="sm:col-span-2">
                <span>Billing address</span>
                <strong>
                  {selectedOrder.billingAddress || "—"}
                </strong>
              </div>
            </div>

            <h3 className="mb-3 text-sm font-extrabold text-[#26372c]">
              Items on this bill
            </h3>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[650px] border-collapse text-xs [&_th]:bg-[#f8faf8] [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:text-[10px] [&_th]:text-[#78857c] [&_td]:border-b [&_td]:border-[#edf1ee] [&_td]:px-3 [&_td]:py-3 [&_td>strong]:block [&_td>small]:mt-1 [&_td>small]:block [&_td>small]:text-[10px] [&_td>small]:text-[#829087]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Discount</th>
                    <th>Tax</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {(selectedOrder.products || []).map(
                    (item, index) => (
                      <tr
                        key={
                          item._id ||
                          item.productId?._id ||
                          `${item.productId}-${index}`
                        }
                      >
                        <td>
                          <strong>
                            {item.productId?.name ||
                              item.name ||
                              String(item.productId || "Product")}
                          </strong>

                          <small>
                            {item.productId?.sku ||
                              item.sku ||
                              ""}
                          </small>
                        </td>

                        <td>{item.quantity}</td>
                        <td>{money(item.unitPrice)}</td>
                        <td>{money(item.discount)}</td>
                        <td>{Number(item.taxRate) || 0}%</td>

                        <td>
                          <strong>
                            {money(item.lineTotal)}
                          </strong>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="min-w-0 [&>h3]:mb-3 [&>h3]:text-sm [&>h3]:font-extrabold [&>p]:text-xs [&>p]:text-[#829087]">
                <h3>Payments</h3>

                {(selectedOrder.payments || []).length ? (
                  selectedOrder.payments.map(
                    (payment, index) => (
                      <div
                        className="flex items-center justify-between gap-3 border-b border-[#edf1ee] py-3 [&_strong]:text-xs [&_small]:mt-1 [&_small]:block [&_small]:text-[10px] [&_small]:text-[#829087]"
                        key={payment._id || index}
                      >
                        <div>
                          <strong>
                            {String(
                              payment.method || "other"
                            ).replaceAll("_", " ")}
                          </strong>

                          <small>
                            {payment.transactionId ||
                              "No transaction ID"}{" "}
                            · {payment.status || "pending"}
                          </small>
                        </div>

                        <strong>{money(payment.amount)}</strong>
                      </div>
                    )
                  )
                ) : (
                  <p>No payment records attached.</p>
                )}

                {selectedOrder.notes && (
                  <p className="mt-4 rounded-lg bg-[#f5f9f6] p-3 text-xs leading-relaxed text-[#526158]">
                    <strong>Notes:</strong> {selectedOrder.notes}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-[#f8faf8] p-4 [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-3 [&>div]:py-2 [&>div]:text-xs [&>div]:text-[#78857c] [&_strong]:text-xs [&_strong]:text-[#29372e]">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(selectedOrder.subtotal)}</strong>
                </div>

                <div>
                  <span>Discount</span>
                  <strong>
                    {money(selectedOrder.totalDiscount)}
                  </strong>
                </div>

                <div>
                  <span>Tax</span>
                  <strong>{money(selectedOrder.totalTax)}</strong>
                </div>

                <div>
                  <span>Shipping</span>
                  <strong>
                    {money(selectedOrder.shippingCharges)}
                  </strong>
                </div>

                <div className="mt-2 border-t border-dashed border-[#dfe8e2] pt-3 font-extrabold text-[#1e2e23] [&>strong]:text-xl [&>strong]:text-emerald-700">
                  <span>Grand total</span>
                  <strong>
                    {money(selectedOrder.grandTotal)}
                  </strong>
                </div>

                <div>
                  <span>Amount paid</span>
                  <strong>
                    {money(selectedOrder.amountPaid)}
                  </strong>
                </div>

                <div>
                  <span>Balance due</span>
                  <strong>
                    {money(selectedOrder.balanceDue)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                type="button"
                className="rounded-lg border border-[#dfe8e2] bg-white px-4 py-3 text-xs font-bold text-[#44564a] hover:bg-[#f5f9f6]"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white hover:bg-emerald-800"
                onClick={() => printOrder(selectedOrder)}
              >
                ⎙ Print bill
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Printable invoices */}
      <section className="hidden print:block">
        {selectedOrder
          ? renderBill(selectedOrder)
          : filteredOrders.map(renderBill)}
      </section>


      {orderToReview && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center overflow-y-auto bg-[#10251bd1] p-3 sm:p-6 print:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingOrder) {
              setOrderToReview(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-order-heading"
            className="relative my-auto max-h-[calc(100vh-24px)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#e5ece7] bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-48px)] sm:p-7"
          >
            <button
              type="button"
              disabled={updatingOrder}
              onClick={() => setOrderToReview(null)}
              aria-label="Close order review"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg border border-[#e4ebe6] text-xl text-[#526158] hover:bg-[#f5f9f6] disabled:opacity-50"
            >
              ×
            </button>

            <div className="mb-6 pr-10">
              <span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-amber-700">
                ORDER REVIEW REQUIRED
              </span>

              <h2
                id="review-order-heading"
                className="text-xl font-extrabold text-[#26372c]"
              >
                Review {orderToReview.billNumber || "customer order"}
              </h2>

              <p className="mt-2 text-xs text-[#829087]">
                Review the details before accepting or cancelling this order.
              </p>
            </div>

            {/* Customer and order information */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#e8eee9] p-3">
                <span className="block text-[10px] text-[#87938a]">Customer</span>
                <strong className="mt-1 block break-words text-sm text-[#26372c]">
                  {orderToReview.customerId?.name ||
                    orderToReview.customerName ||
                    "Customer"}
                </strong>

                <p className="mt-1 break-all text-[10px] text-[#829087]">
                  Customer ID:{" "}
                  {orderToReview.customerId?._id ||
                    (typeof orderToReview.customerId === "string"
                      ? orderToReview.customerId
                      : "—")}
                </p>

                <p className="mt-1 break-all text-xs text-[#829087]">
                  {orderToReview.customerId?.email ||
                    (typeof orderToReview.customerId === "string"
                      ? orderToReview.customerId
                      : "—")}
                </p>
                <p className="mt-1 break-all text-xs text-[#829087]">
                  {orderToReview.customerId?.phone ||
                    (typeof orderToReview.customerId === "string"
                      ? orderToReview.customerId
                      : "—")}
                </p>
                <div className="mt-2 rounded-xl border border-[#e5ebe7] bg-[#f8faf9] p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#829087]">
                    Delivery/Billing Address
                  </p>

                  <div className="mt-2 flex items-start gap-2">
                    <span className="mt-0.5 text-base">
                      <MapPin
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                    </span>

                    <div className="min-w-0 text-xs leading-6 text-[#35483d]">
                      {orderToReview?.customerId?.location ? (
                        <>
                          <p className="font-semibold">
                            {orderToReview.customerId.location.addressLine}
                          </p>

                          <p>
                            {[
                              orderToReview.customerId.location.landmark,
                              orderToReview.customerId.location.district,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>

                          <p>
                            {[
                              orderToReview.customerId.location.state,
                              orderToReview.customerId.location.pinCode,
                            ]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>

                          <a
                            href={`https://www.google.com/maps?q=${orderToReview.customerId.latitude},${orderToReview.customerId.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800"
                          >
                            View location ↗
                          </a>

                        </>
                      ) : (
                        <p className="text-[#829087]">Address not available</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              <div className="rounded-lg border border-[#e8eee9] p-3">
                <span className="block text-[10px] text-[#87938a]">Order details</span>
                <p className="mt-1 text-xs text-[#526158]">
                  <strong>Bill ID:</strong> {orderToReview._id || "—"}
                </p>
                <p className="mt-1 text-xs text-[#526158]">
                  <strong>Bill No.:</strong> {orderToReview.billNumber || "—"}
                </p>
                <p className="mt-2 text-xs text-[#526158]">
                  <strong>Date:</strong>{" "}
                  {dateText(orderToReview.billDate || orderToReview.createdAt)}
                </p>
                <p className="mt-2 text-xs text-[#526158]">
                  <strong>Type:</strong> {orderToReview.orderType || "—"}
                </p>
                <p className="mt-2 text-xs text-[#526158]">
                  <strong>Status:</strong>{" "}
                  {String(orderToReview.orderStatus || "").replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-xs text-[#526158]">
                  <strong>Payment Status:</strong>{" "}
                  {String(orderToReview.paymentStatus || "").replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-xs text-[#526158]">
                  <strong>Payment Type:</strong>{" "}
                  {String(orderToReview.paymentType || "").replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-xs text-[#526158]">
                  <strong>Note by Customer:</strong>{" "}
                  {String(orderToReview.notes || "No Remarks").replaceAll("_", " ")}
                </p>
              </div>

              {/* <div className="rounded-lg border border-[#e8eee9] p-3 sm:col-span-2">
                <span className="block text-[10px] text-[#87938a]">
                  Billing address
                </span>
                <strong className="mt-1 block break-words text-xs text-[#26372c]">
                  {typeof orderToReview.billingAddress === "string"
                    ? orderToReview.billingAddress
                    : orderToReview.billingAddress
                      ? [
                        orderToReview.customerId.location.addressLine,
                        orderToReview.customerId.location.landmark,
                        orderToReview.customerId.location.district,
                        orderToReview.customerId.location.state,
                        orderToReview.customerId.location.pinCode,
                      ]
                        .filter(Boolean)
                        .join(", ")
                      : "—"}
                </strong>
              </div> */}
            </div>

            {/* Ordered products */}
            <h3 className="mb-3 text-sm font-extrabold text-[#26372c]">
              Items ordered
            </h3>

            <div className="mb-6 w-full overflow-x-auto rounded-lg border border-[#e8eee9]">
              <table className="w-full min-w-[600px] border-collapse text-xs">
                <thead className="bg-[#f8faf8] text-left text-[10px] uppercase text-[#78857c]">
                  <tr>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Item Name</th>
                    <th className="px-3 py-3">Qty</th>
                    <th className="px-3 py-3">Unit price</th>
                    <th className="px-3 py-3">Discount</th>
                    <th className="px-3 py-3">Tax</th>
                    <th className="px-3 py-3">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {(orderToReview.products || []).map((item, index) => (
                    <tr
                      key={
                        item._id ||
                        item.productId?._id ||
                        `${item.productId}-${index}`
                      }
                      className="border-t border-[#edf1ee]"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productId?.photo_url || "/placeholder.png"}
                            alt={item.productId?.name || item.name || "Product"}
                            className="h-12 w-12 rounded-lg border border-[#e5ebe7] object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <strong className="block text-[#26372c]">
                          {item.productId?.name ||
                            item.name ||
                            String(item.productId || "Product")}
                        </strong>
                        <small className="mt-1 block text-[10px] text-[#829087]">
                          {item.productId?.sku || item.sku || ""}
                        </small>
                      </td>
                      <td className="px-3 py-3">{item.quantity}</td>
                      <td className="px-3 py-3">{money(item.unitPrice)}</td>
                      <td className="px-3 py-3">{money(item.discount)}</td>
                      <td className="px-3 py-3">{Number(item.taxRate) || 0}%</td>
                      <td className="px-3 py-3 font-bold">
                        {money(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment records and totals */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-extrabold text-[#26372c]">
                  Payment records
                </h3>

                {(orderToReview.payments || []).length > 0 ? (
                  orderToReview.payments.map((payment, index) => (
                    <div
                      key={payment._id || index}
                      className="flex items-center justify-between gap-3 border-b border-[#edf1ee] py-3"
                    >
                      <div>
                        <strong className="block text-xs">
                          {String(payment.method || "other").replaceAll("_", " ")}
                        </strong>
                        <small className="mt-1 block text-[10px] text-[#829087]">
                          {payment.transactionId || "No transaction ID"} ·{" "}
                          {payment.status || "pending"}
                        </small>
                      </div>
                      <strong className="text-xs">{money(payment.amount)}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#829087]">
                    No payment records attached.
                  </p>
                )}

                {orderToReview.notes && (
                  <p className="mt-4 rounded-lg bg-[#f5f9f6] p-3 text-xs leading-relaxed text-[#526158]">
                    <strong>Notes:</strong> {orderToReview.notes}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-[#f8faf8] p-4 text-xs">
                {[
                  ["Subtotal", orderToReview.subtotal],
                  ["Discount", orderToReview.totalDiscount],
                  ["Tax", orderToReview.totalTax],
                  ["Shipping", orderToReview.shippingCharges],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 py-2 text-[#78857c]"
                  >
                    <span>{label}</span>
                    <strong className="text-[#29372e]">{money(value)}</strong>
                  </div>
                ))}

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-dashed border-[#dfe8e2] pt-3">
                  <span className="font-extrabold">Grand total</span>
                  <strong className="text-xl text-emerald-700">
                    {money(orderToReview.grandTotal)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 py-2 text-[#78857c]">
                  <span>Amount paid</span>
                  <strong className="text-[#29372e]">
                    {money(orderToReview.amountPaid)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 py-2 text-[#78857c]">
                  <span>Balance due</span>
                  <strong className="text-[#29372e]">
                    {money(orderToReview.balanceDue)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Accept / cancel actions */}
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#edf1ee] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={updatingOrder}
                onClick={() => setOrderToReview(null)}
                className="rounded-lg border border-[#dfe8e2] bg-white px-5 py-3 text-xs font-bold text-[#44564a] hover:bg-[#f5f9f6] disabled:opacity-50"
              >
                Close
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={updatingOrder}
                  onClick={() => updateOrderStatus(orderToReview, "cancelled")}
                  className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-xs font-extrabold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingOrder ? "Updating…" : "Cancel order"}
                </button>

                <button
                  type="button"
                  disabled={updatingOrder}
                  onClick={() => updateOrderStatus(orderToReview, "confirmed")}
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingOrder ? "Updating…" : "✓ Accept order"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* OTP Verification Dialog */}
      {orderToVerify && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#10251bd1] p-4 print:hidden"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !updatingOrder
            ) {
              setOrderToVerify(null);
              setOtpValue("");
              setOtpError("");
              setOtpVerified(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-otp-heading"
            className="relative w-full max-w-md rounded-2xl border border-[#e5ece7] bg-white p-6 shadow-2xl sm:p-8"
          >
            {!otpVerified ? (
              <>
                <button
                  type="button"
                  disabled={updatingOrder}
                  onClick={() => {
                    setOrderToVerify(null);
                    setOtpValue("");
                    setOtpError("");
                  }}
                  aria-label="Close OTP dialog"
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-[#e4ebe6] text-xl text-[#526158] hover:bg-[#f5f9f6] disabled:opacity-50"
                >
                  ×
                </button>

                <div className="mb-6">
                  <span className="mb-2 block text-[10px] font-extrabold tracking-[0.15em] text-blue-700">
                    ORDER VERIFICATION
                  </span>

                  <h2
                    id="verify-otp-heading"
                    className="text-xl font-extrabold text-[#26372c]"
                  >
                    Verify order by OTP
                  </h2>

                  <p className="mt-2 text-sm text-[#829087]">
                    Enter the four-digit OTP provided for this order to
                    complete it.
                  </p>
                </div>

                <div className="mb-6 space-y-3 rounded-xl border border-[#e8eee9] bg-[#f8faf9] p-4">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#87938a]">
                      Bill number
                    </span>
                    <strong className="mt-1 block break-all text-sm text-[#26372c]">
                      {orderToVerify.billNumber || "—"}
                    </strong>
                  </div>

                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#87938a]">
                      Order ID
                    </span>
                    <strong className="mt-1 block break-all text-xs text-[#26372c]">
                      {orderToVerify._id}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#e5ebe7] pt-3">
                    <span className="text-xs text-[#78857c]">
                      Order total
                    </span>
                    <strong className="text-base font-extrabold text-emerald-700">
                      {money(orderToVerify.grandTotal)}
                    </strong>
                  </div>
                </div>

                <form onSubmit={verifyOrderOtp}>
                  <label
                    htmlFor="order-verification-otp"
                    className="mb-2 block text-xs font-bold text-[#26372c]"
                  >
                    Enter 4-digit OTP
                  </label>

                  <input
                    id="order-verification-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
                    value={otpValue}
                    disabled={updatingOrder}
                    onChange={(event) => {
                      setOtpValue(
                        event.target.value.replace(/\D/g, "").slice(0, 4)
                      );
                      setOtpError("");
                    }}
                    placeholder="• • • •"
                    className="w-full rounded-xl border border-[#dfe8e2] bg-white px-4 py-4 text-center text-2xl font-extrabold tracking-[0.6em] text-[#26372c] outline-none transition placeholder:text-[#c2ccc5] focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                  />

                  {otpError && (
                    <p
                      role="alert"
                      className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      {otpError}
                    </p>
                  )}

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      disabled={updatingOrder}
                      onClick={() => {
                        setOrderToVerify(null);
                        setOtpValue("");
                        setOtpError("");
                      }}
                      className="flex-1 rounded-xl border border-[#dfe8e2] bg-white px-4 py-3 text-xs font-bold text-[#44564a] hover:bg-[#f5f9f6] disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={updatingOrder || otpValue.length !== 4}
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingOrder ? "Verifying…" : "Verify & Complete"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="py-5 text-center">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-12 w-12 text-emerald-600"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="m7 12.5 3.2 3.2L17.5 8.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-extrabold text-[#26372c]">
                  Order verified!
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#78857c]">
                  OTP verification was successful. The order has been
                  completed and its payment status has been marked as paid.
                </p>

                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-left">
                  <p className="text-xs text-[#78857c]">Bill number</p>
                  <strong className="mt-1 block break-all text-sm text-[#26372c]">
                    {orderToVerify.billNumber || "—"}
                  </strong>

                  <div className="mt-3 flex items-center justify-between border-t border-emerald-100 pt-3">
                    <span className="text-xs font-semibold text-emerald-800">
                      Order status
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                      Completed
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">
                      Payment status
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                      Paid
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOrderToVerify(null);
                    setOtpValue("");
                    setOtpError("");
                    setOtpVerified(false);
                  }}
                  className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700"
                >
                  Done
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}