
import mongoose from "mongoose";
import Order from "../models/Order";
import Product from "../models/Product";
import User from "../models/User";
import { connectDB } from "../lib/mongodb";

const fail = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const otp = String(Math.floor(1000 + Math.random() * 9000));

export async function createOrder(customerId, body) {
  await connectDB();

  if (!mongoose.isValidObjectId(customerId)) {
    fail("Invalid customer ID", 400);
  }

  const {
    enterpriseId,
    orderType,
    products,
    shippingCharges = 0,
    billingAddress = "",
    notes = "",
    dueDate = null,
    paymentType = "prepaid",
  } = body;

  if (!mongoose.isValidObjectId(enterpriseId)) fail("Invalid enterprise ID", 400);

  if (!["Collect from store", "Local Delivery", "Global Delivery"].includes(orderType)) {
    fail("Invalid order type", 400);
  }

  if (!Array.isArray(products) || products.length === 0) {
    fail("At least one product is required", 400);
  }

  if (!Number.isFinite(shippingCharges) || shippingCharges < 0) {
    fail("Invalid shipping charges", 400);
  }

  if (!["prepaid", "postpaid", "cash_on_delivery"].includes(paymentType)) {
    fail("Invalid payment type", 400);
  }

  const normalizedProducts = [];
  let subtotal = 0;

  for (const item of products) {
    if (!mongoose.isValidObjectId(item.productId)) fail("Invalid product ID", 400);

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      fail("Product quantity must be greater than zero", 400);
    }

    const product = await Product.findOne({
      _id: item.productId,
      // enterpriseId
    });



    if (!product) {
      fail("A product was not found for this enterprise", 404);
    }

    const unitPrice = Number(product.price);
    const discount = Number(item.discount ?? 0);
    const taxRate = Number(item.taxRate ?? 0);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      fail("Invalid product price in database", 400);
    }

    if (!Number.isFinite(discount) || discount < 0) {
      fail("Invalid product discount", 400);
    }

    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      fail("Tax rate must be between 0 and 100", 400);
    }

    const gross = unitPrice * item.quantity;

    if (discount > gross) {
      fail("Product discount cannot exceed its gross price", 400);
    }

    const taxableAmount = gross - discount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const lineTotal = roundMoney(taxableAmount + taxAmount);

    subtotal += gross;

    normalizedProducts.push({
      productId: product._id,
      quantity: item.quantity,
      unitPrice,
      discount: roundMoney(discount),
      taxRate,
      lineTotal,
    });
  }

  subtotal = roundMoney(subtotal);

  const totalDiscount = roundMoney(
    normalizedProducts.reduce((sum, item) => sum + item.discount, 0)
  );

  const totalTax = roundMoney(
    normalizedProducts.reduce(
      (sum, item) =>
        sum +
        (item.unitPrice * item.quantity - item.discount) *
        (item.taxRate / 100),
      0
    )
  );

  const grandTotal = roundMoney(
    subtotal - totalDiscount + totalTax + shippingCharges
  );

  const billNumber = `BILL-${Date.now()}-${new mongoose.Types.ObjectId()
    .toString()
    .slice(-6)
    .toUpperCase()}`;

  const order = await Order.create({
    billNumber,
    orderType,
    customerId,
    enterpriseId,
    products: normalizedProducts,
    subtotal,
    totalDiscount,
    totalTax,
    shippingCharges: roundMoney(shippingCharges),
    grandTotal,
    amountPaid: 0,
    balanceDue: grandTotal,
    paymentType,
    paymentStatus: "pending",
    orderStatus: "placed",
    billingAddress,
    notes,
    dueDate,
    otp, // Newly generated 4-digit OTP
  });

  return order;
}

