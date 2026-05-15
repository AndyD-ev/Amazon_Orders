import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { forbidden, internalError, ok } from "../lib/response";
import { withCors } from "../common/cors";

const ORDERS_TABLE = process.env.ORDERS_TABLE!;

async function listOrdersHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.userId;
    const callerId = event.requestContext.authorizer?.userId as string;

    // Solo el propio usuario puede listar sus órdenes
    if (userId !== callerId) {
      return forbidden("You can only list your own orders");
    }

    const result = await dynamo.send(
      new QueryCommand({
        TableName: ORDERS_TABLE,
        IndexName: "UserOrdersIndex",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": userId },
        // Más recientes primero
        ScanIndexForward: false,
      })
    );

    return ok({ orders: result.Items ?? [] });
  } catch (err) {
    console.error("listOrders error:", err);
    return internalError();
  }
}

export const listOrders = withCors(listOrdersHandler);