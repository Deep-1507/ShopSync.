
import authMiddleware from "../../../../middlewares/authMiddleware";
import enterpriseAuthMiddleware from "../../../../middlewares/enterpriseAuthMiddleware";
import {
  getOrderController,
  updateOrderController,
  deleteOrderController,
} from "../../../../controllers/orderController";

export async function GET(request, { params }) {
  const { id } = await params;

  const customerAuth = await authMiddleware(request);

  if (!customerAuth.response) {
    return getOrderController(id, { userId: customerAuth.user.userId });
  }

  const enterpriseAuth = await enterpriseAuthMiddleware(request);

  if (!enterpriseAuth.response) {
    return getOrderController(id, {
      enterpriseId: enterpriseAuth.user.enterpriseId,
    });
  }

  return customerAuth.response;
}

export async function PATCH(request, { params }) {
  const { user, response } = await enterpriseAuthMiddleware(request);
  if (response) return response;

  const { id } = await params;

  return updateOrderController(request, id, user.enterpriseId);
}

export async function DELETE(request, { params }) {
  const { user, response } = await authMiddleware(request);
  if (response) return response;

  const { id } = await params;

  return deleteOrderController(id, user.userId);
}
