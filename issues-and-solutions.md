# Issues and Solutions — Bedrock Writing Assistant

All issues encountered and resolved during the build session on September 6, 2026.

---

## 1. Terraform Validate Errors

**Error:**
```
Blocks of type "recovery_mechanisms" are not expected here. Did you mean "recovery_mechanism"?
A data resource "archive_file" "profile_lambda" has not been declared.
A managed resource "aws_s3_bucket" "frontend" has not been declared.
A managed resource "aws_cloudfront_distribution" "frontend" has not been declared.
```

**Cause:**
- `recovery_mechanisms` was plural — AWS provider expects the singular `recovery_mechanism`
- `data "archive_file" "profile_lambda"` block was missing from `lambda.tf`
- `outputs.tf` referenced `aws_s3_bucket.frontend` and `aws_cloudfront_distribution.frontend` which did not exist yet

**Fix:**
- Renamed `recovery_mechanisms` to `recovery_mechanism` in `cognito.tf`
- Added the missing `data "archive_file" "profile_lambda"` block to `lambda.tf`
- Removed the three S3/CloudFront outputs from `outputs.tf` until those resources were created

---

## 2. Missing Resources vs bedrock-writing-assistant-v1.md Spec

**Issue:**
Cross-checking against the v1 spec revealed several missing or incorrect items.

**Missing/incorrect:**
- `aws_s3_bucket`, `aws_cloudfront_distribution`, and related resources not in any `.tf` file
- `aws_apigatewayv2_stage.default` missing — `api_url` output would fail
- CORS `allow_origins` was `["*"]` instead of specific origins
- `timeout_milliseconds = 29000` missing from all three integrations
- `aws_cloudwatch_log_group` for Lambda not defined
- Cognito `explicit_auth_flows` used `ALLOW_USER_PASSWORD_AUTH` instead of `ALLOW_USER_SRP_AUTH`
- Outputs `frontend_bucket`, `cloudfront_distribution_id`, `cloudfront_domain`, `bedrock_model_id` missing
- `backend/handler.py` (unified handler) and `backend/tools/__init__.py` not created

**Fix:**
- Created `terraform/frontend.tf` (later split) with all S3 + CloudFront resources
- Added `aws_apigatewayv2_stage.default` to `api_gateway.tf`
- Updated CORS origins to reference CloudFront domain
- Added `timeout_milliseconds = 29000` to all three integrations
- Added `aws_cloudwatch_log_group.api` with 14-day retention to `lambda.tf`
- Changed Cognito auth flow to `ALLOW_USER_SRP_AUTH`
- Restored all missing outputs in `outputs.tf`
- Created `backend/handler.py` and `backend/tools/__init__.py`

---

## 3. Directory Structure — frontend.tf Should Be Two Files

**Issue:**
`writting_assistant.md` spec defines separate `terraform/s3.tf` and `terraform/cloudfront.tf` files. The project had a single `frontend.tf`.

**Fix:**
Split `frontend.tf` into:
- `s3.tf` — S3 bucket, public access block, SSE config, bucket policy, IAM policy document
- `cloudfront.tf` — OAC, cache policy data source, CloudFront distribution

Deleted `frontend.tf`.

---

## 4. HCL String Concatenation Error in api_gateway.tf

**Error:**
```
Invalid operand: Unsuitable value for left operand: a number is required.
on api_gateway.tf line 43:
"https://cognito-idp.${var.aws_region}.amazonaws.com/" + aws_cognito_user_pool.main.id
```

**Cause:**
HCL does not support the `+` operator for string concatenation. It is only valid for numbers. The code attempted to join two strings with `+`.

**Fix:**
Replaced with proper HCL interpolation:
```hcl
issuer = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
```

---

## 5. CloudFront AccessDenied — AWS Account Not Verified

**Error:**
```
AccessDenied: Your account must be verified before you can add new CloudFront resources.
```

**Cause:**
New or unverified AWS accounts are blocked from creating CloudFront distributions until AWS Support verifies the account. This is an account-level restriction unrelated to IAM or Terraform configuration.

**Fix:**
Replaced CloudFront with S3 Static Website Hosting as a temporary workaround:
- Disabled public access block on the S3 bucket
- Added a public read bucket policy
- Added `aws_s3_bucket_website_configuration` with `index.html` as index and error document
- Renamed `cloudfront.tf` to `cloudfront.tf.disabled` with full commented-out resources and re-enable instructions
- Updated CORS origins in `api_gateway.tf` to reference the S3 website endpoint
- Replaced CloudFront outputs with `frontend_url` pointing to the S3 website endpoint

---

## 6. Lambda Event Source Mapping — Worker Missing SQS Permissions

**Error:**
```
InvalidParameterValueException: The function execution role does not have permissions
to call ReceiveMessage on SQS
```

**Cause:**
The `worker_lambda` IAM role policy only had `sns:Publish` permission. For Lambda to poll SQS as an event source, the execution role also needs SQS receive-side permissions.

