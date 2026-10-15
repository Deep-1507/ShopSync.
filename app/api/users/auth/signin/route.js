import { signin } from "../../../../../controllers/userController";

export async function POST(request) {
  return signin(request);
}
