# AWS Bedrock Writing Assistant — Complete Build

We will build the application from scratch using the exact choices you specified:

* **Frontend:** React.js + TypeScript + Vite
* **Backend:** Python AWS Lambda
* **Authentication:** Amazon Cognito
* **LLM:** Z.AI **GLM 5** through Amazon Bedrock
* **Region:** `ap-south-1` Mumbai
* **API:** API Gateway HTTP API
* **Database:** DynamoDB
* **Async:** SQS
* **Notifications:** SNS
* **Monitoring:** CloudWatch
* **Infrastructure:** Terraform
* **Frontend hosting:** S3 + CloudFront
* **CI/CD:** GitHub Actions

The notebook is used only as the conceptual reference: its important pattern is **LLM + deterministic tools + agent/workflow + transparent results**. 

AWS currently documents `zai.glm-5` as the GLM 5 Bedrock model ID and lists **Mumbai (`ap-south-1`)** as an in-region supported location. AWS also recommends the `bedrock-runtime` endpoint for new applications. ([AWS Documentation][1])

---

# 1. What We Are Building

The application will be called:

```text
bedrock-writing-assistant
```

The user will be able to:

```text
Register
   ↓
Verify email
   ↓
Login
   ↓
Chat Dashboard
   ↓
Enter writing
   ↓
Ask GLM 5 for analysis
   ↓
Lambda
   ↓
Bedrock GLM 5
   ↓
Response
   ↓
DynamoDB
```

The assistant will retain the notebook's tool-driven concept.

For example:

```text
User:
Review my writing.

        ↓

GLM 5
        ↓
Decides which analysis is useful
        ↓
Python tools
        ├── word_count
        ├── readability_score
        ├── find_weak_words
        ├── find_long_sentences
        └── find_repeated_words
        ↓
GLM 5 interprets results
        ↓
Final feedback
```

The important difference is that these tools will now run **inside the AWS Lambda backend**, rather than through a local MCP server.

The original notebook specifically describes these deterministic tools and the agent's use of their measurements. 

---

# 2. Final AWS Architecture

```text
                         INTERNET
                            │
                            ▼
                 ┌─────────────────────┐
                 │     CloudFront      │
                 │                     │
                 │ React Application   │
                 └──────────┬──────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │      S3       │
                    │ React static  │
                    │ files         │
                    └───────────────┘


React Application
       │
       │ Cognito JWT
       ▼
┌────────────────────────────┐
│       API Gateway          │
│       HTTP API             │
│                            │
│ JWT Authorizer             │
└─────────────┬──────────────┘
              │
              ▼
       ┌─────────────┐
       │   Lambda    │
       │ Python      │
       └──────┬──────┘
              │
       ┌──────┼──────────────┐
       │      │              │
       ▼      ▼              ▼
   DynamoDB  Bedrock       SQS
            GLM 5           │
                            ▼
                       Worker Lambda
                            │
                            ▼
                           SNS
```

API Gateway can use Cognito-based authorization, and AWS documents API Gateway → Lambda → DynamoDB as a standard architecture. ([AWS Documentation][2])

---

# 3. Why We Are Using HTTP API

We could use:

```text
API Gateway REST API
```

or:

```text
API Gateway HTTP API
```

For this application we will use:

```text
API Gateway HTTP API
```

because we need a relatively simple JSON API.

Our endpoints:

```text
POST   /chat

GET    /conversations
GET    /conversations/{conversation_id}

GET    /profile
PUT    /profile
```

Authentication:

```text
Authorization: Bearer <Cognito JWT>
```

API Gateway validates the JWT before Lambda receives the request.

---

# 4. Project Directory

Create this structure:

```text
bedrock-writing-assistant/
│
├── README.md
├── .gitignore
├── .env.example
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts
│       ├── auth.ts
│       ├── types.ts
│       │
│       ├── components/
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── VerifyEmail.tsx
│       │   ├── Chat.tsx
│       │   ├── Sidebar.tsx
│       │   └── Account.tsx
│       │
│       └── styles/
│           └── app.css
│
├── backend/
│   │
│   ├── requirements.txt
│   │
│   ├── chat/
│   │   └── handler.py
│   │
│   ├── history/
│   │   └── handler.py
│   │
│   ├── profile/
│   │   └── handler.py
│   │
│   ├── notification_worker/
│   │   └── handler.py
│   │
│   └── tools/
│       ├── __init__.py
│       └── writing_tools.py
│
├── terraform/
│   │
│   ├── versions.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── main.tf
│   │
│   ├── cognito.tf
│   ├── dynamodb.tf
│   ├── iam.tf
│   ├── lambda.tf
│   ├── api_gateway.tf
│   ├── sqs.tf
│   ├── sns.tf
│   ├── s3.tf
│   ├── cloudfront.tf
│   │
│   └── environments/
│       └── dev.tfvars
│
└── .github/
    └── workflows/
        ├── terraform.yml
        └── frontend.yml
```

This is deliberately more structured than putting everything into one Lambda or one Terraform file.

---

# 5. Phase 1 — Prerequisites

Install the following on your Windows machine.

## Required

```text
Git
AWS CLI
Terraform
Node.js
npm
Python
```

Check:

```bash
git --version
aws --version
terraform version
node --version
npm --version
python --version
```

Recommended versions:

```text
Node.js 22+
Python 3.12+
Terraform 1.9+
AWS CLI v2
Git latest
```

---

# 6. Configure AWS CLI

Run:

```bash
aws configure
```

Enter:

```text
AWS Access Key ID:
AWS Secret Access Key:
Default region name:
Default output format:
```

Use:

```text
ap-south-1
```

For example:

```text
Default region name [None]: ap-south-1
Default output format [None]: json
```

Verify:

```bash
aws sts get-caller-identity
```

You should receive something similar to:

```json
{
  "UserId": "...",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/..."
}
```

---

# 7. Create the Project

Windows:

```bash
mkdir bedrock-writing-assistant
cd bedrock-writing-assistant
```

Initialize Git:

```bash
git init
```

Create folders:

```bash
mkdir frontend
mkdir backend
mkdir backend\chat
mkdir backend\history
mkdir backend\profile
mkdir backend\notification_worker
mkdir backend\tools
mkdir terraform
mkdir terraform\environments
mkdir .github
mkdir .github\workflows
```

---

# 8. `.gitignore`

Create:

```text
.gitignore
```

```gitignore
# Node
node_modules/
frontend/dist/

# Python
__pycache__/
*.pyc
.venv/
venv/

# Environment
.env
.env.*
!.env.example

# Terraform
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
crash.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

# 9. Terraform Provider

Create:

```text
terraform/versions.tf
```

```hcl
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}
```

Create:

```text
terraform/providers.tf
```

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

---

# 10. Terraform Variables

Create:

```text
terraform/variables.tf
```

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "bedrock-writing-assistant"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock model ID"
  type        = string
  default     = "zai.glm-5"
}
```

