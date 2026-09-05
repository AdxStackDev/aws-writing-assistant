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

output "frontend_url" {
  value = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

# cloudfront_distribution_id and cloudfront_domain are disabled until
# the AWS account is verified. Re-enable alongside cloudfront.tf.disabled.
