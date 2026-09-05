import json
import os

import boto3


REGION = os.environ.get(
    "AWS_REGION",
    "ap-south-1"
)

MESSAGES_TABLE = os.environ["MESSAGES_TABLE"]
CONVERSATIONS_TABLE = os.environ["CONVERSATIONS_TABLE"]

dynamodb = boto3.resource(
    "dynamodb",
    region_name=REGION
)

messages_table = dynamodb.Table(
    MESSAGES_TABLE
)

conversations_table = dynamodb.Table(
    CONVERSATIONS_TABLE
)


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }


def get_user_id(event):
    return (
        event["requestContext"]
        ["authorizer"]
        ["jwt"]
        ["claims"]
        ["sub"]
    )


def lambda_handler(event, context):

    try:

        user_id = get_user_id(event)

        path_parameters = (
            event.get("pathParameters")
            or {}
        )

        conversation_id = path_parameters.get(
            "conversation_id"
        )

        if conversation_id:

            conversation = (
                conversations_table.get_item(
                    Key={
                        "user_id": user_id,
                        "conversation_id": conversation_id,
                    }
                )
            )

            if "Item" not in conversation:
                return response(
                    404,
                    {"error": "Conversation not found"}
                )

            result = messages_table.query(
                KeyConditionExpression=(
                    "conversation_id = :conversation_id"
                ),
                ExpressionAttributeValues={
                    ":conversation_id": conversation_id
                },
                ScanIndexForward=True,
            )

            return response(
                200,
                {
                    "conversation": conversation["Item"],
                    "messages": result.get(
                        "Items",
                        []
                    ),
                }
            )

        result = conversations_table.query(
            KeyConditionExpression=(
                "user_id = :user_id"
            ),
            ExpressionAttributeValues={
                ":user_id": user_id
            },
            ScanIndexForward=False,
        )

        return response(
            200,
            {
                "conversations": result.get(
                    "Items",
                    []
                )
            }
        )

    except Exception as exc:

        print(
            f"ERROR: {type(exc).__name__}: {exc}"
        )

        return response(
            500,
            {
                "error": "Unable to retrieve history"
            }
        )