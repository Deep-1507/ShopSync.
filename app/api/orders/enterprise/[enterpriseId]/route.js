import {userAuthMiddleware} from "../../../../../middlewares/userAuthMiddleware";
import {enterpriseAuthMiddleware} from "../../../../../middlewares/enterpriseAuthMiddleware";
import { listOrdersController } from "../../../../../controllers/orderController";

export async function GET(request, { params }) {
  const { enterpriseId } = await params;
  const { searchParams } = new URL(request.url);

  // Check enterprise authentication first
  const enterpriseAuth = await enterpriseAuthMiddleware(request);

  if (
    !enterpriseAuth?.response &&
    enterpriseAuth?.enterpriseId
  ) {
    if (enterpriseAuth.enterpriseId !== enterpriseId) {
      return Response.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    return listOrdersController(
      { enterpriseId },
      searchParams.get("page") || "1",
      searchParams.get("limit") || "10"
    );
  }

  // If enterprise authentication fails, check customer authentication
  // const customerAuth = await userAuthMiddleware(request);

  // if (!customerAuth?.response && customerAuth?.user?.userId) {
  //   return listOrdersController(
  //     {
  //       enterpriseId,
  //       customerId: customerAuth.user.userId,
  //     },
  //     searchParams.get("page") || "1",
  //     searchParams.get("limit") || "10"
  //   );
  // }

  // Both authentications failed
  return (
    enterpriseAuth?.response ||
    // customerAuth?.response ||
    Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    )
  );
}