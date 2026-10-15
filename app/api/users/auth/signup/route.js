import { signup } from "../../../../../controllers/userController";

export async function POST(request) {
  return signup(request);
}
