import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

const STAGE = process.env.STAGE ?? "local";
const isLocal = STAGE === "local";

const lambdaClient = new LambdaClient(
    isLocal ? { endpoint: "http://localhost:4566" } : {}
)

interface InvokeResult<T =unknown> {
    statusCode: number;
    body: T;
}


export async function invokeLambda<T = unknown>(
    functionName: string,
    event:object
): Promise<InvokeResult<T>>{
    const res = await lambdaClient.send(
        new InvokeCommand({
            FunctionName: functionName,
            Payload: Buffer.from(JSON.stringify(event)),
        })
    );

    if(res.FunctionError){
        throw new Error(`Lambda invoke error [${functionName}]: ${res.FunctionError}`)
    }

    const result = JSON.parse(
        Buffer.from(res.Payload!).toString()
    ) as { statusCode: number; body: string };

    return {
        statusCode: result.statusCode,
        body: result.body ? JSON.parse(result.body) as T : (null as T)
    }
}

export const productFn = (name: string) => `taller-${STAGE}-Products-${name}`