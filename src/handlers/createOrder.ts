import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { badRequest, internalError, create} from "../lib/response";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Order, OrderItem } from "../types/order";
import { invokeLambda, productFn } from "../lib/lambdaInvoke";
import { withCors } from "../common/cors";

const ORDERS_TABLE = process.env.ORDERS_TABLE!;


async function fetchProduct(
    productId: string
): Promise<{ productId: string; price: number; stock: number; name: string } | null> {
    try {
        const res = await invokeLambda<{ product: { productId: string; price: number; stock: number; name: string } }>(
            productFn("GetProduct"),
            { pathParameters: { id: productId } }
        );
        if (res.statusCode !== 200) return null;
        return res.body.product;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function decrementStock(productId: string, quantity: number): Promise<boolean> {
    try {
        const res = await invokeLambda(
            productFn("UpdateStock"),
            { pathParameters: { id: productId }, body: JSON.stringify({ quantity }) }
        )
        return res.statusCode === 200;
    } catch (error) {
        return false
    }
}

async function createOrderHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const userId = event.requestContext.authorizer?.userId as string;

        const body = JSON.parse(event.body ?? "{}");
        const { items } = body as { items?: Array<{ productId: string; quantity: number }> }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return badRequest("Items es requerido para poder hacer la orden.")
        }

        for (const item of items) {
            if (!item.productId || typeof item.quantity !== "number" || item.quantity < 1 || !Number.isInteger(item.quantity)) {
                return badRequest("Los items no cumples con las validaciones para ser ordenados.")
            }
        }

        const resolvedItems: OrderItem[] = [];

        for (const item of items) {
            const product = await fetchProduct(item.productId);
            if (!product) {
                return badRequest(`El producto ${item.productId} no existe.`);
            }

            if (product.stock < item.quantity) {
                return badRequest(
                    `Insuficiente producto para el item ${product.name}. Solo hay disponibles ${product.stock}`
                )
            }

            resolvedItems.push({
                productId: item.productId,
                quantity: item.quantity,
                price: product.price // capturar el precio actual del producto.
            })
        }

        const total = resolvedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

        const now = new Date().toISOString();

        const order: Order = {
            orderId: uuidv4(),
            userId,
            items: resolvedItems,
            total,
            status: "pending",
            createdAt: now,
            updatedAt: now
        }

        await dynamo.send(
            new PutCommand({
                TableName: ORDERS_TABLE,
                Item: order
            })
        )

        // Descontar el stock en el producto

        const decremented: OrderItem[] = [];

        for (const item of resolvedItems) {
            const success = await decrementStock(item.productId, item.quantity);
            if (!success) {
                console.error(`Fallo al decrementar el stock para el producto. ${item.productId}`);

                await dynamo.send(
                    new UpdateCommand({
                        TableName: ORDERS_TABLE,
                        Key: { orderId: order.orderId },
                        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
                        ExpressionAttributeNames: { "#status": "status" },
                        ExpressionAttributeValues: {
                            ":status": "canceled",
                            ":updatedAt": new Date().toISOString(),
                        }
                    })
                )
                return internalError("No se pudo reservar el stock para uno o mas productos, la orden ha sido cancelada.");
            }

            decremented.push(item);
        }

        return create({order})
    } catch (error) {
        console.error("Error en getUser: ", error);
        return internalError()
    }
}

export const createOrder = withCors(createOrderHandler);