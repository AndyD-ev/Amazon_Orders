import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { internalError, ok, notFound, forbidden, badRequest } from "../lib/response";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { Order } from "../types/order";
import { invokeLambda, productFn } from "../lib/lambdaInvoke";
import { withCors } from "../common/cors";

const ORDERS_TABLE = process.env.ORDERS_TABLE!;


async function confirmOrderHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const orderId = event.pathParameters?.id;

        if (!orderId) {
            return notFound("La orden no se pudo encontrar.")
        }

        const callerId = event.requestContext.authorizer?.userId as string;

        const existing = await dynamo.send(
            new GetCommand({ TableName: ORDERS_TABLE, Key: { orderId } })
        )

        if (!existing.Item) {
            return notFound("La orden no se pudo encontrar.")
        }

        const order = existing.Item as Order;

        // Validar que solo se puedan confirmar ordenes en estado de pending
        if (order.status !== "pending"){
            return badRequest(`No se puede confirmar una orden con el status ${order.status}`);
        }

        // Solo un vendedor con productos en la orden puede confirmarla
        const res = await invokeLambda<{ products: Array<{ productId: string }> }> (
            productFn("ListProductsBySeller"),
            { pathParameters: { sellerId: callerId } }
        );

        const sellerProductIds = new Set(
            res.statusCode === 200 ? res.body.products.map((p) => p.productId) : []
        );

        const isSeller = order.items.some((i) => sellerProductIds.has(i.productId));

        if(!isSeller){
            return forbidden("Solo un vendedor con productos en esta order puede confirmarla.")
        }

        await dynamo.send(
            new UpdateCommand({
                TableName:ORDERS_TABLE,
                Key: { orderId },
                UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
                ExpressionAttributeNames: { "#status" : "status" },
                ExpressionAttributeValues :{
                    ":status": "confirmed",
                    ":updatedAt": new Date().toISOString()
                }
            })
        )

        return ok({ message: "Orden confirmada." })
    } catch (error) {
        console.error("Error en getOrder: ", error);
        return internalError()
    }
}
export const confirmOrder = withCors(confirmOrderHandler);
