import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

const CORS_HEADERS = [
    "Conten-Type",
    "Authorization",
    "X-Api-Key",
    "X-Amz-Date",
    "X-Amz-Security-Token"
].join(",");

export function withCors(handler: Handler): Handler {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>{
        const allowedOrigins = (process.env.CORS_ORIGINS ?? "").split(",").map((o)=> o.trim()).filter(Boolean)

        const origin = event.headers?.origin ?? event.headers?.Origin ?? "";
        const allowedOrigin = allowedOrigins.includes(origin) ? origin : "";

        const result = await handler (event);

        return {
            ...result,
            headers: {
                ...result.headers,
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Headers": CORS_HEADERS,
                "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            }
        }
    }
}
