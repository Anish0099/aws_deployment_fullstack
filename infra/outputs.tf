output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "Name of the S3 bucket storing frontend build files"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "ID of CloudFront distribution for cache invalidation"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "Application Load Balancer DNS Endpoint for backend API"
}