Create:

```text
terraform/environments/dev.tfvars
```

```hcl
aws_region       = "ap-south-1"
project_name     = "bedrock-writing-assistant"
environment      = "dev"
bedrock_model_id = "zai.glm-5"
```

---

# 11. Terraform Main

Create:

```text
terraform/main.tf
```

```hcl
locals {
  name_prefix = "${var.project_name}-${var.environment}"
}
```

This gives us names such as:

```text
bedrock-writing-assistant-dev
```

---

# 12. Cognito

Create:

```text
terraform/cognito.tf
```

```hcl
resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-users"

  username_attributes = ["email"]

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Verify your account"
    email_message        = "Your verification code is {####}"
  }

  account_recovery_setting {
    recovery_mechanisms {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${local.name_prefix}-frontend"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"
}
```

Output later:

```text
User Pool ID
Client ID
```

The React application will use these values.

---

# 13. DynamoDB Design

We will initially use three tables.

```text
Users
Conversations
Messages
```

Why separate tables?

Because it makes the application easier to understand and is useful for demonstrating DynamoDB design in interviews.

---

# 14. Users Table

Create:

```text
terraform/dynamodb.tf
```

```hcl
resource "aws_dynamodb_table" "users" {
  name         = "${local.name_prefix}-users"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = {
    Name = "${local.name_prefix}-users"
  }
}
```

---

# 15. Conversations Table

Add:

```hcl
resource "aws_dynamodb_table" "conversations" {
  name         = "${local.name_prefix}-conversations"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "user_id"
  range_key = "conversation_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "conversation_id"
    type = "S"
  }

  tags = {
    Name = "${local.name_prefix}-conversations"
  }
}
```

Conceptually:

```text
PK = user_id
SK = conversation_id
```

So:

```text
user-123
   conversation-1

user-123
   conversation-2

user-123
   conversation-3
```

---

# 16. Messages Table

```hcl
resource "aws_dynamodb_table" "messages" {
  name         = "${local.name_prefix}-messages"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "conversation_id"
  range_key = "created_at"

  attribute {
    name = "conversation_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  tags = {
    Name = "${local.name_prefix}-messages"
  }
}
```

Messages become:

```text
conversation_id
        +
created_at
```

This lets us retrieve messages chronologically.

---

# 17. SQS

We need asynchronous processing.

Create:

```text
terraform/sqs.tf
```

```hcl
resource "aws_sqs_queue" "notification_dlq" {
  name = "${local.name_prefix}-notification-dlq"
}

resource "aws_sqs_queue" "notification" {
  name = "${local.name_prefix}-notification"

  visibility_timeout_seconds = 60

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 3
  })
}
```

Architecture:

```text
Chat Lambda
     │
     ▼
    SQS
     │
     ├── success
     │
     └── 3 failures
             │
             ▼
           DLQ
```

This is important in production because asynchronous failures should not disappear silently.

---

# 18. SNS

Create:

```text
terraform/sns.tf
```

```hcl
resource "aws_sns_topic" "notifications" {
  name = "${local.name_prefix}-notifications"
}
```

SQS worker will publish events to SNS.

AWS supports Lambda integrations with both SQS and SNS, including Lambda processing SNS messages. ([AWS Documentation][3])

---

# 19. Writing Tools

Now we adapt the core idea from the notebook.

Create:

```text
backend/tools/writing_tools.py
```

```python
import re


WEAK_WORDS = {
    "very",
    "really",
    "just",
    "quite",
    "actually",
    "basically",
    "literally",
    "perhaps",
    "somewhat",
    "rather",
    "slightly",
    "things",
    "stuff",
    "a lot",
}


STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "of",
    "to",
    "in",
    "on",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "it",
    "that",
    "this",
    "for",
    "with",
    "as",
    "at",
    "by",
    "from",
    "i",
    "you",
    "we",
    "they",
    "he",
    "she",
    "his",
    "her",
    "our",
    "their",
    "my",
    "your",
}


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [part for part in parts if part]


def count_words(text: str) -> list[str]:
    return re.findall(r"\b\w+\b", text)


def word_count(text: str) -> dict:
    words = count_words(text)
    sentences = split_sentences(text)

    average = (
        round(len(words) / len(sentences), 1)
        if sentences
        else 0
    )

    return {
        "words": len(words),
        "sentences": len(sentences),
        "characters": len(text),
        "avg_sentence_length": average,
    }


def count_syllables(word: str) -> int:
    word = word.lower()

    if not word:
        return 0

    vowels = "aeiouy"
    count = 0
    previous_vowel = False

    for char in word:
        is_vowel = char in vowels

        if is_vowel and not previous_vowel:
            count += 1

        previous_vowel = is_vowel

    if word.endswith("e") and count > 1:
        count -= 1

    return max(count, 1)


def readability_score(text: str) -> dict:
    words = count_words(text)
    sentences = split_sentences(text)

    if not words or not sentences:
        return {
            "score": 0,
            "interpretation": "Not enough text to score.",
        }

    syllables = sum(
        count_syllables(word)
        for word in words
    )

    score = (
        206.835
        - 1.015 * (len(words) / len(sentences))
        - 84.6 * (syllables / len(words))
    )

    score = round(score, 1)

    if score >= 70:
        interpretation = "Easy to read."
    elif score >= 60:
        interpretation = "Plain English."
    elif score >= 50:
        interpretation = "Fairly difficult."
    elif score >= 30:
        interpretation = "Difficult."
    else:
        interpretation = "Very difficult."

    return {
        "score": score,
        "interpretation": interpretation,
    }


def find_weak_words(text: str) -> dict:
    words = re.findall(
        r"\b\w+\b",
        text.lower()
    )

    occurrences = {}

    for word in words:
        if word in WEAK_WORDS:
            occurrences[word] = (
                occurrences.get(word, 0) + 1
            )

    return {
        "count": sum(occurrences.values()),
        "occurrences": occurrences,
    }


def find_long_sentences(
    text: str,
    max_words: int = 25
) -> dict:

    flagged = []

    for sentence in split_sentences(text):
        word_total = len(count_words(sentence))

        if word_total > max_words:
            flagged.append({
                "sentence": sentence,
                "word_count": word_total,
            })

    return {
        "count": len(flagged),
        "sentences": flagged,
    }


def find_repeated_words(
    text: str,
    min_repeats: int = 3
) -> dict:

    words = re.findall(
        r"\b\w+\b",
        text.lower()
    )

    counts = {}

    for word in words:

        if word in STOPWORDS or len(word) < 3:
            continue

        counts[word] = counts.get(word, 0) + 1

    repeated = {
        word: count
        for word, count in counts.items()
        if count >= min_repeats
    }

    return {
        "count": len(repeated),
        "words": repeated,
    }


def analyze_text(text: str) -> dict:
    return {
        "word_count": word_count(text),
        "readability": readability_score(text),
        "weak_words": find_weak_words(text),
        "long_sentences": find_long_sentences(text),
        "repeated_words": find_repeated_words(text),
    }
```

