import {userAuthMiddleware} from "../../../../../middlewares/userAuthMiddleware";
import {enterpriseAuthMiddleware} from "../../../../../middlewares/enterpriseAuthMiddleware";
import { listOrdersController } from "../../../../../controllers/orderController";

export async function GET(request, { params }) {
  const { customerId } = await params;
  const { searchParams } = new URL(request.url);

  // Check customer authentication
  const customerAuth = await authMiddleware(request);

  if (!customerAuth?.response && customerAuth?.user?.userId) {
    if (customerAuth.user.userId !== customerId) {
      return Response.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    return listOrdersController(
      { customerId },
      searchParams.get("page") || "1",
      searchParams.get("limit") || "10"
    );
  }

  // If customer authentication fails, check enterprise authentication
  const enterpriseAuth = await enterpriseAuthMiddleware(request);

  if (
    !enterpriseAuth?.response &&
    enterpriseAuth?.user?.enterpriseId
  ) {
    return listOrdersController(
      {
        customerId,
        enterpriseId: enterpriseAuth.user.enterpriseId,
      },
      searchParams.get("page") || "1",
      searchParams.get("limit") || "10"
    );
  }

  // Both authentications failed
  return (
    customerAuth?.response ||
    enterpriseAuth?.response ||
    Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  );
}