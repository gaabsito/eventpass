output "api_url" {
  description = "Endpoint del backend Terraform"
  value       = "https://${aws_api_gateway_rest_api.ebook.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.dev.stage_name}/contact"
}

output "lambda_name" {
  value = aws_lambda_function.contact.function_name
}

output "sns_topic_arn" {
  value = aws_sns_topic.requests.arn
}
