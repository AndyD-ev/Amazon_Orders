import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const isLocal = process.env.STAGE === "local";

const client = new DynamoDBClient(
    isLocal ? { endpoint: "http://localhost:4566", region: "us-east-1" } : 
    {}
)

export const dynamo = DynamoDBDocumentClient.from(client)

