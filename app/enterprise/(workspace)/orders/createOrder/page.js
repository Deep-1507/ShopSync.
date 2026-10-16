 "use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ENTERPRISE_ID, TOKEN_KEY, enterpriseRequest } from "../../../../../lib/enterpriseClient";

const PRODUCT_ENDPOINT = (id) => `/api/products/allProducts/${id}`;
const ORDER_ENDPOINT = "/api/orders/enterprise";



const money = (value) =>

  new Intl.NumberFormat("en-IN", {

    style: "currency",

    currency: "INR",

    maximumFractionDigits: 2,

  }).format(Number(value) || 0);

// const makeBillNumber = () =>

//   `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

const initialBill = () => ({

  // billNumber: makeBillNumber(),

  orderType: "Collect from store",

  customerId: "",

  paymentType: "prepaid",

  paymentMethod: "cash",

  amountPaid: "",

  discount: "0",

  taxRate: "0",

  shippingCharges: "0",

  billingAddress: "",

  notes: "",

  dueDate: "",

});


export default function CreateOrderPage() {
  
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState(initialBill);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCart, setShowCart] = useState(false);



  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const enterpriseId = localStorage.getItem(ENTERPRISE_ID);
      if (!enterpriseId) throw new Error("Enterprise ID not found. Please sign in again.");
      const result = await enterpriseRequest(PRODUCT_ENDPOINT(enterpriseId));
      const payload = result?.data;
      setProducts(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      setError(err?.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }

  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const categories = useMemo(

    () => ["All", ...new Set(products.map((p) => p.category).filter(Boolean))],

    [products]

  );

  const filteredProducts = useMemo(() => {

    const q = search.trim().toLowerCase();

    return products.filter((p) => {

      const matchesCategory = category === "All" || p.category === category;

      const matchesSearch = !q || [p.name, p.sku, p.brand, p.category]

        .some((v) => String(v || "").toLowerCase().includes(q));

      return matchesCategory && matchesSearch;

    });

  }, [products, search, category]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const totalDiscount = Math.min(subtotal, Math.max(0, Number(form.discount) || 0));

  const taxable = Math.max(0, subtotal - totalDiscount);

  const totalTax = taxable * Math.max(0, Number(form.taxRate) || 0) / 100;

  const shipping = Math.max(0, Number(form.shippingCharges) || 0);

  const grandTotal = Math.max(0, taxable + totalTax + shipping);

  const amountPaid = form.amountPaid === "" ? (form.paymentType === "prepaid" ? grandTotal : 0) : Math.max(0, Number(form.amountPaid) || 0);

  const balanceDue = Math.max(0, grandTotal - amountPaid);



  function addToCart(product) {

    if (Number(product.stock) <= 0) {

      setNotice(`${product.name} is out of stock.`);

      return;

    }

    setCart((current) => {

      const existing = current.find((item) => item.product._id === product._id);

      if (existing) {

        if (existing.quantity >= Number(product.stock)) return current;

        return current.map((item) => item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);

      }

      return [...current, { product, quantity: 1 }];

    });

    setNotice(`${product.name} added to bill.`);

    setTimeout(() => setNotice(""), 2600);

  }

  function changeQuantity(productId, delta) {

    setCart((current) => current

      .map((item) => item.product._id === productId

        ? { ...item, quantity: Math.min(Number(item.product.stock) || 0, item.quantity + delta) }

        : item)

      .filter((item) => item.quantity > 0));

  }

  function updateForm(event) {

    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));

  }

  async function createBill(event) {

    event.preventDefault();

    setError("");

    setNotice("");

    if (!cart.length) return setError("Add at least one product before creating a bill.");

    if (!form.customerId.trim()) return setError("Customer ID is required by the order API.");

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) return setError("Authentication token not found. Please sign in again.");



    const paid = Math.min(grandTotal, amountPaid);

    const payload = {

      // billNumber: form.billNumber,

      orderType: form.orderType,

      customerId: form.customerId.trim(),

      products: cart.map(({ product, quantity }) => {

        const productSubtotal = Number(product.price) * quantity;

        const allocatedDiscount = subtotal > 0 ? totalDiscount * (productSubtotal / subtotal) : 0;

        const lineTaxable = Math.max(0, productSubtotal - allocatedDiscount);

        const lineTax = lineTaxable * Math.max(0, Number(form.taxRate) || 0) / 100;

        return {

          productId: product._id,

          quantity,

          unitPrice: Number(product.price),

          discount: Number((allocatedDiscount / quantity).toFixed(2)),

          taxRate: Math.max(0, Number(form.taxRate) || 0),

          lineTotal: Number((lineTaxable + lineTax).toFixed(2)),

        };

      }),

      subtotal: Number(subtotal.toFixed(2)),

      totalDiscount: Number(totalDiscount.toFixed(2)),

      totalTax: Number(totalTax.toFixed(2)),

      shippingCharges: Number(shipping.toFixed(2)),

      grandTotal: Number(grandTotal.toFixed(2)),

      amountPaid: Number(paid.toFixed(2)),

      balanceDue: Number(Math.max(0, grandTotal - paid).toFixed(2)),

      paymentType: form.paymentType,

      paymentStatus: paid >= grandTotal ? "paid" : paid > 0 ? "partially_paid" : "pending",

      payments: paid > 0 ? [{

        method: form.paymentMethod,

        amount: Number(paid.toFixed(2)),

        transactionId: "",

        status: "successful",

        paidAt: new Date().toISOString(),

      }] : [],

      orderStatus: "confirmed",

      billingAddress: form.billingAddress.trim(),

      notes: form.notes.trim(),

      billDate: new Date().toISOString(),

      dueDate: form.dueDate ? new Date(`${form.dueDate}T23:59:59`).toISOString() : null,

    };



    setSubmitting(true);

    try {

      await enterpriseRequest(ORDER_ENDPOINT, {

        method: "POST",

        headers: {

          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",

        },

        body: JSON.stringify(payload),

      });

      setNotice("Bill created successfully.");

      setCart([]);

      setShowCheckout(false);

      setShowCart(false);

      setForm(initialBill());

      await loadProducts();

    } catch (err) {

      setError(err?.message || "Unable to create the bill.");

    } finally {

      setSubmitting(false);

    }

  }


  return (
    <div className="flex w-full flex-col gap-6 bg-slate-50/70 p-4 sm:p-6 lg:p-8">


 <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
            ORDER MANAGEMENT
          </span>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
           Billing counter
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Build a customer order, review totals, and create a bill in a few steps.
          </p>
        </div>

      </section>



     
      {(error || notice) && (

        <div className={`mb-4 flex items-center gap-3 rounded-xl border p-3 text-xs [&>span]:grid [&>span]:h-6 [&>span]:w-6 [&>span]:shrink-0 [&>span]:place-items-center [&>span]:rounded-full [&>span]:font-black [&>p]:flex-1 [&>p]:leading-relaxed [&>button]:text-lg ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}` } role="status">

          <span>{error ? "!" : "✓"}</span><p>{error || notice}</p>

          <button type="button" onClick={() => { setError(""); setNotice(""); }} _aria-label_="Dismiss notification">×</button>

        </div>

      )}



      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-5 [&>span]:block [&>span]:text-xs [&>span]:text-[#718096] [&>strong]:mt-2 [&>strong]:block [&>strong]:text-2xl [&>strong]:font-extrabold [&>small]:mt-1 [&>small]:block [&>small]:text-[11px] [&>small]:text-[#8190a8]"><span>Products available</span><strong>{products.length}</strong><small>In your catalogue</small></div>

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-5 [&>span]:block [&>span]:text-xs [&>span]:text-[#718096] [&>strong]:mt-2 [&>strong]:block [&>strong]:text-2xl [&>strong]:font-extrabold [&>small]:mt-1 [&>small]:block [&>small]:text-[11px] [&>small]:text-[#8190a8]"><span>Items in current bill</span><strong>{cartCount}</strong><small>Across {cart.length} products</small></div>

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm sm:p-5 [&>span]:block [&>span]:text-xs [&>span]:text-[#718096] [&>strong]:mt-2 [&>strong]:block [&>strong]:text-2xl [&>strong]:font-extrabold [&>small]:mt-1 [&>small]:block [&>small]:text-[11px] [&>small]:text-[#8190a8] border-emerald-200 bg-emerald-50 [&>strong]:text-emerald-600"><span>Current bill total</span><strong>{money(grandTotal)}</strong><small>Including tax and shipping</small></div>

      </section>



      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">

        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">

          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-[#718096]">

            <div><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-600">PRODUCT CATALOGUE</span><h2>Select products</h2><p>Click a product for details or add it directly to the bill.</p></div>

            <button className="grid h-9 w-9 place-items-center rounded-lg border border-[#dce5f2] bg-white text-lg text-emerald-600 hover:bg-emerald-50" type="button" onClick={loadProducts} title="Refresh products" _aria-label_="Refresh products">↻</button>

          </div>

          <div className="flex flex-col gap-3 border-b border-[#edf2f9] px-4 pb-4 sm:flex-row sm:items-center">

            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dce5f2] px-3 py-2.5 text-[#8190a8] focus-within:border-emerald-600 [&>input]:w-full [&>input]:min-w-0 [&>input]:border-0 [&>input]:bg-transparent [&>input]:text-sm [&>input]:text-[#10213f] [&>input]:outline-none"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU or brand..." /></label>

            <select value={category} onChange={(e) => setCategory(e.target.value)} _aria-label_="Filter by category">

              {categories.map((item) => <option key={item} value={item}>{item === "All" ? "All categories" : item}</option>)}

            </select>

          </div>

          {loading ? <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center [&>strong]:text-sm [&>p]:mt-2 [&>p]:max-w-sm [&>p]:text-xs [&>p]:leading-relaxed [&>p]:text-[#8190a8]"><span className="mb-4 h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-100 border-t-emerald-600" /><strong>Loading catalogue</strong><p>Fetching products from your enterprise inventory.</p></div>

          : filteredProducts.length === 0 ? <div className="flex min-h-[250px] flex-col items-center justify-center p-6 text-center [&>strong]:text-sm [&>p]:mt-2 [&>p]:max-w-sm [&>p]:text-xs [&>p]:leading-relaxed [&>p]:text-[#8190a8]"><span>▦</span><strong>No products found</strong><p>Try another search or refresh the catalogue.</p></div>

          : <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">

              {filteredProducts.map((product) => {

                const inCart = cart.find((item) => item.product._id === product._id);

                const outOfStock = Number(product.stock) <= 0;

                return <article className="min-w-0 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md" key={product._id}>

                  <button className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-[#f4f7fc] p-4 text-3xl font-extrabold text-emerald-600 sm:h-40 [&>img]:max-h-full [&>img]:max-w-full [&>img]:object-contain" type="button" onClick={() => setSelectedProduct(product)} _aria-label_={`View ${product.name} details`}>

                    {product.photo_url ? <img src={product.photo_url} alt={product.name} onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <span>{String(product.name || "P").charAt(0).toUpperCase()}</span>}

                    <span className={`absolute right-2 top-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ${outOfStock ? "bg-red-50 text-red-700" : Number(product.stock) < 10 ? "bg-amber-50 text-amber-800" : ""}`}>{outOfStock ? "Out of stock" : `${product.stock} ${product.unit || "units"}`}</span>

                  </button>

                  <div className="min-w-0 p-3">

                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8190a8]"><span>{product.category || "Uncategorised"}</span><span>{product.sku}</span></div>

                    <button className="block w-full truncate text-left text-sm font-bold text-[#10213f] hover:text-emerald-600" type="button" onClick={() => setSelectedProduct(product)}>{product.name}</button>

                    <p>{product.brand || "Unbranded"}</p>

                    <div className="mt-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center [&>strong]:text-sm [&>strong]:font-extrabold [&>button]:w-full [&>button]:rounded-lg [&>button]:bg-emerald-600 [&>button]:px-3 [&>button]:py-2 [&>button]:text-xs [&>button]:font-bold [&>button]:text-white hover:[&>button]:bg-emerald-700 sm:[&>button]:w-auto [&>button:disabled]:cursor-not-allowed [&>button:disabled]:bg-[#a9c5ff]"><strong>{money(product.price)}</strong><button type="button" disabled={outOfStock || (inCart && inCart.quantity >= Number(product.stock))} onClick={() => addToCart(product)}>{inCart ? `Added · ${inCart.quantity}` : "+ Add"}</button></div>

                  </div>

                </article>;

              })}

            </div>}

        </section>



        <aside className="sticky top-5 min-w-0 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">

          <div className="flex items-center justify-between gap-3 p-4 sm:p-5 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-[#718096] bill-side-heading">

            <div><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-600">LIVE BILL</span><h2>Order summary</h2><p>Review selected items and totals.</p></div>

            {/* <span className="rounded-full bg-[#f4f7fc] px-3 py-1.5 font-mono text-[10px] text-[#526582]">{form.billNumber}</span> */}

          </div>

          <div className="px-4">

            {cart.length === 0 ? <div className="flex flex-col items-center justify-center px-4 py-8 text-center [&>span]:mb-3 [&>span]:grid [&>span]:h-11 [&>span]:w-11 [&>span]:place-items-center [&>span]:rounded-xl [&>span]:bg-emerald-50 [&>span]:text-2xl [&>span]:text-emerald-600 [&>strong]:text-xs [&>p]:mt-2 [&>p]:text-[11px] [&>p]:text-[#8190a8]"><span>＋</span><strong>Your bill is empty</strong><p>Add products from the catalogue to begin.</p></div> :

              cart.map(({ product, quantity }) => <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[#edf2f9] py-3" key={product._id}>

                {product.photo_url ? <img src={product.photo_url} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /> : <span className="grid h-[42px] w-[42px] place-items-center rounded-lg bg-[#f5f8f5] font-extrabold text-emerald-600">{String(product.name || "P").charAt(0)}</span>}

                <div className="min-w-0 [&>strong]:block [&>strong]:truncate [&>strong]:text-[11px] [&>small]:mt-1 [&>small]:block [&>small]:text-[10px] [&>small]:text-[#8190a8] [&>b]:mt-1 [&>b]:block [&>b]:text-[11px]"><strong>{product.name}</strong><small>{money(product.price)} × {quantity}</small><b>{money(product.price * quantity)}</b></div>

                <div className="flex items-center gap-2 [&>button]:grid [&>button]:h-6 [&>button]:w-6 [&>button]:place-items-center [&>button]:rounded-md [&>button]:border [&>button]:border-[#dce5f2] [&>button]:bg-white [&>button]:text-sm [&>button]:text-emerald-700 [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-40 [&>span]:min-w-3 [&>span]:text-center [&>span]:text-[11px] [&>span]:font-extrabold"><button type="button" onClick={() => changeQuantity(product._id, -1)} _aria-label_={`Decrease ${product.name}`}>−</button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(product._id, 1)} disabled={quantity >= Number(product.stock)} _aria-label_={`Increase ${product.name}`}>+</button></div>

              </div>)}

          </div>

          <div className="px-4 pb-2 pt-4 [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-3 [&>div]:py-2 [&>div]:text-xs [&>div]:text-[#718096] [&_strong]:text-xs [&_strong]:text-[#10213f]">

            <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>

            <div><span>Discount</span><strong>− {money(totalDiscount)}</strong></div>

            <div><span>Tax ({Number(form.taxRate) || 0}%)</span><strong>{money(totalTax)}</strong></div>

            <div><span>Shipping</span><strong>{money(shipping)}</strong></div>

            <div className="mt-2 border-t border-dashed border-[#dce5f2] py-3 text-sm font-extrabold text-[#10213f] [&>strong]:text-xl [&>strong]:tracking-tight [&>strong]:text-emerald-600"><span>Grand total</span><strong>{money(grandTotal)}</strong></div>

          </div>

          <button className="flex items-center justify-center gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-[#a9c5ff] [&>span]:text-lg" type="button" disabled={!cart.length} onClick={() => setShowCheckout(true)}>Continue to checkout <span>→</span></button>

          <p className="mx-4 mb-4 mt-3 text-center text-[10px] text-[#8190a8] [&>span]:mr-1 [&>span]:text-emerald-600"><span>✓</span> Bill is submitted to your authenticated enterprise.</p>

        </aside>

      </div>



      {selectedProduct && <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-auto bg-[#14284bd1] p-2 sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>

        <section className="relative max-h-[calc(100vh-20px)] w-full max-w-[780px] overflow-auto rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-44px)] sm:p-7 product-detail-modal" role="dialog" _aria-modal_="true" _aria-labelledby_="product-detail-title">

          <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-xl text-[#526582] hover:bg-[#f4f7fc]" type="button" onClick={() => setSelectedProduct(null)} _aria-label_="Close">×</button>

          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2 sm:gap-6">

            <div className="flex min-h-[190px] items-center justify-center rounded-xl bg-[#f4f7fc] p-5 text-5xl font-extrabold text-emerald-600 [&>img]:max-h-[300px] [&>img]:max-w-full [&>img]:object-contain">{selectedProduct.photo_url ? <img src={selectedProduct.photo_url} alt={selectedProduct.name} /> : <span>{String(selectedProduct.name || "P").charAt(0)}</span>}</div>

            <div className="min-w-0 [&>h2]:mb-1 [&>h2]:mt-2 [&>h2]:text-2xl [&>h2]:font-extrabold [&>h2]:tracking-tight [&>p]:text-sm [&>p]:leading-relaxed [&>p]:text-[#526582]"><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-600">{selectedProduct.category || "PRODUCT"}</span><h2 id="product-detail-title">{selectedProduct.name}</h2><p className="text-xs text-[#8190a8]">{selectedProduct.brand || "Unbranded"} · SKU {selectedProduct.sku || "—"}</p><strong className="my-4 block text-2xl font-extrabold text-emerald-600">{money(selectedProduct.price)}</strong><p>{selectedProduct.description || "No product description has been provided."}</p><div className="my-5 grid grid-cols-2 gap-2.5 [&>div]:rounded-lg [&>div]:border [&>div]:border-[#e2e8f0] [&>div]:p-3 [&_span]:block [&_span]:text-[10px] [&_span]:text-[#8190a8] [&_strong]:mt-1 [&_strong]:block [&_strong]:text-xs"><div><span>Available stock</span><strong>{selectedProduct.stock} {selectedProduct.unit || "units"}</strong></div><div><span>Weight</span><strong>{selectedProduct.weight ?? 0} kg</strong></div></div><button className="flex w-full items-center justify-center gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-[#a9c5ff] [&>span]:text-lg" type="button" disabled={Number(selectedProduct.stock) <= 0} onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}>Add to bill <span>＋</span></button></div>

          </div>

        </section>

      </div>}



      {showCart && <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-auto bg-[#14284bd1] p-2 sm:p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCart(false); }}>

        <section className="relative max-h-[calc(100vh-20px)] w-full max-w-[780px] overflow-auto rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-44px)] sm:p-7 max-w-[650px]" role="dialog" _aria-modal_="true" _aria-labelledby_="cart-modal-title">

          <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-xl text-[#526582] hover:bg-[#f4f7fc]" type="button" onClick={() => setShowCart(false)} _aria-label_="Close">×</button><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-600">CURRENT TRANSACTION</span><h2 id="cart-modal-title">Current bill</h2>

          {cart.length ? cart.map(({ product, quantity }) => <div className="grid grid-cols-[minmax(0,1fr)autoauto] items-center gap-4 border-b border-[#edf2f9] py-3.5 [&>div:first-child_strong]:block [&>div:first-child_strong]:text-xs [&>div:first-child_small]:mt-1 [&>div:first-child_small]:block [&>div:first-child_small]:text-[11px] [&>div:first-child_small]:text-[#8190a8] [&>strong]:text-xs" key={product._id}><div><strong>{product.name}</strong><small>{money(product.price)} each</small></div><div className="flex items-center gap-2 [&>button]:grid [&>button]:h-6 [&>button]:w-6 [&>button]:place-items-center [&>button]:rounded-md [&>button]:border [&>button]:border-[#dce5f2] [&>button]:bg-white [&>button]:text-sm [&>button]:text-emerald-700 [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-40 [&>span]:min-w-3 [&>span]:text-center [&>span]:text-[11px] [&>span]:font-extrabold"><button type="button" onClick={() => changeQuantity(product._id, -1)}>−</button><span>{quantity}</span><button type="button" onClick={() => changeQuantity(product._id, 1)} disabled={quantity >= Number(product.stock)}>+</button></div><strong>{money(product.price * quantity)}</strong></div>) : <p>Your bill is empty.</p>}

          <div className="my-4 flex items-center justify-between gap-3 border-t border-dashed border-[#dce5f2] pt-4 text-sm font-extrabold text-[#10213f] [&>strong]:text-xl [&>strong]:text-emerald-600"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><button className="flex w-full items-center justify-center gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-[#a9c5ff] [&>span]:text-lg" type="button" disabled={!cart.length} onClick={() => { setShowCart(false); setShowCheckout(true); }}>Checkout <span>→</span></button>

        </section>

      </div>}



      {showCheckout && <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-auto bg-[#14284bd1] p-2 sm:p-5 checkout-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) setShowCheckout(false); }}>

        <section className="relative max-h-[calc(100vh-20px)] w-full max-w-[780px] overflow-auto rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-44px)] sm:p-7 max-w-[760px]" role="dialog" _aria-modal_="true" _aria-labelledby_="checkout-title">

          <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-xl text-[#526582] hover:bg-[#f4f7fc]" type="button" onClick={() => setShowCheckout(false)} disabled={submitting} _aria-label_="Close">×</button>

          <div className="mb-5 [&>h2]:text-2xl [&>h2]:font-extrabold [&>p]:mt-2 [&>p]:text-xs [&>p]:text-[#8190a8]"><span className="mb-2 block text-[10px] font-extrabold tracking-[0.13em] text-emerald-600">FINALISE TRANSACTION</span><h2 id="checkout-title">Create bill</h2><p>Enter customer and payment details, then confirm the order.</p></div>

          <form onSubmit={createBill}>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">

              {/* <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Bill number<input name="billNumber" value={form.billNumber} onChange={updateForm} required /></label> */}

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Customer ID <span className="inline text-red-600">*</span><input name="customerId" value={form.customerId} onChange={updateForm} placeholder="MongoDB customer ObjectId" required /></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Order type<select name="orderType" value={form.orderType} onChange={updateForm}><option>Collect from store</option><option>Local Delivery</option><option>Global Delivery</option></select></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Payment type<select name="paymentType" value={form.paymentType} onChange={(e) => { updateForm(e); if (e.target.value === "prepaid") setForm((current) => ({ ...current, paymentType: e.target.value, amountPaid: String(grandTotal) })); }}><option value="prepaid">Prepaid</option><option value="postpaid">Postpaid</option><option value="cashondelivery">Cash on delivery</option></select></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Payment method<select name="paymentMethod" value={form.paymentMethod} onChange={updateForm}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="net_banking">Net banking</option><option value="bank_transfer">Bank transfer</option><option value="wallet">Wallet</option><option value="cheque">Cheque</option><option value="cashondelivery">Cash on delivery</option><option value="other">Other</option></select></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Amount paid (₹)<input name="amountPaid" type="number" min="0" step="0.01" value={form.amountPaid === "" && form.paymentType === "prepaid" ? grandTotal.toFixed(2) : form.amountPaid} onChange={updateForm} /></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Bill discount (₹)<input name="discount" type="number" min="0" max={subtotal} step="0.01" value={form.discount} onChange={updateForm} /></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Tax rate (%)<input name="taxRate" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={updateForm} /></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Shipping charges (₹)<input name="shippingCharges" type="number" min="0" step="0.01" value={form.shippingCharges} onChange={updateForm} /></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal">Due date<input name="dueDate" type="date" value={form.dueDate} onChange={updateForm} /></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal sm:col-span-2">Billing address<input name="billingAddress" value={form.billingAddress} onChange={updateForm} placeholder="Customer billing address" /></label>

              <label className="flex min-w-0 flex-col gap-2 text-[11px] font-bold text-[#344563] [&>input]:w-full [&>input]:rounded-lg [&>input]:border [&>input]:border-[#dce5f2] [&>input]:bg-white [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:font-normal [&>input]:outline-none focus-within:[&>input]:border-emerald-600 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-[#dce5f2] [&>select]:bg-white [&>select]:px-3 [&>select]:py-2.5 [&>select]:text-sm [&>select]:font-normal [&>textarea]:w-full [&>textarea]:rounded-lg [&>textarea]:border [&>textarea]:border-[#dce5f2] [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:font-normal sm:col-span-2">Notes<textarea name="notes" value={form.notes} onChange={updateForm} rows={2} placeholder="Special instructions or notes..." /></label>

            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-[#f4f7fc] p-3.5 sm:grid-cols-3 [&_span]:block [&_span]:text-[10px] [&_span]:text-[#7d8a81] [&_strong]:mt-1.5 [&_strong]:block [&_strong]:text-base [&_strong]:text-[#10213f] [&>div:first-child_strong]:text-emerald-600"><div><span>Grand total</span><strong>{money(grandTotal)}</strong></div><div><span>Amount paid</span><strong>{money(Math.min(grandTotal, amountPaid))}</strong></div><div><span>Balance due</span><strong>{money(balanceDue)}</strong></div></div>

            <div className="mt-5 flex flex-col-reverse justify-end gap-2.5 sm:flex-row"><button type="button" className="rounded-lg border border-[#dce5f2] bg-white px-4 py-3 text-xs font-bold text-[#344563] hover:bg-[#f4f7fc] disabled:opacity-50" disabled={submitting} onClick={() => setShowCheckout(false)}>Back to counter</button><button type="submit" className="flex w-full items-center justify-center gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-[#a9c5ff] [&>span]:text-lg" disabled={submitting || !cart.length}>{submitting ? "Creating bill..." : "Confirm & create bill"} <span>→</span></button></div>

          </form>

        </section>

      </div>}
    </div>
  );
}
