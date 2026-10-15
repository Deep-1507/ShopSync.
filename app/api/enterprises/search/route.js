
import { searchEnterprisesController } from "../../../../controllers/enterpriseController";

export async function GET(request) {
  return searchEnterprisesController(request);
}
