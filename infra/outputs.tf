output "alb_dns_name" {
  description = "The public URL of your Application Load Balancer"
  value       = "http://${aws_lb.main.dns_name}"
}