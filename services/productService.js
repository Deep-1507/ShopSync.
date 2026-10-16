
import mongoose from "mongoose";
import Product from "../models/Product";
import { connectDB } from "../lib/mongodb";
import {
  productSchemaValidator,
  productUpdateSchemaValidator,
} from "../validators/productValidator";

export async function registerProduct(body, enterpriseId) {
  await connectDB();

  const validatedData = productSchemaValidator.parse(body);

  console.log("Enterprise ID received:", enterpriseId);

  const product = new Product({
    ...validatedData,
    enterpriseId: enterpriseId,
  });

  console.log("Enterprise ID before save:", product.enterpriseId);
  console.log("Document before save:", product.toObject());

  await product.save();

  console.log("Saved product:", product.toObject());

  // Read it back from MongoDB.
  const savedProduct = await Product.findById(product._id).lean();

  console.log("Product fetched from DB:", savedProduct);

  return savedProduct;
}


export async function getProducts(enterpriseId) {
  await connectDB();

  if (!mongoose.isValidObjectId(enterpriseId)) {
    throw new Error("Invalid enterprise ID");
  }

  const enterpriseObjectId = new mongoose.Types.ObjectId(enterpriseId);

  const products = await Product.find({
    enterpriseId: enterpriseObjectId,
  }).sort({ createdAt: -1 });

  console.log("Products found:", products.length);

  return products;
}

export async function searchProducts(query) {
  await connectDB();

  const {
    name,
    sku,
    brand,
    category,
    district,
    state,
    page = "1",
    limit = "10",
  } = query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    !Number.isInteger(limitNumber) ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    const error = new Error(
      "Page must be positive and limit must be between 1 and 100"
    );
    error.statusCode = 400;
    throw error;
  }

  const hasDistrict = Boolean(district?.trim());
  const hasState = Boolean(state?.trim());

  if (hasDistrict !== hasState) {
    const error = new Error(
      "Both district and state must be provided together"
    );
    error.statusCode = 400;
    throw error;
  }

  const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const productFilters = {};

  if (name?.trim()) {
    productFilters.name = {
      $regex: escapeRegex(name.trim()),
      $options: "i",
    };
  }

  if (sku?.trim()) {
    productFilters.sku = {
      $regex: escapeRegex(sku.trim()),
      $options: "i",
    };
  }

  if (brand?.trim()) {
    productFilters.brand = {
      $regex: escapeRegex(brand.trim()),
      $options: "i",
    };
  }

  if (category?.trim()) {
    productFilters.category = {
      $regex: escapeRegex(category.trim()),
      $options: "i",
    };
  }

  const visibilityRules = [
    {
      "enterprise.category": "type3",
    },
  ];

  if (hasDistrict && hasState) {
    visibilityRules.push({
      "enterprise.category": {
        $in: ["type1", "type2"],
      },
      "enterprise.location.district": {
        $regex: `^${escapeRegex(district.trim())}$`,
        $options: "i",
      },
      "enterprise.location.state": {
        $regex: `^${escapeRegex(state.trim())}$`,
        $options: "i",
      },
    });
  }

  const skip = (pageNumber - 1) * limitNumber;

  const pipeline = [
    {
      $match: productFilters,
    },
    {
      $lookup: {
        from: "enterprises",
        localField: "enterpriseId",
        foreignField: "_id",
        as: "enterprise",
      },
    },
    {
      $unwind: "$enterprise",
    },
    {
      $match: {
        $or: visibilityRules,
      },
    },
    {
      $facet: {
        products: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNumber },
          {
            $project: {
              enterprise: 0,
              __v: 0,
            },
          },
        ],
        metadata: [{ $count: "total" }],
      },
    },
  ];

  const [result] = await Product.aggregate(pipeline);

  const products = result?.products || [];
  const total = result?.metadata?.[0]?.total || 0;

  return {
    products,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: skip + products.length < total,
      hasPreviousPage: pageNumber > 1,
    },
  };
}

export async function getProductById(productId) {
  await connectDB();

  if (!mongoose.isValidObjectId(productId)) {
    return null;
  }

  return Product.findOne({
    _id: productId
  });
}

export async function updateProduct(productId, enterpriseId, body) {
  await connectDB();

  if (!mongoose.isValidObjectId(productId)) {
    return null;
  }

  const validatedData = productUpdateSchemaValidator.parse(body);

  return Product.findOneAndUpdate(
    {
      _id: productId,
      enterpriseId,
    },
    {
      $set: validatedData,
    },
    {
      new: true,
      runValidators: true,
    }
  );
}

export async function deleteProduct(productId, enterpriseId) {
  await connectDB();

  if (!mongoose.isValidObjectId(productId)) {
    return null;
  }

  return Product.findOneAndDelete({
    _id: productId,
    enterpriseId,
  });
}