This directly carries forward the notebook's deterministic analysis concept while adding the repeated-word tool from its exercise. 

---

# 20. Python Dependencies

Create:

```text
backend/requirements.txt
```

```text
boto3
```

We intentionally keep dependencies minimal.

AWS Lambda's Python runtime already includes AWS SDK functionality, but pinning/installing our application dependency gives us a predictable deployment.

---

# 21. Bedrock Chat Lambda

Create:

```text
backend/chat/handler.py
```

```python
import json
import os
import uuid
from datetime import datetime, timezone

import boto3

from tools.writing_tools import analyze_text


REGION = os.environ.get(
    "AWS_REGION",
    "ap-south-1"
)

MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID",
    "zai.glm-5"
)

CONVERSATIONS_TABLE = os.environ["CONVERSATIONS_TABLE"]
MESSAGES_TABLE = os.environ["MESSAGES_TABLE"]
NOTIFICATION_QUEUE_URL = os.environ["NOTIFICATION_QUEUE_URL"]


bedrock = boto3.client(
    "bedrock-runtime",
    region_name=REGION
)

dynamodb = boto3.resource(
    "dynamodb",
    region_name=REGION
)

sqs = boto3.client(
    "sqs",
    region_name=REGION
)

conversations_table = dynamodb.Table(
    CONVERSATIONS_TABLE
)

messages_table = dynamodb.Table(
    MESSAGES_TABLE
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
    claims = (
        event
        .get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    user_id = claims.get("sub")

    if not user_id:
        raise ValueError("Authenticated user not found")

    return user_id


def invoke_bedrock(user_message, analysis):
    system_prompt = """
You are an AI writing assistant.

Your job is to help users improve writing.

You have access to deterministic measurements generated
by Python analysis tools.

Use those measurements when giving feedback.

Do not invent measurements.

When useful, explain:
- word count
- readability
- weak words
- long sentences
- repeated words

Give practical, specific recommendations.

The user may ask for:
- writing review
- rewriting
- grammar improvement
- professional tone
- technical writing
- concise writing
- readability improvement
"""

    user_prompt = f"""
Analyze the following writing.

WRITING:
{user_message}

DETERMINISTIC ANALYSIS:
{json.dumps(analysis, indent=2)}

Return a useful response for the user.
"""

    result = bedrock.converse(
        modelId=MODEL_ID,
        system=[
            {
                "text": system_prompt
            }
        ],
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "text": user_prompt
                    }
                ],
            }
        ],
        inferenceConfig={
            "maxTokens": 2000,
            "temperature": 0.2,
        },
    )

    return result["output"]["message"]["content"][0]["text"]


def save_message(
    conversation_id,
    role,
    content,
    analysis=None
):
    timestamp = datetime.now(
        timezone.utc
    ).isoformat()

    item = {
        "conversation_id": conversation_id,
        "created_at": timestamp,
        "role": role,
        "content": content,
    }

    if analysis is not None:
        item["analysis"] = analysis

    messages_table.put_item(
        Item=item
    )

    return timestamp


def save_conversation(
    user_id,
    conversation_id,
    title
):
    timestamp = datetime.now(
        timezone.utc
    ).isoformat()

    conversations_table.put_item(
        Item={
            "user_id": user_id,
            "conversation_id": conversation_id,
            "title": title[:100],
            "created_at": timestamp,
            "updated_at": timestamp,
        }
    )


def publish_notification(
    user_id,
    conversation_id
):
    sqs.send_message(
        QueueUrl=NOTIFICATION_QUEUE_URL,
        MessageBody=json.dumps({
            "event": "chat.completed",
            "user_id": user_id,
            "conversation_id": conversation_id,
        })
    )


def lambda_handler(event, context):

    try:

        user_id = get_user_id(event)

        body = json.loads(
            event.get("body") or "{}"
        )

        message = body.get("message", "").strip()

        if not message:
            return response(
                400,
                {
                    "error": "message is required"
                }
            )

        conversation_id = (
            body.get("conversation_id")
            or str(uuid.uuid4())
        )

        # Create conversation if this is a new chat.
        if not body.get("conversation_id"):
            title = message[:80]
            save_conversation(
                user_id,
                conversation_id,
                title
            )

        analysis = analyze_text(message)

        save_message(
            conversation_id,
            "user",
            message,
            analysis
        )

        ai_response = invoke_bedrock(
            message,
            analysis
        )

        save_message(
            conversation_id,
            "assistant",
            ai_response
        )

        publish_notification(
            user_id,
            conversation_id
        )

        return response(
            200,
            {
                "conversation_id": conversation_id,
                "message": ai_response,
                "analysis": analysis,
            }
        )

    except Exception as exc:

        print(
            f"ERROR: {type(exc).__name__}: {exc}"
        )

        return response(
            500,
            {
                "error": "Unable to process chat"
            }
        )
```

GLM 5 supports the Bedrock `Converse` API, and the AWS model documentation provides the same general boto3 approach used above. ([AWS Documentation][1])

---

# 22. Important Lambda Packaging Issue

Because this Lambda imports:

```python
from tools.writing_tools import analyze_text
```

Terraform must package:

```text
backend/chat/handler.py
backend/tools/writing_tools.py
```

together.

We will handle that with Terraform.

---

# 23. History Lambda

Create:

```text
backend/history/handler.py
```

```python
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
```

---

# 24. Profile Lambda

Create:

```text
backend/profile/handler.py
```

```python
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
```

---

# 25. Notification Worker

Create:

```text
backend/notification_worker/handler.py
```

```python
import json
import os

import boto3


SNS_TOPIC_ARN = os.environ["SNS_TOPIC_ARN"]

sns = boto3.client("sns")


def lambda_handler(event, context):

    for record in event["Records"]:

        message = json.loads(
            record["body"]
        )

        print(
            f"Processing notification: {message}"
        )

        sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject="Writing Assistant Activity",
            Message=json.dumps(message),
        )

    return {
        "statusCode": 200
    }
```

---

# 26. IAM

Now we give Lambda only the permissions it needs.

Create:

```text
terraform/iam.tf
```

```hcl
resource "aws_iam_role" "chat_lambda" {
  name = "${local.name_prefix}-chat-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Service = "lambda.amazonaws.com"
      }

      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "chat_lambda" {
  name = "${local.name_prefix}-chat-lambda-policy"
  role = aws_iam_role.chat_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      {
        Effect = "Allow"

        Action = [
          "bedrock:InvokeModel",
          "bedrock:Converse"
        ]

        Resource = "*"
      },

      {
        Effect = "Allow"

        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]

        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.conversations.arn,
          aws_dynamodb_table.messages.arn
        ]
      },

      {
        Effect = "Allow"

        Action = [
          "sqs:SendMessage"
        ]

        Resource = aws_sqs_queue.notification.arn
      },

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      }
    ]
  })
}
```

