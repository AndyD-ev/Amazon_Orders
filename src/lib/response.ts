import { APIGatewayProxyResult } from "aws-lambda";

export const ok = (data: unknown): APIGatewayProxyResult => ({
    statusCode: 200,
    body: JSON.stringify(data)
})

export const create = (data: unknown): APIGatewayProxyResult => ({
    statusCode: 201,
    body: JSON.stringify(data)
})

export const badRequest = (message: string): APIGatewayProxyResult => ({
    statusCode: 400,
    body: JSON.stringify({message})
})

export const unauthorized = (message = "Unauthorized"): APIGatewayProxyResult =>({
    statusCode: 401, 
    body: JSON.stringify({message})
})

export const notFound = (message = "Not found"): APIGatewayProxyResult =>({
    statusCode: 404, 
    body: JSON.stringify({message})
})

export const internalError = (message = "Internal Server Error"): APIGatewayProxyResult =>({
    statusCode: 500, 
    body: JSON.stringify({message})
})

export const forbidden = (message = "Forbidden"): APIGatewayProxyResult =>({
    statusCode: 403, 
    body: JSON.stringify({message})
})