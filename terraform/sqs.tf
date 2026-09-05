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

resource "aws_lambda_event_source_mapping" "notification_worker" {
  event_source_arn = aws_sqs_queue.notification.arn
  function_name    = aws_lambda_function.worker.arn

  batch_size = 10
}