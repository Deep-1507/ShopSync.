import { signup } from "../../../../../controllers/enterpriseController";

export async function POST(request) {
  return signup(request);
}
