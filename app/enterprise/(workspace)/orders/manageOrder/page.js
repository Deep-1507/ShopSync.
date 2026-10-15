"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ENTERPRISE_ID, TOKEN_KEY, enterpriseRequest } from "../../../../../lib/enterpriseClient";


const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const dateText = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const dateInputText = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function normaliseOrders(result) {
    const body = result?.orders;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.orders)) return body.orders;
    if (Array.isArray(body?.data?.orders)) return body.data.orders;
    return [];
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

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const enterpriseId = localStorage.getItem("Enterprise_id");
            if (!enterpriseId) throw new Error("Enterprise ID not found. Please sign in again.");
            const token = localStorage.getItem("shopsync_enterprise_token");
            if (!token) throw new Error("Authentication token not found. Please sign in again.");
            const result = await enterpriseRequest(`/api/orders/enterprise/${enterpriseId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log(result)
            setOrders(normaliseOrders(result));
        } catch (err) {
            setError(err?.message || "Unable to load orders.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const filteredOrders = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((order) => {
            const date = dateInputText(order.billDate || order.createdAt);
            const matchesSearch = !q || [order.billNumber, order.customerId?.name, order.customerId?.email, order.customerId, order.orderType, order.paymentStatus, order.orderStatus]
                .some((v) => String(v ?? "").toLowerCase().includes(q));
            const matchesStatus = status === "all" || String(order.orderStatus || "").toLowerCase() === status || String(order.paymentStatus || "").toLowerCase() === status;
            const matchesFrom = !dateFrom || (date && date >= dateFrom);
            const matchesTo = !dateTo || (date && date <= dateTo);
            return matchesSearch && matchesStatus && matchesFrom && matchesTo;
        });
    }, [orders, search, status, dateFrom, dateTo]);

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.grandTotal) || 0), 0);
    const paidAmount = filteredOrders.reduce((sum, order) => sum + (Number(order.amountPaid) || 0), 0);

    function printOrder(order) {
        setSelectedOrder(order);
        window.setTimeout(() => window.print(), 100);
    }

    function printAll() {
        window.print();
    }

    function statusClass(value) {
        const v = String(value || "pending").toLowerCase();
        const base = "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize";
        if (["paid", "successful", "completed", "confirmed"].includes(v)) return `${base} bg-emerald-50 text-emerald-800`;
        if (["failed", "cancelled", "refunded"].includes(v)) return `${base} bg-red-50 text-red-700`;
        if (["partially_paid", "processing"].includes(v)) return `${base} bg-amber-50 text-amber-800`;
        return `${base} bg-slate-100 text-slate-700`;
    }

    function renderBill(order) {
        return <div className="mx-auto my-0 hidden max-w-[800px] bg-white p-8 text-black print:my-0 print:block print:max-w-none print:p-0" key={order._id || order.billNumber}>
            <div className="flex items-start justify-between gap-5 border-b-2 border-black pb-5 [&_h1]:my-2 [&_h1]:text-3xl [&_h1]:font-bold [&_p]:text-xs"><div><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-700">SHOPSYNC · TAX INVOICE</span><h1>Invoice</h1><p>Bill number: <strong>{order.billNumber || "—"}</strong></p></div><div className="grid gap-1 text-right text-xs [&>span]:mt-2 [&>span]:text-gray-500 [&>strong]:font-semibold"><span>Bill date</span><strong>{dateText(order.billDate || order.createdAt)}</strong><span>Order status</span><strong>{order.orderStatus || "placed"}</strong></div></div>
            <div className="my-5 grid grid-cols-2 gap-6 border-b border-gray-300 pb-5 text-xs [&_span]:mb-1 [&_span]:block [&_span]:text-gray-500 [&_strong]:block [&_p]:mt-1 [&_p]:text-gray-600"><div><span>Bill to / Customer ID</span><strong>{order.customerId?.name || order.customerName || String(order.customerId || "—")}</strong><p>{order.billingAddress || order.customerId?.email || ""}</p></div><div><span>Order type</span><strong>{order.orderType || "—"}</strong><span>Payment status</span><strong>{order.paymentStatus || "pending"}</strong></div></div>
            <table className="w-full border-collapse text-xs [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-gray-300 [&_td]:p-2"><thead><tr><th>#</th><th>Product ID / Name</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Tax</th><th className="text-right">Line total</th></tr></thead><tbody>{(order.products || []).map((item, i) => <tr key={item._id || item.productId?._id || `${item.productId}-${i}`}><td>{i + 1}</td><td>{item.productId?.name || item.name || String(item.productId || "Product")}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.discount)}</td><td>{Number(item.taxRate) || 0}%</td><td className="text-right">{money(item.lineTotal)}</td></tr>)}</tbody></table>
            <div className="ml-auto mt-5 w-full max-w-[320px] text-xs [&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:border-b [&>div]:border-gray-200 [&>div]:py-2"><div><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div><div><span>Discount</span><strong>{money(order.totalDiscount)}</strong></div><div><span>Tax</span><strong>{money(order.totalTax)}</strong></div><div><span>Shipping</span><strong>{money(order.shippingCharges)}</strong></div><div className="border-t-2 border-black font-bold [&>strong]:text-base"><span>Grand total</span><strong>{money(order.grandTotal)}</strong></div><div><span>Amount paid</span><strong>{money(order.amountPaid)}</strong></div><div><span>Balance due</span><strong>{money(order.balanceDue)}</strong></div></div>
            {order.notes && <p className="mt-5 border-t border-gray-300 pt-3 text-xs"><strong>Notes:</strong> {order.notes}</p>}
            <div className="mt-8 border-t border-gray-300 pt-3 text-center text-xs text-gray-500">Thank you for your business.</div>
        </div>;
    }


    return (
        <div className="page-stack">

            <section className="w-full">
                <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Heading */}
                    <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-700">
                            ORDER MANAGEMENT
                        </span>

                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
                            Orders & Bills
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                            Review enterprise orders, inspect invoices, and print individual or
                            filtered bills.
                        </p>
                    </div>

                    {/* Right: Action buttons */}
                    <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-3 sm:ml-auto sm:w-auto sm:justify-end">
                        <button
                            type="button"
                            onClick={loadOrders}
                            className="rounded-lg border border-[#dfe8e2] bg-white px-2 py-1 text-xs font-bold text-[#44564a] transition-colors hover:bg-[#f5f9f6] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ↻ Refresh
                        </button>

                        <button
                            type="button"
                            onClick={printAll}
                            disabled={!filteredOrders.length}
                            className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-extrabold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            ▤ Print filtered bills
                        </button>
                    </div>
                </div>
            </section>

            {error && <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 [&>span]:font-black [&>p]:flex-1" role="alert"><span>!</span><p>{error}</p><button type="button" onClick={() => setError("")}>×</button></div>}

            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 [&>div]:rounded-xl [&>div]:border [&>div]:border-[#e5ece7] [&>div]:bg-white [&>div]:p-4 [&>div]:shadow-sm [&_span]:block [&_span]:text-xs [&_span]:text-[#78857c] [&_strong]:mt-2 [&_strong]:block [&_strong]:text-2xl [&_strong]:font-extrabold [&_small]:mt-1 [&_small]:block [&_small]:text-[11px] [&_small]:text-[#8a968e]">
                <div><span>Orders found</span><strong>{filteredOrders.length}</strong><small>Matching current filters</small></div>
                <div><span>Order value</span><strong>{money(totalRevenue)}</strong><small>Grand total of filtered orders</small></div>
                <div><span>Payments received</span><strong>{money(paidAmount)}</strong><small>Amount paid on filtered orders</small></div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e5ece7] bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_p]:text-xs [&_p]:text-[#738078]"><div><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-blue-600 ">ORDER REGISTER</span><h2>All enterprise orders</h2><p>Use the date range to narrow down bills before printing.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-blue-600 ">{filteredOrders.length} bills</span></div>
                <div className="grid grid-cols-1 gap-3 border-y border-[#edf1ee] bg-[#fbfdfb] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1.5fr)_repeat(3,minmax(120px,1fr))_auto] [&>label]:flex [&>label]:min-w-0 [&>label]:flex-col [&>label]:gap-1.5 [&>label]:text-[10px] [&>label]:font-bold [&>label]:text-[#78857c] [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:border-[#dfe8e2] [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-xs [&_select]:rounded-lg [&_select]:border [&_select]:border-[#dfe8e2] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-xs">
                    
                    <label className="flex min-w-0 flex-row items-center gap-3 rounded-lg border border-[#dfe8e2] bg-white px-3 py-2.5 text-[#8a968e] focus-within:border-[#b8cbbd] focus-within:ring-2 focus-within:ring-[#edf4ef]">
                        {/* <span className="flex shrink-0 items-center justify-center text-base leading-none">
                            ⌕
                        </span> */}
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search bill, customer or status..."
                            className="w-full min-w-0 border-0 bg-transparent p-0 text-xs leading-5 text-[#44564a] outline-none ring-0 placeholder:text-[#a0aaa3] focus:border-0 focus:outline-none focus:ring-0"
                        />
                    </label>
                    
                    <label><span>From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
                    <label><span>To</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} /></label>
                    <label><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="placed">Placed</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="paid">Paid</option><option value="partially_paid">Partially paid</option><option value="pending">Pending payment</option><option value="failed">Failed payment</option></select></label>
                    <button type="button" className="self-end rounded-lg border border-[#dfe8e2] bg-white px-3 py-2.5 text-xs font-bold text-[#44564a] hover:bg-[#f5f9f6]" onClick={() => { setSearch(""); setStatus("all"); setDateFrom(""); setDateTo(""); }}>Clear</button>
                </div>

                {loading ? <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center [&>strong]:text-sm [&>p]:mt-2 [&>p]:text-xs [&>p]:text-[#8a968e]"><span className="mb-4 h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-100 border-t-emerald-700" /><strong>Loading orders</strong><p>Fetching your enterprise bills.</p></div>
                    : filteredOrders.length === 0 ? <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center [&>strong]:text-sm [&>p]:mt-2 [&>p]:text-xs [&>p]:text-[#8a968e]"><span>▤</span><strong>No orders found</strong><p>Try changing the filters or create a new bill from the billing counter.</p></div>
                        : <div className="w-full overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-xs [&_th]:border-b [&_th]:border-[#e8eee9] [&_th]:bg-[#f8faf8] [&_th]:px-4 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-extrabold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[#78857c] [&_td]:border-b [&_td]:border-[#edf1ee] [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td>strong]:block [&_td>small]:mt-1 [&_td>small]:block [&_td>small]:text-[10px] [&_td>small]:text-[#829087] [&_tbody_tr:hover]:bg-[#fbfdfb]"><thead><tr><th>Bill / Date</th><th>Customer</th><th>Items</th><th>Grand total</th><th>Payment</th><th>Order status</th><th className="text-right">Actions</th></tr></thead><tbody>
                            {filteredOrders.map((order) => <tr key={order._id || order.billNumber}>
                                <td><strong className="font-extrabold text-[#26372c]">{order.billNumber || "—"}</strong><small>{dateText(order.billDate || order.createdAt)}</small></td>
                                <td><strong>{order.customerId?.name || order.customerName || "Customer"}</strong><small>{order.customerId?.email || (typeof order.customerId === "string" ? order.customerId : "—")}</small></td>
                                <td><strong>{(order.products || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} items</strong><small>{(order.products || []).length} product types</small></td>
                                <td><strong className="font-extrabold text-emerald-700">{money(order.grandTotal)}</strong><small>Paid {money(order.amountPaid)}</small></td>
                                <td><span className={statusClass(order.paymentStatus)}>{String(order.paymentStatus || "pending").replaceAll("_", " ")}</span></td>
                                <td><span className={statusClass(order.orderStatus)}>{String(order.orderStatus || "placed").replaceAll("_", " ")}</span></td>
                                <td><div className="flex items-center justify-end gap-2 whitespace-nowrap [&>button]:rounded-md [&>button]:border [&>button]:border-[#dfe8e2] [&>button]:bg-white [&>button]:px-2.5 [&>button]:py-2 [&>button]:text-[10px] [&>button]:font-bold [&>button]:text-[#44564a] [&>button:hover]:bg-[#f5f9f6]"><button type="button" onClick={() => setSelectedOrder(order)}>View details</button><button type="button" className="text-emerald-700" onClick={() => printOrder(order)} title={`Print ${order.billNumber || "bill"}`} aria-label={`Print ${order.billNumber || "bill"}`}>⎙</button></div></td>
                            </tr>)}
                        </tbody></table></div>}
                <div className="flex flex-col justify-between gap-2 bg-[#fbfdfb] px-4 py-3 text-[10px] text-[#829087] sm:flex-row"><span>Showing {filteredOrders.length} of {orders.length} orders</span><span>Date filters apply to bill date.</span></div>
            </section>

            {selectedOrder && <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-auto bg-[#10251bd1] p-2 sm:p-5 print:hidden" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
                <section className="relative max-h-[calc(100vh-20px)] w-full max-w-4xl overflow-auto rounded-2xl border border-[#e5ece7] bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-44px)] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="order-detail-heading">
                    <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-[#e4ebe6] bg-white text-xl text-[#526158]" type="button" onClick={() => setSelectedOrder(null)} aria-label="Close">×</button>
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center [&_h2]:text-xl [&_h2]:font-extrabold [&_p]:mt-2 [&_p]:text-xs [&_p]:text-[#829087]"><div><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-700">BILL DETAILS</span><h2 id="order-detail-heading">{selectedOrder.billNumber || "Order details"}</h2><p>Created {dateText(selectedOrder.billDate || selectedOrder.createdAt)}</p></div><button type="button" className="rounded-lg bg-blue-600 px-4 py-3 text-xs font-extrabold text-white hover:bg-blue-800  disabled:cursor-not-allowed disabled:opacity-50" onClick={() => printOrder(selectedOrder)}>⎙ Print bill</button></div>
                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>div]:rounded-lg [&>div]:border [&>div]:border-[#e8eee9] [&>div]:p-3 [&_span]:block [&_span]:text-[10px] [&_span]:text-[#87938a] [&_strong]:mt-1 [&_strong]:block [&_strong]:break-words [&_strong]:text-xs"><div><span>Customer ID</span><strong>{selectedOrder.customerId?.name || selectedOrder.customerName || (typeof selectedOrder.customerId === "string" ? selectedOrder.customerId : "—")}</strong></div><div><span>Order type</span><strong>{selectedOrder.orderType || "—"}</strong></div><div><span>Order status</span><strong>{String(selectedOrder.orderStatus || "placed").replaceAll("_", " ")}</strong></div><div><span>Payment status</span><strong>{String(selectedOrder.paymentStatus || "pending").replaceAll("_", " ")}</strong></div><div className="sm:col-span-2"><span>Billing address</span><strong>{selectedOrder.billingAddress || "—"}</strong></div></div>
                    <h3 className="mb-3 text-sm font-extrabold text-[#26372c]">Items on this bill</h3>
                    <div className="w-full overflow-x-auto"><table className="w-full min-w-[650px] border-collapse text-xs [&_th]:bg-[#f8faf8] [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:text-[10px] [&_th]:text-[#78857c] [&_td]:border-b [&_td]:border-[#edf1ee] [&_td]:px-3 [&_td]:py-3 [&_td>strong]:block [&_td>small]:mt-1 [&_td>small]:block [&_td>small]:text-[10px] [&_td>small]:text-[#829087]"><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Tax</th><th>Total</th></tr></thead><tbody>{(selectedOrder.products || []).map((item, i) => <tr key={item._id || item.productId?._id || `${item.productId}-${i}`}><td><strong>{item.productId?.name || item.name || String(item.productId || "Product")}</strong><small>{item.productId?.sku || item.sku || ""}</small></td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.discount)}</td><td>{Number(item.taxRate) || 0}%</td><td><strong>{money(item.lineTotal)}</strong></td></tr>)}</tbody></table></div>
                    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2"><div className="min-w-0 [&>h3]:mb-3 [&>h3]:text-sm [&>h3]:font-extrabold [&>p]:text-xs [&>p]:text-[#829087]"><h3>Payments</h3>{(selectedOrder.payments || []).length ? selectedOrder.payments.map((payment, i) => <div className="flex items-center justify-between gap-3 border-b border-[#edf1ee] py-3 [&_strong]:text-xs [&_small]:mt-1 [&_small]:block [&_small]:text-[10px] [&_small]:text-[#829087]" key={payment._id || i}><div><strong>{String(payment.method || "other").replaceAll("_", " ")}</strong><small>{payment.transactionId || "No transaction ID"} · {payment.status || "pending"}</small></div><strong>{money(payment.amount)}</strong></div>) : <p>No payment records attached.</p>}{selectedOrder.notes && <p className="mt-4 rounded-lg bg-[#f5f9f6] p-3 text-xs leading-relaxed text-[#526158]"><strong>Notes:</strong> {selectedOrder.notes}</p>}</div>
                        <div className="rounded-xl bg-[#f8faf8] p-4 [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-3 [&>div]:py-2 [&>div]:text-xs [&>div]:text-[#78857c] [&_strong]:text-xs [&_strong]:text-[#29372e]"><div><span>Subtotal</span><strong>{money(selectedOrder.subtotal)}</strong></div><div><span>Discount</span><strong>{money(selectedOrder.totalDiscount)}</strong></div><div><span>Tax</span><strong>{money(selectedOrder.totalTax)}</strong></div><div><span>Shipping</span><strong>{money(selectedOrder.shippingCharges)}</strong></div><div className="mt-2 border-t border-dashed border-[#dfe8e2] pt-3 font-extrabold text-[#1e2e23] [&>strong]:text-xl [&>strong]:text-emerald-700"><span>Grand total</span><strong>{money(selectedOrder.grandTotal)}</strong></div><div><span>Amount paid</span><strong>{money(selectedOrder.amountPaid)}</strong></div><div><span>Balance due</span><strong>{money(selectedOrder.balanceDue)}</strong></div></div>
                    </div>
                    <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row"><button type="button" className="rounded-lg border border-[#dfe8e2] bg-white px-4 py-3 text-xs font-bold text-[#44564a] hover:bg-[#f5f9f6] disabled:opacity-50" onClick={() => setSelectedOrder(null)}>Close</button><button type="button" className="rounded-lg bg-blue-600 px-4 py-3 text-xs font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => printOrder(selectedOrder)}>⎙ Print bill</button></div>
                </section>
            </div>}

            <section className="hidden print:block">
                {selectedOrder ? renderBill(selectedOrder) : filteredOrders.map(renderBill)}
            </section>


        </div>
    );
}
