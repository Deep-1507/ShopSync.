import {
    listProducts,
} from "../../../../../controllers/productController";

export async function GET(request, { params }) {

    const { id } = await params;
    return listProducts(id);
}