export async function createOrderByEnterprise(enterpriseId, body) {
  await connectDB();
  console.log("Inside service", enterpriseId)
  if (!mongoose.isValidObjectId(enterpriseId)) {
    fail("Invalid enterprise ID", 400);
  }

  const {
    customerId,
    orderType,
    products,
    shippingCharges = 0,
    billingAddress = "",
    notes = "",
    dueDate = null,
    paymentType = "prepaid",
  } = body;

  if (!mongoose.isValidObjectId(enterpriseId)) fail("Invalid enterprise ID", 400);

  if (!["Collect from store", "Local Delivery", "Global Delivery"].includes(orderType)) {
    fail("Invalid order type", 400);
  }

  if (!Array.isArray(products) || products.length === 0) {
    fail("At least one product is required", 400);
  }

  if (!Number.isFinite(shippingCharges) || shippingCharges < 0) {
    fail("Invalid shipping charges", 400);
  }

  if (!["prepaid", "postpaid", "cash_on_delivery"].includes(paymentType)) {
    fail("Invalid payment type", 400);
  }

  const normalizedProducts = [];
  let subtotal = 0;

  for (const item of products) {
    if (!mongoose.isValidObjectId(item.productId)) fail("Invalid product ID", 400);

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      fail("Product quantity must be greater than zero", 400);
    }

    const product = await Product.findOne({
      _id: item.productId,
      enterpriseId,
    });

    if (!product) {
      fail("A product was not found for this enterprise", 404);
    }

    const unitPrice = Number(product.price);
    const discount = Number(item.discount ?? 0);
    const taxRate = Number(item.taxRate ?? 0);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      fail("Invalid product price in database", 400);
    }

    if (!Number.isFinite(discount) || discount < 0) {
      fail("Invalid product discount", 400);
    }

    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      fail("Tax rate must be between 0 and 100", 400);
    }

    const gross = unitPrice * item.quantity;

    if (discount > gross) {
      fail("Product discount cannot exceed its gross price", 400);
    }

    const taxableAmount = gross - discount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const lineTotal = roundMoney(taxableAmount + taxAmount);

    subtotal += gross;

    normalizedProducts.push({
      productId: product._id,
      quantity: item.quantity,
      unitPrice,
      discount: roundMoney(discount),
      taxRate,
      lineTotal,
    });
  }

  subtotal = roundMoney(subtotal);

  const totalDiscount = roundMoney(
    normalizedProducts.reduce((sum, item) => sum + item.discount, 0)
  );

  const totalTax = roundMoney(
    normalizedProducts.reduce(
      (sum, item) =>
        sum +
        (item.unitPrice * item.quantity - item.discount) *
        (item.taxRate / 100),
      0
    )
  );

  const grandTotal = roundMoney(
    subtotal - totalDiscount + totalTax + shippingCharges
  );

  const billNumber = `BILL-${Date.now()}-${new mongoose.Types.ObjectId()
    .toString()
    .slice(-6)
    .toUpperCase()}`;

  const order = await Order.create({
    billNumber,
    orderType,
    customerId,
    enterpriseId,
    products: normalizedProducts,
    subtotal,
    totalDiscount,
    totalTax,
    shippingCharges: roundMoney(shippingCharges),
    grandTotal,
    amountPaid: 0,
    balanceDue: grandTotal,
    paymentType,
    paymentStatus: "pending",
    orderStatus: "placed",
    billingAddress,
    notes,
    dueDate,
  });

  return order;
}


export async function getOrders(filters = {}, page = 1, limit = 10) {
  await connectDB();

  page = Number(page);
  limit = Number(limit);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    fail("Page must be positive and limit must be between 1 and 100", 400);
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filters)
      .select("-payments.transactionId")
      .populate("customerId", "name email phone location latitude longitude")
      .populate("enterpriseId", "name email phone enterpriseName")
      .populate("products.productId", "name sku photo_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Order.countDocuments(filters),
  ]);

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + orders.length < total,
      hasPreviousPage: page > 1,
    },
  };
}


export async function getOrderById(id) {
  await connectDB();

  if (!mongoose.isValidObjectId(id)) fail("Invalid order ID", 400);

  const order = await Order.findById(id)
    .populate("customerId", "name email phone")
    .populate("enterpriseId", "enterpriseName category location")
    .populate("products.productId", "name sku photo_url")
    .lean();

  if (!order) fail("Order not found", 404);

  return order;
}

export async function getOrderByBillNumber(billNumber) {
  await connectDB();

  const order = await Order.findOne({
    billNumber: billNumber.trim().toUpperCase(),
  })
    .populate("customerId", "name email phone")
    .populate("enterpriseId", "enterpriseName category location")
    .populate("products.productId", "name sku photo_url")
    .lean();

  if (!order) fail("Order not found for this bill number", 404);

  return order;
}

export async function updateOrder(id, body) {
  await connectDB();

  if (!mongoose.isValidObjectId(id)) fail("Invalid order ID", 400);

  // Only allow fields the enterprise can safely update here.
  const allowedFields = ["orderStatus", "notes", "dueDate"];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(body, field)) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    fail("No valid fields provided for update", 400);
  }

  const allowedStatuses = [
    "placed",
    "confirmed",
    "processing",
    "completed",
    "cancelled",
  ];

  if (updates.orderStatus && !allowedStatuses.includes(updates.orderStatus)) {
    fail("Invalid order status", 400);
  }

  const order = await Order.findOneAndUpdate(
    { _id: id, enterpriseId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!order) fail("Order not found for this enterprise", 404);

  return order;
}

export async function deleteOrder(id, customerId) {
  await connectDB();

  if (!mongoose.isValidObjectId(id)) fail("Invalid order ID", 400);

  // Customers may delete only their own orders while still placed.
  const order = await Order.findOneAndDelete({
    _id: id,
    customerId,
    orderStatus: "placed",
  });

  if (!order) {
    fail("Order not found, or it can no longer be deleted", 404);
  }

  return order;
}