For production, we can later restrict the Bedrock resource further if the service/resource semantics allow the desired scope.

---

# 27. Generic Lambda IAM Role

History/profile/worker need their own permissions.

```hcl
resource "aws_iam_role" "history_lambda" {
  name = "${local.name_prefix}-history-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Service = "lambda.amazonaws.com"
      }

      Action = "sts:AssumeRole"
    }]
  })
}
```

Policy:

```hcl
resource "aws_iam_role_policy" "history_lambda" {
  name = "${local.name_prefix}-history-lambda-policy"
  role = aws_iam_role.history_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      {
        Effect = "Allow"

        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]

        Resource = [
          aws_dynamodb_table.conversations.arn,
          aws_dynamodb_table.messages.arn
        ]
      },

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      }
    ]
  })
}
```

Profile:

```hcl
resource "aws_iam_role" "profile_lambda" {
  name = "${local.name_prefix}-profile-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Service = "lambda.amazonaws.com"
      }

      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "profile_lambda" {
  name = "${local.name_prefix}-profile-lambda-policy"
  role = aws_iam_role.profile_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      {
        Effect = "Allow"

        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]

        Resource = aws_dynamodb_table.users.arn
      },

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      }
    ]
  })
}
```

Worker:

```hcl
resource "aws_iam_role" "worker_lambda" {
  name = "${local.name_prefix}-worker-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Service = "lambda.amazonaws.com"
      }

      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "worker_lambda" {
  name = "${local.name_prefix}-worker-lambda-policy"
  role = aws_iam_role.worker_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      {
        Effect = "Allow"

        Action = [
          "sns:Publish"
        ]

        Resource = aws_sns_topic.notifications.arn
      },

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      }
    ]
  })
}
```

---

# 28. Terraform Lambda Packaging

Create:

```text
terraform/lambda.tf
```

```hcl
data "archive_file" "chat_lambda" {
  type        = "zip"
  output_path = "${path.module}/chat_lambda.zip"

  source {
    content = file("${path.module}/../backend/chat/handler.py")
    filename = "handler.py"
  }

  source {
    content = file("${path.module}/../backend/tools/writing_tools.py")
    filename = "tools/writing_tools.py"
  }
}
```

History:

```hcl
data "archive_file" "history_lambda" {
  type        = "zip"
  output_path = "${path.module}/history_lambda.zip"

  source {
    content  = file("${path.module}/../backend/history/handler.py")
    filename = "handler.py"
  }
}
```

Profile:

```hcl
data "archive_file" "profile_lambda" {
  type        = "zip"
  output_path = "${path.module}/profile_lambda.zip"

  source {
    content  = file("${path.module}/../backend/profile/handler.py")
    filename = "handler.py"
  }
}
```

Worker:

```hcl
data "archive_file" "worker_lambda" {
  type        = "zip"
  output_path = "${path.module}/worker_lambda.zip"

  source {
    content  = file("${path.module}/../backend/notification_worker/handler.py")
    filename = "handler.py"
  }
}
```

---

# 29. Chat Lambda Resource

Add:

```hcl
resource "aws_lambda_function" "chat" {
  function_name = "${local.name_prefix}-chat"

  role = aws_iam_role.chat_lambda.arn

  runtime = "python3.12"
  handler = "handler.lambda_handler"

  filename         = data.archive_file.chat_lambda.output_path
  source_code_hash = data.archive_file.chat_lambda.output_base64sha256

  timeout     = 60
  memory_size = 512

  environment {
    variables = {
      BEDROCK_MODEL_ID      = var.bedrock_model_id
      CONVERSATIONS_TABLE   = aws_dynamodb_table.conversations.name
      MESSAGES_TABLE        = aws_dynamodb_table.messages.name
      NOTIFICATION_QUEUE_URL = aws_sqs_queue.notification.url
    }
  }
}
```

---

# 30. History Lambda

```hcl
resource "aws_lambda_function" "history" {
  function_name = "${local.name_prefix}-history"

  role = aws_iam_role.history_lambda.arn

  runtime = "python3.12"
  handler = "handler.lambda_handler"

  filename         = data.archive_file.history_lambda.output_path
  source_code_hash = data.archive_file.history_lambda.output_base64sha256

  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      CONVERSATIONS_TABLE = aws_dynamodb_table.conversations.name
      MESSAGES_TABLE      = aws_dynamodb_table.messages.name
    }
  }
}
```

---

# 31. Profile Lambda

```hcl
resource "aws_lambda_function" "profile" {
  function_name = "${local.name_prefix}-profile"

  role = aws_iam_role.profile_lambda.arn

  runtime = "python3.12"
  handler = "handler.lambda_handler"

  filename         = data.archive_file.profile_lambda.output_path
  source_code_hash = data.archive_file.profile_lambda.output_base64sha256

  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      USERS_TABLE = aws_dynamodb_table.users.name
    }
  }
}
```

---

# 32. Worker Lambda

```hcl
resource "aws_lambda_function" "worker" {
  function_name = "${local.name_prefix}-notification-worker"

  role = aws_iam_role.worker_lambda.arn

  runtime = "python3.12"
  handler = "handler.lambda_handler"

  filename         = data.archive_file.worker_lambda.output_path
  source_code_hash = data.archive_file.worker_lambda.output_base64sha256

  timeout     = 30
  memory_size = 256

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.notifications.arn
    }
  }
}
```

---

# 33. SQS → Lambda

Add to `terraform/sqs.tf`:

```hcl
resource "aws_lambda_event_source_mapping" "notification_worker" {
  event_source_arn = aws_sqs_queue.notification.arn
  function_name    = aws_lambda_function.worker.arn

  batch_size = 10
}
```

Now:

```text
SQS
 │
 ▼
Notification Lambda
 │
 ▼
SNS
```

---

# 34. API Gateway

Create:

```text
terraform/api_gateway.tf
```

```hcl
resource "aws_apigatewayv2_api" "main" {
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]

    allow_methods = [
      "GET",
      "POST",
      "PUT",
      "OPTIONS"
    ]

    allow_headers = [
      "Authorization",
      "Content-Type"
    ]

    max_age = 300
  }
}
```

---

# 35. Cognito JWT Authorizer

```hcl
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id = aws_apigatewayv2_api.main.id

  authorizer_type = "JWT"

  name = "${local.name_prefix}-cognito"

  identity_sources = [
    "$request.header.Authorization"
  ]

  jwt_configuration {
    audience = [
      aws_cognito_user_pool_client.frontend.id
    ]

    issuer = (
      "https://cognito-idp.${var.aws_region}.amazonaws.com/" +
      aws_cognito_user_pool.main.id
    )
  }
}
```

