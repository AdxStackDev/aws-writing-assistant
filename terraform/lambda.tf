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