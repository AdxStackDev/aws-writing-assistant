import json
import os
from datetime import datetime, timezone

import boto3


REGION = os.environ.get(
    "AWS_REGION",
    "ap-south-1"
)

USERS_TABLE = os.environ["USERS_TABLE"]

dynamodb = boto3.resource(
    "dynamodb",
    region_name=REGION
)

users_table = dynamodb.Table(
    USERS_TABLE
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


def get_claims(event):
    return (
        event["requestContext"]
        ["authorizer"]
        ["jwt"]
        ["claims"]
    )


def lambda_handler(event, context):

    try:

        claims = get_claims(event)

        user_id = claims["sub"]

        method = event["requestContext"]["http"]["method"]

        if method == "GET":

            result = users_table.get_item(
                Key={
                    "user_id": user_id
                }
            )

            item = result.get(
                "Item",
                {
                    "user_id": user_id,
                    "email": claims.get("email"),
                }
            )

            return response(
                200,
                item
            )

        if method == "PUT":

            body = json.loads(
                event.get("body") or "{}"
            )

            display_name = (
                body.get("display_name", "")
                .strip()
            )

            now = datetime.now(
                timezone.utc
            ).isoformat()

            users_table.update_item(
                Key={
                    "user_id": user_id
                },
                UpdateExpression="""
                    SET display_name = :display_name,
                        email = :email,
                        updated_at = :updated_at
                """,
                ExpressionAttributeValues={
                    ":display_name": display_name,
                    ":email": claims.get("email"),
                    ":updated_at": now,
                },
            )

            return response(
                200,
                {
                    "message": "Profile updated"
                }
            )

        return response(
            405,
            {
                "error": "Method not allowed"
            }
        )

    except Exception as exc:

        print(
            f"ERROR: {type(exc).__name__}: {exc}"
        )

        return response(
            500,
            {
                "error": "Unable to process profile"
            }
        )