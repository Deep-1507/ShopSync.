import { signin } from "../../../../../controllers/enterpriseController";

export async function POST(request) {
  return signin(request);
}