**Fix:**
Added the following three permissions to the `worker_lambda` IAM role policy in `iam.tf`:
```json
"sqs:ReceiveMessage",
"sqs:DeleteMessage",
"sqs:GetQueueAttributes"
```
on the `aws_sqs_queue.notification` resource.

---

## 7. Frontend — Uncaught ReferenceError: global is not defined

**Error:**
```
Uncaught ReferenceError: global is not defined
at amazon-cognito-identity-js.js
```

**Cause:**
`amazon-cognito-identity-js` expects a Node.js `global` object which does not exist in browser environments. Vite does not polyfill it automatically.

**Fix:**
Added a global polyfill in `frontend/index.html` before the app script loads:
```html
<script>window.global = window;</script>
```

---

## 8. Bedrock ValidationException — Operation Not Allowed (AISPL Account)

**Error:**
```
An error occurred (ValidationException) when calling the Converse operation: Operation not allowed
```

**Cause:**
The AWS account is on AISPL (Amazon Internet Services Private Limited — Indian billing entity). AISPL accounts cannot auto-subscribe to AWS Marketplace models including third-party Bedrock models like `zai.glm-5`. Even Amazon-native models like `amazon.nova-lite-v1:0` returned the same error due to account-level restrictions.

**Fix:**
Switched to the Bedrock OpenAI-compatible endpoint (`bedrock-mantle`):
- Rewrote `chat/handler.py` to use the `openai` SDK with `client.responses.create`
- Set `OPENAI_API_KEY` to the Bedrock bearer token and `OPENAI_BASE_URL` to `https://bedrock-mantle.us-east-1.api.aws/v1`
- Updated model ID to `openai.gpt-oss-120b`
- Added `openai_api_key` and `openai_base_url` as Terraform variables, wired into Lambda env vars

---

## 9. Directory Structure Issues

**Issues found:**
- `backend/handler.py` existed at root level (stray file from single-Lambda v1 approach, not part of multi-Lambda spec)
- `frontend/src/App.css` and `frontend/src/index.css` were Vite scaffold leftovers (unused since `main.tsx` imports `styles/app.css`)
- `frontend/src/types.ts` missing (listed in spec directory tree)
- `frontend/.env.example` missing (spec requires it committed, actual `.env` must not be committed)

**Fix:**
- Deleted `backend/handler.py`
- Deleted `frontend/src/App.css` and `frontend/src/index.css`
- Created `frontend/src/types.ts` with all shared interfaces (`Message`, `Analysis`, `Conversation`, `Profile`, etc.)
- Created `frontend/.env.example` with placeholder values

---

## 10. pip install Polluted the chat/ Source Folder

**Issue:**
Running `pip install -r requirements.txt -t chat/` installed `boto3`, `openai`, and all their dependencies (50+ packages) directly into `backend/chat/` alongside `handler.py`. This would have caused all those packages to be zipped and deployed as part of the Lambda function code.

**Fix:**
- Deleted all pip-installed packages from `backend/chat/`, leaving only `handler.py`
- Created a proper Lambda layer at `backend/lambda_layers/openai_layer/python/`
- Added `aws_lambda_layer_version.openai` resource to `lambda.tf`
- Attached the layer to the chat Lambda via `layers = [aws_lambda_layer_version.openai.arn]`
- Added `backend/lambda_layers/` to `.gitignore`

---

## 11. Lambda Layer — pydantic_core Import Error (Windows vs Linux)

**Error:**
```
Runtime.ImportModuleError: Unable to import module 'handler': No module named 'pydantic_core._pydantic_core'
```

**Cause:**
The Lambda layer was built on Windows. `pydantic_core` contains compiled C extensions (`.pyd` files) targeting Windows. AWS Lambda runs on Linux, so the Windows binaries were incompatible.

**Fix:**
Rebuilt the layer using Docker with a Linux Python 3.12 image:
```bash
docker run --rm -v "C:\...\backend\lambda_layers:/output" python:3.12-slim pip install openai -t /output/python
```
Then re-zipped and redeployed via `terraform apply`. The Linux-built binaries loaded correctly on Lambda.

---

## 12. DynamoDB — Float Types Not Supported

**Error:**
```
TypeError: Float types are not supported. Use Decimal types instead.
```

**Cause:**
The `analyze_text()` function returns floats in the analysis object (e.g. `readability.score = 45.2`, `word_count.avg_sentence_length = 12.5`). DynamoDB does not accept Python `float` values — it requires `Decimal`.

**Fix:**
Added a `to_ddb()` helper function to `chat/handler.py` that recursively converts all floats to `Decimal` before writing to DynamoDB:
```python
from decimal import Decimal

def to_ddb(value):
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: to_ddb(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_ddb(v) for v in value]
    return value
```
Applied it when saving the user message analysis: `item["analysis"] = to_ddb(analysis)`.

---

## Final Status

All issues resolved. Lambda returns a 200 response with AI feedback, analysis data saved to DynamoDB, and notification published to SQS.