---

# 36. Lambda Integrations

Chat:

```hcl
resource "aws_apigatewayv2_integration" "chat" {
  api_id = aws_apigatewayv2_api.main.id

  integration_type = "AWS_PROXY"

  integration_uri = (
    aws_lambda_function.chat.invoke_arn
  )

  payload_format_version = "2.0"
}
```

History:

```hcl
resource "aws_apigatewayv2_integration" "history" {
  api_id = aws_apigatewayv2_api.main.id

  integration_type = "AWS_PROXY"

  integration_uri = (
    aws_lambda_function.history.invoke_arn
  )

  payload_format_version = "2.0"
}
```

Profile:

```hcl
resource "aws_apigatewayv2_integration" "profile" {
  api_id = aws_apigatewayv2_api.main.id

  integration_type = "AWS_PROXY"

  integration_uri = (
    aws_lambda_function.profile.invoke_arn
  )

  payload_format_version = "2.0"
}
```

---

# 37. API Routes

```hcl
resource "aws_apigatewayv2_route" "chat" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "POST /chat"

  target = "integrations/${aws_apigatewayv2_integration.chat.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
```

History list:

```hcl
resource "aws_apigatewayv2_route" "history_list" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "GET /conversations"

  target = "integrations/${aws_apigatewayv2_integration.history.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
```

History detail:

```hcl
resource "aws_apigatewayv2_route" "history_detail" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "GET /conversations/{conversation_id}"

  target = "integrations/${aws_apigatewayv2_integration.history.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
```

Profile:

```hcl
resource "aws_apigatewayv2_route" "profile_get" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "GET /profile"

  target = "integrations/${aws_apigatewayv2_integration.profile.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
```

Profile update:

```hcl
resource "aws_apigatewayv2_route" "profile_put" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "PUT /profile"

  target = "integrations/${aws_apigatewayv2_integration.profile.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}
```

---

# 38. Lambda Permissions for API Gateway

