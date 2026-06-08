output "rds_endpoint" {
  description = "RDS DB connection string"
  value       = aws_db_instance.mysql.address
}

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.app_server.public_ip
}

output "s3_bucket_name" {
  description = "S3 Bucket Name for uploading React dist/"
  value       = aws_s3_bucket.frontend_bucket.id
}
