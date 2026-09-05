import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

from tools.writing_tools import analyze_text

MODEL_ID = os.environ["BEDROCK_MODEL_ID"]
CONVERSATIONS_TABLE = os.environ["CONVERSATIONS_TABLE"]
MESSAGES_TABLE = os.environ["MESSAGES_TABLE"]
MAX_CHARS = 8000

bedrock = boto3.client("bedrock-runtime")
dynamodb = boto3.resource("dynamodb")
conversations = dynamodb.Table(CONVERSATIONS_TABLE)
messages = dynamodb.Table(MESSAGES_TABLE)


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def to_ddb(value):
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: to_ddb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_ddb(v) for v in value]
    return value


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def user_id_from(event):
    user_id = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
        .get("sub")
    )
    if not user_id:
        raise ValueError("Authenticated user not found")
    return user_id


def parse_body(event):
    raw = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        import base64
        raw = base64.b64decode(raw).decode("utf-8")
    try:
        body = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON body") from exc
    if not isinstance(body, dict):
        raise ValueError("JSON object required")
    return body


def get_conversation(user_id, conversation_id):
    result = conversations.get_item(
        Key={"user_id": user_id, "conversation_id": conversation_id}
    )
    return result.get("Item")


def invoke_bedrock(user_message, analysis):
    system_prompt = (
        "You are a writing assistant. Use the provided deterministic "
        "measurements. Do not invent counts. Give specific edits."
    )
    user_prompt = (
        "WRITING:\n"
        f"{user_message}\n\n"
        "DETERMINISTIC ANALYSIS:\n"
        f"{json.dumps(analysis)}\n\n"
        "Return useful feedback."
    )
    result = bedrock.converse(
        modelId=MODEL_ID,
        system=[{"text": system_prompt}],
        messages=[
            {"role": "user", "content": [{"text": user_prompt}]},
        ],
        inferenceConfig={"maxTokens": 1200, "temperature": 0.2},
    )
    return result["output"]["message"]["content"][0]["text"]


def post_chat(event, user_id):
    body = parse_body(event)
    message = (body.get("message") or "").strip()
    if not message:
        return respond(400, {"error": "message is required"})
    if len(message) > MAX_CHARS:
        return respond(400, {"error": f"message exceeds {MAX_CHARS} characters"})

    conversation_id = body.get("conversation_id")
    timestamp = now_iso()

    if conversation_id:
        existing = get_conversation(user_id, conversation_id)
        if not existing:
            return respond(404, {"error": "Conversation not found"})
        conversations.update_item(
            Key={"user_id": user_id, "conversation_id": conversation_id},
            UpdateExpression="SET updated_at = :updated_at",
            ExpressionAttributeValues={":updated_at": timestamp},
        )
    else:
        conversation_id = str(uuid.uuid4())
        conversations.put_item(
            Item={
                "user_id": user_id,
                "conversation_id": conversation_id,
                "title": message[:80],
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        )

    analysis = analyze_text(message)
    message_id = f"{timestamp}#{uuid.uuid4()}"
    messages.put_item(
        Item=to_ddb(
            {
                "conversation_id": conversation_id,
                "message_id": message_id,
                "role": "user",
                "content": message,
                "created_at": timestamp,
                "analysis": analysis,
            }
        )
    )

    try:
        ai_text = invoke_bedrock(message, analysis)
    except ClientError as exc:
        print(f"BEDROCK {exc}")
        return respond(502, {"error": "Model invocation failed"})

    assistant_at = now_iso()
    messages.put_item(
        Item={
            "conversation_id": conversation_id,
            "message_id": f"{assistant_at}#{uuid.uuid4()}",
            "role": "assistant",
            "content": ai_text,
            "created_at": assistant_at,
        }
    )

    return respond(
        200,
        {
            "conversation_id": conversation_id,
            "message": ai_text,
            "analysis": analysis,
        },
    )


def list_conversations(user_id):
    result = conversations.query(
        KeyConditionExpression="user_id = :user_id",
        ExpressionAttributeValues={":user_id": user_id},
    )
    items = result.get("Items", [])
    items.sort(key=lambda item: item.get("updated_at", ""), reverse=True)
    return respond(200, {"conversations": items})


def get_history(event, user_id):
    conversation_id = (event.get("pathParameters") or {}).get("conversation_id")
    if not conversation_id:
        return respond(400, {"error": "conversation_id is required"})
    existing = get_conversation(user_id, conversation_id)
    if not existing:
        return respond(404, {"error": "Conversation not found"})
    result = messages.query(
        KeyConditionExpression="conversation_id = :conversation_id",
        ExpressionAttributeValues={":conversation_id": conversation_id},
        ScanIndexForward=True,
    )
    return respond(
        200,
        {
            "conversation": existing,
            "messages": result.get("Items", []),
        },
    )


def lambda_handler(event, _context):
    try:
        user_id = user_id_from(event)
        route = event.get("routeKey", "")
        if route == "POST /chat":
            return post_chat(event, user_id)
        if route == "GET /conversations":
            return list_conversations(user_id)
        if route == "GET /conversations/{conversation_id}":
            return get_history(event, user_id)
        return respond(404, {"error": "Not found"})
    except ValueError as exc:
        return respond(400, {"error": str(exc)})
    except Exception as exc:
        print(f"ERROR {type(exc).__name__}: {exc}")
        return respond(500, {"error": "Unable to process request"})
