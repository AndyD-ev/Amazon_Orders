import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { internalError, ok, notFound, forbidden} from "../lib/response";
import { GetCommand  } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { withCors } from "../common/cors";

const ORDERS_TABLE = process.env.ORDERS_TABLE!;


async function listOrdersBySellerHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const userId = event.pathParameters?.userId;
        const callerId = event.requestContext.authorizer?.userId as string;

        if(userId !== callerId){
            return forbidden("Solo puedes listar tus propias ordenes.")
        }

        const result = await dynamo.send(
            new QueryCommand({
                TableName: ORDERS_TABLE,
                IndexName: "UserOrdersIndex",
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: { ":userId" : userId},
                // Conseguir mas recientes primero DESC
                ScanIndexForward: false
            })
        )
        return ok({ order: result.Items ?? [] })
    } catch (error) {
        console.error("Error en listOrdersByUserId: ", error);
        return internalError()
    }
}

export const listOrdersBySeller = withCors(listOrdersBySellerHandler);