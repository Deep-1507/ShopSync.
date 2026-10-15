import { NextResponse } from "next/server";
import { enterpriseAuthMiddleware } from "../../../middlewares/enterpriseAuthMiddleware";
import {
    readEnterprise, editEnterprise,
    removeEnterprise,
} from "@/controllers/enterpriseController";

export async function GET(request) {
    try {
        const enterpriseAuth = await enterpriseAuthMiddleware(request);

        // Return authentication errors.
        if (enterpriseAuth instanceof NextResponse) {
            return enterpriseAuth;
        }

        const { enterpriseId } = enterpriseAuth;

        // Use the enterprise ID from the verified token.
        return await readEnterprise(enterpriseId, enterpriseId);
    } catch (error) {
        console.error("Get enterprise error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch enterprise",
            },
            { status: error.statusCode || 500 }
        );
    }
}

// UPDATE ENTERPRISE
export async function PATCH(request) {
    try {
        const enterpriseAuth = await enterpriseAuthMiddleware(request);

        if (enterpriseAuth instanceof NextResponse) {
            return enterpriseAuth;
        }

        const { enterpriseId } = enterpriseAuth;

        return await editEnterprise(request, enterpriseId);
    } catch (error) {
        console.error("Update enterprise error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to update enterprise",
            },
            { status: 500 }
        );
    }
}

// DELETE ENTERPRISE
export async function DELETE(request) {
    try {
        const enterpriseAuth = await enterpriseAuthMiddleware(request);

        if (enterpriseAuth instanceof NextResponse) {
            return enterpriseAuth;
        }

        const { enterpriseId } = enterpriseAuth;

        return await removeEnterprise(enterpriseId);
    } catch (error) {
        console.error("Delete enterprise error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to delete enterprise",
            },
            { status: 500 }
        );
    }
}