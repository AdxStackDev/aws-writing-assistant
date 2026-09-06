variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "writing-assistant"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock model ID"
  type        = string
  default     = "openai.gpt-oss-120b"
}

variable "openai_api_key" {
  description = "API key for Bedrock OpenAI-compatible endpoint"
  type        = string
  sensitive   = true
}

variable "openai_base_url" {
  description = "Base URL for Bedrock OpenAI-compatible endpoint"
  type        = string
  default     = "https://bedrock-mantle.us-east-1.api.aws/v1"
}
