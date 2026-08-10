/* S3 bucket for frontend and CloudFront distribution */
resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
  acl = "private"
  force_destroy = false
  versioning { enabled = true }
  server_side_encryption_configuration { rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } } }
}

resource "aws_s3_bucket_public_access_block" "frontend_block" {
  bucket = aws_s3_bucket.frontend.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "oac" {
  count = var.cloudfront_enabled ? 1 : 0
  name = "${local.prefix}-oac"
  description = "Origin Access Control for frontend S3"
  origin_access_control_origin_type = "s3"
  signing_behavior = "always"
  signing_protocol = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  count = var.cloudfront_enabled ? 1 : 0
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id = "s3-${aws_s3_bucket.frontend.id}"
    s3_origin_config { origin_access_identity = "" }
  }
  enabled = true
  default_root_object = "index.html"
  default_cache_behavior {
    allowed_methods = ["GET","HEAD","OPTIONS"]
    cached_methods = ["GET","HEAD"]
    target_origin_id = "s3-${aws_s3_bucket.frontend.id}"
    forwarded_values { query_string = false }
    viewer_protocol_policy = "redirect-to-https"
    min_ttl = 0
    default_ttl = 3600
    max_ttl = 86400
  }
  viewer_certificate { cloudfront_default_certificate = true }
  restrictions { geo_restriction { restriction_type = "none" } }
  tags = { Environment = var.environment }
}

output "frontend_bucket" { value = aws_s3_bucket.frontend.bucket }
output "cloudfront_domain" { value = aws_cloudfront_distribution.frontend[0].domain_name }
