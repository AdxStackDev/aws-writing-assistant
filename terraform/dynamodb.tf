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