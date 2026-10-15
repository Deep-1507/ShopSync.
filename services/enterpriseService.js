import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Enterprise from "../models/Enterprise";
import {connectDB} from "../lib/mongodb";
import {
  enterpriseSignupValidator,
  enterpriseSigninValidator,
  enterpriseUpdateValidator,
} from "../validators/enterpriseValidator";

export async function registerEnterprise(body) {
  await connectDB();

  const data = enterpriseSignupValidator.parse(body);

  const existing = await Enterprise.findOne({
    $or: [{ email: data.email }, { phone: data.phone }],
  });

  if (existing) {
    const error = new Error(
      existing.email === data.email
        ? "Email already registered"
        : "Phone number already registered"
    );
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  try {
    return await Enterprise.create({
      ...data,
      password: hashedPassword,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern ?? {})[0];
      const duplicateError = new Error(
        duplicateField === "email"
          ? "Email already registered"
          : "Phone number already registered"
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
}

export async function authenticateEnterprise(body) {
  await connectDB();

  const data = enterpriseSigninValidator.parse(body);

  console.log(data)

  const enterprise = await Enterprise.findOne({
    email: data.email,
  }).select("+password");

  if (
    !enterprise ||
    !(await bcrypt.compare(data.password, enterprise.password))
  ) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return enterprise;
}

// export async function getEnterpriseById(enterpriseId) {
//   await connectDB();

//   if (!mongoose.isValidObjectId(enterpriseId)) {
//     const error = new Error("Invalid enterprise ID");
//     error.statusCode = 400;
//     throw error;
//   }

//   const enterprise = await Enterprise.findById(enterpriseId);

//   if (!enterprise) {
//     const error = new Error("Enterprise not found");
//     error.statusCode = 404;
//     throw error;
//   }

//   return enterprise;
// }

export async function updateEnterprise(enterpriseId, body) {
  await connectDB();

  if (!mongoose.isValidObjectId(enterpriseId)) {
    const error = new Error("Invalid enterprise ID");
    error.statusCode = 400;
    throw error;
  }

  const data = enterpriseUpdateValidator.parse(body);

  if (data.email || data.phone) {
    const conditions = [];

    if (data.email) conditions.push({ email: data.email });
    if (data.phone) conditions.push({ phone: data.phone });

    const existing = await Enterprise.findOne({
      _id: { $ne: enterpriseId },
      $or: conditions,
    });

    if (existing) {
      const error = new Error(
        data.email && existing.email === data.email
          ? "Email already registered"
          : "Phone number already registered"
      );
      error.statusCode = 409;
      throw error;
    }
  }

  try {
    const enterprise = await Enterprise.findByIdAndUpdate(
      enterpriseId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!enterprise) {
      const error = new Error("Enterprise not found");
      error.statusCode = 404;
      throw error;
    }

    return enterprise;
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern ?? {})[0];
      const duplicateError = new Error(
        duplicateField === "email"
          ? "Email already registered"
          : "Phone number already registered"
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
}

export async function deleteEnterprise(enterpriseId) {
  await connectDB();

  if (!mongoose.isValidObjectId(enterpriseId)) {
    const error = new Error("Invalid enterprise ID");
    error.statusCode = 400;
    throw error;
  }

  const enterprise = await Enterprise.findByIdAndDelete(enterpriseId);

  if (!enterprise) {
    const error = new Error("Enterprise not found");
    error.statusCode = 404;
    throw error;
  }

  return enterprise;
}

export async function getEnterpriseById(enterpriseId) {
  await connectDB();

  if (!mongoose.isValidObjectId(enterpriseId)) {
    const error = new Error("Invalid enterprise ID");
    error.statusCode = 400;
    throw error;
  }

  const enterprise = await Enterprise.findById(enterpriseId).select(
    "-password"
  );

  if (!enterprise) {
    const error = new Error("Enterprise not found");
    error.statusCode = 404;
    throw error;
  }

  return enterprise;
}


export async function searchEnterprises(query) {
    await connectDB();

    const {
        name,
        enterpriseName,
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

    const allowedCategories = ["type1", "type2", "type3"];

    if (category && !allowedCategories.includes(category)) {
        const error = new Error(
            "Category must be type1, type2, or type3"
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

    const filters = {};

    if (name?.trim()) {
        filters.name = {
            $regex: escapeRegex(name.trim()),
            $options: "i",
        };
    }

    if (enterpriseName?.trim()) {
        filters.enterpriseName = {
            $regex: escapeRegex(enterpriseName.trim()),
            $options: "i",
        };
    }

    // Optional category selection.
    if (category) {
        filters.category = category;
    }

    // Type 3 is visible everywhere.
    // Types 1 and 2 are visible only in the matching district and state.
    const visibilityRules = [];

    if (!category || category === "type3") {
        visibilityRules.push({
            category: "type3",
        });
    }

    if (
        (!category || category === "type1" || category === "type2") &&
        hasDistrict &&
        hasState
    ) {
        visibilityRules.push({
            category: category
                ? category
                : { $in: ["type1", "type2"] },
            "location.district": {
                $regex: `^${escapeRegex(district.trim())}$`,
                $options: "i",
            },
            "location.state": {
                $regex: `^${escapeRegex(state.trim())}$`,
                $options: "i",
            },
        });
    }

    // If no eligible visibility rule exists, return no results.
    if (visibilityRules.length === 0) {
        return {
            enterprises: [],
            pagination: {
                total: 0,
                page: pageNumber,
                limit: limitNumber,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: pageNumber > 1,
            },
        };
    }

    filters.$or = visibilityRules;

    const skip = (pageNumber - 1) * limitNumber;

    const [enterprises, total] = await Promise.all([
        Enterprise.find(filters)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNumber)
            .lean(),

        Enterprise.countDocuments(filters),
    ]);

    return {
        enterprises,
        pagination: {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
            hasNextPage: skip + enterprises.length < total,
            hasPreviousPage: pageNumber > 1,
        },
    };
}