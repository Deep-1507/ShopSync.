import authMiddleware from "../../../../../middlewares/authMiddleware";
import enterpriseAuthMiddleware from "../../../../../middlewares/enterpriseAuthMiddleware";
import { getOrderByBillController } from "../../../../../controllers/orderController";

export async function GET(request, { params }) {
  const { billNumber } = await params;

  // Check customer token
  const customerAuth = await authMiddleware(request);

  if (!customerAuth?.response && customerAuth?.user?.userId) {
    return getOrderByBillController(billNumber, {
      userId: customerAuth.user.userId,
    });
  }

  // Check enterprise token
  const enterpriseAuth = await enterpriseAuthMiddleware(request);

  if (
    !enterpriseAuth?.response &&
    enterpriseAuth?.enterpriseId
  ) {
    return getOrderByBillController(billNumber, {
      enterpriseId: enterpriseAuth.enterpriseId,
    });
  }

  // Neither token was valid
  return (
    customerAuth?.response ||
    enterpriseAuth?.response ||
    Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  );
}