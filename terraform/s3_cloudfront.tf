resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket for React
resource "aws_s3_bucket" "frontend_bucket" {
  bucket        = "ems-frontend-${random_id.bucket_suffix.hex}"
  force_destroy = true 
}

# S3 Bucket Website Configuration
resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" 
  }
}

# Public Access Block
resource "aws_s3_bucket_public_access_block" "frontend_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket Policy for Public Read
resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket     = aws_s3_bucket.frontend_bucket.id
  depends_on = [aws_s3_bucket_public_access_block.frontend_public_access]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      }
    ]
  })
}

locals {
  content_types = {
    "html" = "text/html"
    "css"  = "text/css"
    "js"   = "application/javascript"
    "json" = "application/json"
    "png"  = "image/png"
    "jpg"  = "image/jpeg"
    "jpeg" = "image/jpeg"
    "svg"  = "image/svg+xml"
    "ico"  = "image/x-icon"
  }
}

resource "local_file" "frontend_env" {
  filename = "${path.module}/../frontend/.env"
  content  = "VITE_API_URL=http://${aws_instance.app_server.public_ip}:8080/api"
}

resource "aws_s3_object" "frontend_files" {
  for_each = fileset("${path.module}/../frontend/dist", "**/*")

  bucket       = aws_s3_bucket.frontend_bucket.id
  key          = each.value
  source       = "${path.module}/../frontend/dist/${each.value}"
  etag         = filemd5("${path.module}/../frontend/dist/${each.value}")
  content_type = lookup(local.content_types, element(split(".", each.value), length(split(".", each.value)) - 1), "binary/octet-stream")
}

# Add this to get your direct frontend link
output "frontend_s3_website_url" {
  value = aws_s3_bucket_website_configuration.frontend_website.website_endpoint
}