```hcl
resource "aws_lambda_permission" "chat_api" {
  statement_id = "AllowAPIGatewayChat"

  action = "lambda:InvokeFunction"

  function_name = aws_lambda_function.chat.function_name

  principal = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

History:

```hcl
resource "aws_lambda_permission" "history_api" {
  statement_id = "AllowAPIGatewayHistory"

  action = "lambda:InvokeFunction"

  function_name = aws_lambda_function.history.function_name

  principal = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

Profile:

```hcl
resource "aws_lambda_permission" "profile_api" {
  statement_id = "AllowAPIGatewayProfile"

  action = "lambda:InvokeFunction"

  function_name = aws_lambda_function.profile.function_name

  principal = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
```

---

# 39. API Stage

```hcl
resource "aws_apigatewayv2_stage" "default" {
  api_id = aws_apigatewayv2_api.main.id

  name = "$default"

  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 25
  }
}
```

The throttling is intentionally included because this is an AI API and uncontrolled calls can become expensive.

---

# 40. API Output

Create:

```text
terraform/outputs.tf
```

```hcl
output "api_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.frontend.id
}

output "region" {
  value = var.aws_region
}

output "bedrock_model_id" {
  value = var.bedrock_model_id
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
}
```

---

# 41. Deploy the Backend Infrastructure

Go into Terraform:

```bash
cd terraform
```

Initialize:

```bash
terraform init
```

Format:

```bash
terraform fmt -recursive
```

Validate:

```bash
terraform validate
```

You should get:

```text
Success! The configuration is valid.
```

Now:

```bash
terraform plan -var-file=environments/dev.tfvars
```

Review the resources.

Then:

```bash
terraform apply -var-file=environments/dev.tfvars
```

Terraform will ask:

```text
Do you want to perform these actions?
```

Enter:

```text
yes
```

After deployment:

```bash
terraform output
```

You should get values such as:

```text
api_url
cognito_client_id
cognito_user_pool_id
```

---

# 42. Enable Bedrock Model Access

Before testing the Lambda, verify that GLM 5 is available in your Bedrock account in Mumbai.

Open the Amazon Bedrock console and select:

```text
Region:
ap-south-1
```

Then check:

```text
Model access
```

and confirm:

```text
Z.AI
GLM 5
```

AWS currently lists GLM 5 as available in Mumbai. ([AWS Documentation][1])

Test using AWS CLI:

```bash
aws bedrock-runtime converse \
  --region ap-south-1 \
  --model-id zai.glm-5 \
  --messages '[{"role":"user","content":[{"text":"Say hello in one sentence."}]}]'
```

If your AWS account/model access is configured correctly, Bedrock should return the model response.

---

# 43. Test Lambda Directly

Get Lambda:

```bash
aws lambda list-functions \
  --region ap-south-1 \
  --query "Functions[?contains(FunctionName, 'bedrock-writing-assistant-dev')].FunctionName"
```

Then inspect logs:

```bash
aws logs describe-log-groups \
  --region ap-south-1
```

Later we will add structured logging and CloudWatch dashboards.

---

# 44. React Application

Go back:

```bash
cd ..
```

Create React:

```bash
npm create vite@latest frontend -- --template react-ts
```

If the directory already exists, use:

```bash
cd frontend
npm install
```

Install Cognito library:

```bash
npm install amazon-cognito-identity-js
```

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# 45. Frontend Environment

Create:

```text
frontend/.env.example
```

```env
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_CLIENT_ID=
VITE_API_URL=
```

Create your local:

```text
frontend/.env
```

Example:

```env
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_URL=https://xxxxxxxx.execute-api.ap-south-1.amazonaws.com
```

Do **not** put AWS secret keys here.

The React app only needs:

```text
Region
Cognito User Pool ID
Cognito Client ID
API URL
```

---

# 46. Cognito Authentication Service

Create:

```text
frontend/src/auth.ts
```

```typescript
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

export function register(
  email: string,
  password: string
): Promise<unknown> {

  return new Promise((resolve, reject) => {

    pool.signUp(
      email,
      password,
      [],
      [],
      (error, result) => {

        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );
  });
}


export function confirmRegistration(
  email: string,
  code: string
): Promise<string> {

  return new Promise((resolve, reject) => {

    const user = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    user.confirmRegistration(
      code,
      true,
      (error) => {

        if (error) {
          reject(error);
          return;
        }

        resolve("Account verified");
      }
    );
  });
}


export function login(
  email: string,
  password: string
): Promise<string> {

  return new Promise((resolve, reject) => {

    const authenticationDetails =
      new AuthenticationDetails({
        Username: email,
        Password: password,
      });

    const user = new CognitoUser({
      Username: email,
      Pool: pool,
    });

    user.authenticateUser(
      authenticationDetails,
      {
        onSuccess: () => {
          resolve("Login successful");
        },

        onFailure: (error) => {
          reject(error);
        },
      }
    );
  });
}


export function logout(): void {
  const user = pool.getCurrentUser();

  if (user) {
    user.signOut();
  }
}


export function getCurrentUser(): CognitoUser | null {
  return pool.getCurrentUser();
}


export async function getAccessToken(): Promise<string> {

  const user = pool.getCurrentUser();

  if (!user) {
    throw new Error("User is not authenticated");
  }

  return new Promise((resolve, reject) => {

    user.getSession((error: Error | null, session: any) => {

      if (error) {
        reject(error);
        return;
      }

      resolve(
        session.getIdToken().getJwtToken()
      );
    });
  });
}
```

---

# 47. API Client

Create:

```text
frontend/src/api.ts
```

```typescript
import { getAccessToken } from "./auth";

const API_URL =
  import.meta.env.VITE_API_URL;


async function request(
  path: string,
  options: RequestInit = {}
) {

  const token = await getAccessToken();

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",

        Authorization:
          `Bearer ${token}`,

        ...(options.headers || {}),
      },
    }
  );

  if (!response.ok) {

    const error =
      await response.json()
        .catch(() => ({}));

    throw new Error(
      error.error ||
      "Request failed"
    );
  }

  return response.json();
}


export function sendChat(
  message: string,
  conversationId?: string
) {

  return request(
    "/chat",
    {
      method: "POST",

      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    }
  );
}


export function getConversations() {
  return request(
    "/conversations"
  );
}


export function getConversation(
  conversationId: string
) {

  return request(
    `/conversations/${conversationId}`
  );
}


export function getProfile() {
  return request(
    "/profile"
  );
}


export function updateProfile(
  displayName: string
) {

  return request(
    "/profile",
    {
      method: "PUT",

      body: JSON.stringify({
        display_name: displayName,
      }),
    }
  );
}
```

---

# 48. Login UI

Create:

```text
frontend/src/components/Login.tsx
```

```tsx
import { useState } from "react";
import { login } from "../auth";

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function Login({
  onLogin,
  onRegister,
}: Props) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();

    setError("");
    setLoading(true);

    try {

      await login(
        email,
        password
      );

      onLogin();

    } catch (error: any) {

      setError(
        error.message ||
        "Login failed"
      );

    } finally {

      setLoading(false);
    }
  }


  return (
    <div className="auth-page">

      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >

        <h1>Writing Assistant</h1>

        <p>
          Sign in to continue
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
        />

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Sign in"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onRegister}
        >
          Create account
        </button>

      </form>

    </div>
  );
}
```

---

# 49. Register UI

Create:

```text
frontend/src/components/Register.tsx
```

```tsx
import { useState } from "react";
import { register } from "../auth";

interface Props {
  onRegistered: (email: string) => void;
  onLogin: () => void;
}

export default function Register({
  onRegistered,
  onLogin,
}: Props) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();

    setError("");
    setLoading(true);

    try {

      await register(
        email,
        password
      );

      onRegistered(email);

    } catch (error: any) {

      setError(
        error.message ||
        "Registration failed"
      );

    } finally {

      setLoading(false);
    }
  }


  return (
    <div className="auth-page">

      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >

        <h1>Create account</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
        />

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Creating..."
            : "Create account"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={onLogin}
        >
          Back to login
        </button>

      </form>

    </div>
  );
}
```

---

# 50. Email Verification

Create:

```text
frontend/src/components/VerifyEmail.tsx
```

```tsx
import { useState } from "react";
import { confirmRegistration } from "../auth";

interface Props {
  email: string;
  onVerified: () => void;
}

export default function VerifyEmail({
  email,
  onVerified,
}: Props) {

  const [code, setCode] =
    useState("");

  const [error, setError] =
    useState("");


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();

    try {

      await confirmRegistration(
        email,
        code
      );

      onVerified();

    } catch (error: any) {

      setError(
        error.message ||
        "Verification failed"
      );
    }
  }


  return (
    <div className="auth-page">

      <form
        className="auth-card"
        onSubmit={handleSubmit}
      >

        <h1>Verify email</h1>

        <p>
          Enter the verification code
          sent to {email}.
        </p>

        <input
          value={code}
          onChange={(e) =>
            setCode(e.target.value)
          }
          placeholder="Verification code"
          required
        />

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <button type="submit">
          Verify account
        </button>

      </form>

    </div>
  );
}
```

---

# 51. Chat Component

Create:

```text
frontend/src/components/Chat.tsx
```

```tsx
import { useEffect, useState } from "react";
import {
  getConversation,
  sendChat,
} from "../api";

interface Message {
  role: string;
  content: string;
  created_at?: string;
}

interface Props {
  conversationId: string | null;
  onConversationCreated: (
    id: string
  ) => void;
}

export default function Chat({
  conversationId,
  onConversationCreated,
}: Props) {

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  useEffect(() => {

    if (!conversationId) {
      setMessages([]);
      return;
    }

    getConversation(
      conversationId
    )
      .then((data) => {
        setMessages(
          data.messages || []
        );
      })
      .catch(console.error);

  }, [conversationId]);


  async function handleSubmit(
    event: React.FormEvent
  ) {

    event.preventDefault();

    const text = input.trim();

    if (!text || loading) {
      return;
    }

    setInput("");
    setLoading(true);

    setMessages((current) => [
      ...current,

      {
        role: "user",
        content: text,
      },
    ]);

    try {

      const result =
        await sendChat(
          text,
          conversationId ||
          undefined
        );

      if (!conversationId) {

        onConversationCreated(
          result.conversation_id
        );
      }

      setMessages((current) => [
        ...current,

        {
          role: "assistant",
          content: result.message,
        },
      ]);

    } catch (error: any) {

      setMessages((current) => [
        ...current,

        {
          role: "assistant",
          content:
            error.message ||
            "Something went wrong.",
        },
      ]);

    } finally {

      setLoading(false);
    }
  }


  return (
    <div className="chat">

      <div className="messages">

        {messages.length === 0 && (
          <div className="empty-chat">
            <h2>
              Writing Assistant
            </h2>

            <p>
              Paste your writing and ask
              for feedback.
            </p>
          </div>
        )}

        {messages.map(
          (message, index) => (
            <div
              key={index}
              className={
                `message ${message.role}`
              }
            >
              <div>
                {message.content}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="message assistant">
            Thinking...
          </div>
        )}

      </div>


      <form
        className="chat-input"
        onSubmit={handleSubmit}
      >

        <textarea
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          placeholder="Ask the writing assistant..."
          rows={4}
        />

        <button
          type="submit"
          disabled={loading}
        >
          Send
        </button>

      </form>

    </div>
  );
}
```

---

# 52. Account Component

Create:

```text
frontend/src/components/Account.tsx
```

```tsx
import {
  useEffect,
  useState,
} from "react";

import {
  getProfile,
  updateProfile,
} from "../api";

export default function Account() {

  const [displayName, setDisplayName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");


  useEffect(() => {

    getProfile()
      .then((profile) => {

        setDisplayName(
          profile.display_name || ""
        );

        setEmail(
          profile.email || ""
        );

      })
      .catch(console.error);

  }, []);


  async function save() {

    await updateProfile(
      displayName
    );

    setMessage(
      "Profile updated"
    );
  }


  return (
    <div className="account">

      <h2>My Account</h2>

      <label>
        Email
      </label>

      <input
        value={email}
        disabled
      />

      <label>
        Display name
      </label>

      <input
        value={displayName}
        onChange={(e) =>
          setDisplayName(
            e.target.value
          )
        }
      />

      <button onClick={save}>
        Save
      </button>

      {message && (
        <p>{message}</p>
      )}

    </div>
  );
}
```

---

# 53. Application Flow

Now create:

```text
frontend/src/App.tsx
```

```tsx
import { useEffect, useState } from "react";

import Login from "./components/Login";
import Register from "./components/Register";
import VerifyEmail from "./components/VerifyEmail";
import Chat from "./components/Chat";
import Account from "./components/Account";

import {
  getCurrentUser,
  logout,
} from "./auth";

type Screen =
  | "login"
  | "register"
  | "verify"
  | "chat"
  | "account";


export default function App() {

  const [
    screen,
    setScreen
  ] = useState<Screen>("login");

  const [
    verificationEmail,
    setVerificationEmail
  ] = useState("");

  const [
    conversationId,
    setConversationId
  ] = useState<string | null>(
    null
  );


  useEffect(() => {

    if (getCurrentUser()) {
      setScreen("chat");
    }

  }, []);


  if (screen === "login") {

    return (
      <Login
        onLogin={() =>
          setScreen("chat")
        }
        onRegister={() =>
          setScreen("register")
        }
      />
    );
  }


  if (screen === "register") {

    return (
      <Register
        onRegistered={(email) => {

          setVerificationEmail(
            email
          );

          setScreen("verify");

        }}
        onLogin={() =>
          setScreen("login")
        }
      />
    );
  }


  if (screen === "verify") {

    return (
      <VerifyEmail
        email={
          verificationEmail
        }
        onVerified={() =>
          setScreen("login")
        }
      />
    );
  }


  return (
    <div className="app">

      <aside>

        <h2>
          Writing Assistant
        </h2>

        <button
          onClick={() => {
            setConversationId(null);
            setScreen("chat");
          }}
        >
          New Chat
        </button>

        <button
          onClick={() =>
            setScreen("account")
          }
        >
          Account
        </button>

        <button
          onClick={() => {

            logout();

            setScreen("login");

          }}
        >
          Logout
        </button>

      </aside>


      <main>

        {screen === "chat" && (
          <Chat
            conversationId={
              conversationId
            }
            onConversationCreated={
              setConversationId
            }
          />
        )}

        {screen === "account" && (
          <Account />
        )}

      </main>

    </div>
  );
}
```

---

# 54. React Entry Point

`frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "./styles/app.css";


ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

# 55. Basic CSS

Create:

```text
frontend/src/styles/app.css
```

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f5f5f5;
}

button,
input,
textarea {
  font: inherit;
}

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 380px;
  padding: 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.08);
}

.auth-card input {
  width: 100%;
  margin: 8px 0;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.auth-card button {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.secondary {
  background: #eee;
}

.error {
  color: #b00020;
  margin-top: 10px;
}

.app {
  display: flex;
  min-height: 100vh;
}

aside {
  width: 240px;
  padding: 20px;
  background: #202020;
  color: white;
}

aside button {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 10px;
  cursor: pointer;
}

main {
  flex: 1;
}

.chat {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

.message {
  max-width: 800px;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 10px;
  white-space: pre-wrap;
}

.message.user {
  margin-left: auto;
  background: #ddd;
}

.message.assistant {
  background: white;
}

.chat-input {
  display: flex;
  padding: 20px;
  gap: 10px;
  background: white;
}

.chat-input textarea {
  flex: 1;
  padding: 12px;
}

.chat-input button {
  width: 100px;
}

.account {
  max-width: 600px;
  margin: 40px auto;
}

.account input {
  display: block;
  width: 100%;
  margin: 8px 0 20px;
  padding: 12px;
}
```

---

# 56. Frontend Local Test

Run:

```bash
cd frontend
npm install
npm run dev
```

Now test:

```text
Register
   ↓
Email verification
   ↓
Login
   ↓
Chat
   ↓
API Gateway
   ↓
Lambda
   ↓
Bedrock
```

At this point, the entire application is already conceptually functional.

---

# 57. Important Correction Before Production

There is one improvement we should make before calling this production-ready.

Currently:

```text
POST /chat
      │
      ▼
Lambda
      │
      ▼
Bedrock
      │
      ▼
Response
```

This is synchronous.

For a real application, we eventually want:

```text
React
  │
  ▼
API Gateway
  │
  ▼
Chat Lambda
  │
  ├── DynamoDB
  │
  ├── Bedrock
  │
  └── SQS
        │
        ▼
     Worker
        │
        ▼
       SNS
```

The SQS/SNS path should be used for **secondary/asynchronous work**, not for making the user wait for the AI response.

That is why our design uses:

```text
Bedrock = synchronous user response

SQS/SNS = asynchronous events/notifications
```

---

# 58. Terraform Frontend Hosting

Next we create:

```text
S3
+
CloudFront
```

React produces static assets:

```text
npm run build
```

which generates:

```text
frontend/dist/
```

Those files will be uploaded to S3.

CloudFront serves them globally.

---

# 59. S3 Terraform

Create:

```text
terraform/s3.tf
```

```hcl
resource "aws_s3_bucket" "frontend" {
  bucket = "${local.name_prefix}-frontend"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

We do **not** make the bucket public.

CloudFront will access it privately.

---

# 60. CloudFront Origin Access Control

Create:

```text
terraform/cloudfront.tf
```

```hcl
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-oac"
  description                       = "CloudFront access to React S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

CloudFront distribution:

```hcl
resource "aws_cloudfront_distribution" "frontend" {

  enabled = true

  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "frontend-s3"

    origin_access_control_id =
      aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {

    allowed_methods = [
      "GET",
      "HEAD",
      "OPTIONS"
    ]

    cached_methods = [
      "GET",
      "HEAD"
    ]

    target_origin_id = "frontend-s3"

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }
  }

  restrictions {

    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
}
```

The 403/404 handling is important for React SPA routes.

---

# 61. S3 Bucket Policy

Add:

```hcl
data "aws_iam_policy_document" "frontend_bucket" {

  statement {

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      "${aws_s3_bucket.frontend.arn}/*"
    ]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"

      values = [
        aws_cloudfront_distribution.frontend.arn
      ]
    }
  }
}


resource "aws_s3_bucket_policy" "frontend" {

  bucket = aws_s3_bucket.frontend.id

  policy = data.aws_iam_policy_document.frontend_bucket.json
}
```

---

# 62. Terraform Apply Again

```bash
cd terraform

terraform fmt -recursive

terraform validate

terraform plan \
  -var-file=environments/dev.tfvars

terraform apply \
  -var-file=environments/dev.tfvars
```

Then:

```bash
terraform output
```

Get:

```text
cloudfront_domain
```

---

# 63. Build React

Go to:

```bash
cd ../frontend
```

Create production configuration:

```text
.env.production
```

```env
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
VITE_COGNITO_CLIENT_ID=YOUR_CLIENT_ID
VITE_API_URL=YOUR_API_URL
```

Build:

```bash
npm run build
```

Check:

```text
frontend/dist/
```

---

# 64. Upload React to S3

Get bucket:

```bash
cd ../terraform

terraform output -raw frontend_bucket
```

Then:

```bash
aws s3 sync ../frontend/dist s3://YOUR_BUCKET_NAME --delete
```

For example:

```bash
aws s3 sync ../frontend/dist \
  s3://bedrock-writing-assistant-dev-frontend \
  --delete
```

---

# 65. Invalidate CloudFront

Get distribution:

```bash
terraform output -raw cloudfront_distribution_id
```

Then:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

Now:

```bash
terraform output -raw cloudfront_domain
```

Open:

```text
https://YOUR_CLOUDFRONT_DOMAIN
```

Your application is now running on AWS.

---

# 66. Complete Application Flow

At this point:

```text
                   USER
                    │
                    ▼
             CloudFront HTTPS
                    │
                    ▼
                React UI
                    │
                    │
                    ▼
             Amazon Cognito
                    │
                 JWT Token
                    │
                    ▼
             API Gateway HTTP
                    │
          Cognito JWT Authorizer
                    │
                    ▼
              Chat Lambda
                    │
             ┌──────┴──────┐
             │             │
             ▼             ▼
       Python Tools     Bedrock
             │           GLM 5
             │             │
             └──────┬──────┘
                    │
                    ▼
                DynamoDB
                    │
                    ▼
                  SQS
                    │
                    ▼
             Worker Lambda
                    │
                    ▼
                  SNS
```

This gives you a real AWS serverless AI application rather than just a Bedrock demo.

---

# 67. What Each Service Does

| Service        | Responsibility                      |
| -------------- | ----------------------------------- |
| CloudFront     | HTTPS/global frontend delivery      |
| S3             | React static files                  |
| Cognito        | Registration/login/token management |
| API Gateway    | Backend HTTP API                    |
| JWT Authorizer | Validates Cognito token             |
| Lambda         | Python application logic            |
| Bedrock        | GLM 5 inference                     |
| DynamoDB       | Users/conversations/messages        |
| SQS            | Asynchronous work                   |
| DLQ            | Failed messages                     |
| Worker Lambda  | Processes SQS messages              |
| SNS            | Notification/event fan-out          |
| CloudWatch     | Logs/monitoring                     |
| IAM            | Service permissions                 |
| Terraform      | Infrastructure as code              |
| GitHub Actions | CI/CD                               |

AWS explicitly supports API Gateway authorization using Cognito user pools and API Gateway → Lambda integrations. ([AWS Documentation][4])

---

# 68. Git Repository

Now:

```bash
git add .
```

Check:

```bash
git status
```

Commit:

```bash
git commit -m "Initial AWS Bedrock writing assistant"
```

Create GitHub repository and:

```bash
git remote add origin YOUR_GITHUB_REPOSITORY
```

Then:

```bash
git branch -M main
git push -u origin main
```

---

# 69. CI/CD Architecture

We will ultimately have:

```text
Developer
   │
   ▼
Git push
   │
   ▼
GitHub
   │
   ├───────────────┐
   │               │
   ▼               ▼
Terraform       Frontend
   │               │
   ▼               ▼
AWS Infra       npm build
   │               │
   │               ▼
   │              S3
   │               │
   │               ▼
   │          CloudFront
   │
   ▼
Lambda
```

The two pipelines will be:

```text
terraform.yml
```

and:

```text
frontend.yml
```

---

# 70. Terraform CI/CD

Before writing GitHub Actions, we should **not use long-lived AWS access keys** in GitHub.

The better production architecture is:

```text
GitHub Actions
       │
       ▼
GitHub OIDC
       │
       ▼
AWS IAM Role
       │
       ▼
Terraform
```

This avoids storing:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

as GitHub secrets.

We will implement that next.

---

# 71. The Remaining Production Pieces

The current implementation establishes the core application. The next implementation section should complete these pieces rather than treating them as optional:

```text
01. Terraform remote state
02. S3 state bucket
03. State locking
04. GitHub OIDC
05. GitHub deployment IAM role
06. Terraform GitHub Actions
07. React GitHub Actions
08. Lambda deployment through GitHub
09. CloudFront cache invalidation
10. CloudWatch log groups
11. CloudWatch alarms
12. API throttling
13. DynamoDB TTL
14. DynamoDB encryption
15. SQS DLQ monitoring
16. Bedrock error handling
17. Bedrock throttling handling
18. Input validation
19. Maximum prompt size
20. CORS tightening
21. Cognito security hardening
22. Environment separation
23. dev/staging/prod Terraform
24. Secrets/configuration strategy
25. Complete README
26. Automated tests
27. End-to-end test commands
28. Production deployment
```

That is the point where this becomes a **portfolio/interview-quality AWS project**, rather than just a tutorial.

### Current checkpoint

You should have:

```text
React
   │
Cognito
   │
API Gateway
   │
Python Lambda
   ├── Python writing tools
   ├── DynamoDB
   ├── SQS
   └── Bedrock GLM 5
          │
          ▼
        Response
```

And the target AWS region remains:

```text
ap-south-1
```

with:

```text
zai.glm-5
```

as the Bedrock model. AWS's current documentation confirms both the model ID and Mumbai regional availability. ([AWS Documentation][1])

**Next section: Terraform remote state → GitHub OIDC → CI/CD → CloudWatch → security hardening → automated testing → final production deployment.**

[1]: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-zai-glm-5.html?utm_source=chatgpt.com "GLM 5 - Amazon Bedrock"
[2]: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html?utm_source=chatgpt.com "Tutorial: Using Lambda with API Gateway - AWS Lambda"
[3]: https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html?utm_source=chatgpt.com "Invoking Lambda functions with Amazon SNS notifications - AWS Lambda"
[4]: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html?utm_source=chatgpt.com "Control access to REST APIs using Amazon Cognito user pools as an authorizer - Amazon API Gateway"
