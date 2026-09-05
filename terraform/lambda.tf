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

data "archive_file" "history_lambda" {
  type        = "zip"
  output_path = "${path.module}/history_lambda.zip"

  source {
    content  = file("${path.module}/../backend/history/handler.py")
    filename = "handler.py"
  }
}

data "archive_file" "worker_lambda" {
  type        = "zip"
  output_path = "${path.module}/worker_lambda.zip"

  source {
    content  = file("${path.module}/../backend/notification_worker/handler.py")
    filename = "handler.py"
  }
}

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
