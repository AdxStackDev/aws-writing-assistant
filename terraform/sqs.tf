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