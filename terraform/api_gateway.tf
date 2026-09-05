resource "aws_apigatewayv2_api" "main" {
  name          = "${local.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [
      "http://localhost:5173",
      "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
    ]

    allow_methods = [
      "GET",
      "POST",
      "OPTIONS"
    ]

    allow_headers = [
      "Authorization",
      "Content-Type"
    ]

    max_age = 300
  }
}

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

    issuer = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

resource "aws_apigatewayv2_integration" "chat" {
  api_id = aws_apigatewayv2_api.main.id

  integration_type = "AWS_PROXY"

  integration_uri = (
    aws_lambda_function.chat.invoke_arn
  )

  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_integration" "history" {
  api_id = aws_apigatewayv2_api.main.id

  integration_type = "AWS_PROXY"

  integration_uri = (
    aws_lambda_function.history.invoke_arn
  )

  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_integration" "profile" {
  api_id = aws_apigatewayv2_api.main.id

  integration_type = "AWS_PROXY"

  integration_uri = (
    aws_lambda_function.profile.invoke_arn
  )

  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "chat" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "POST /chat"

  target = "integrations/${aws_apigatewayv2_integration.chat.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "history_list" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "GET /conversations"

  target = "integrations/${aws_apigatewayv2_integration.history.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "history_detail" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "GET /conversations/{conversation_id}"

  target = "integrations/${aws_apigatewayv2_integration.history.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "profile_get" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "GET /profile"

  target = "integrations/${aws_apigatewayv2_integration.profile.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "profile_put" {
  api_id = aws_apigatewayv2_api.main.id

  route_key = "PUT /profile"

  target = "integrations/${aws_apigatewayv2_integration.profile.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "chat_api" {
  statement_id = "AllowAPIGatewayChat"

  action = "lambda:InvokeFunction"

  function_name = aws_lambda_function.chat.function_name

  principal = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "history_api" {
  statement_id = "AllowAPIGatewayHistory"

  action = "lambda:InvokeFunction"

  function_name = aws_lambda_function.history.function_name

  principal = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "profile_api" {
  statement_id = "AllowAPIGatewayProfile"

  action = "lambda:InvokeFunction"

  function_name = aws_lambda_function.profile.function_name

  principal = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id = aws_apigatewayv2_api.main.id

  name = "$default"

  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 25
  }
}
