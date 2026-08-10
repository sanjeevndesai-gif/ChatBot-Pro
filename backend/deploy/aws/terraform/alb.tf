resource "aws_lb" "alb" {
  name = "${local.prefix}-alb"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.alb.id]
  subnets = local.public_subnets
  enable_deletion_protection = false
}

resource "aws_lb_target_group" "gateway_tg" {
  name = "${local.prefix}-gateway-tg"
  port = 8080
  protocol = "HTTP"
  vpc_id = local.vpc_id_final
  health_check {
    path = "/actuator/health"
    interval = 30
    healthy_threshold = 2
    unhealthy_threshold = 2
    timeout = 5
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port = 80
  protocol = "HTTP"
  default_action { type = "redirect" }
}

resource "aws_lb_listener" "https" {
  count = var.acm_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.alb.arn
  port = 443
  protocol = "HTTPS"
  ssl_policy = "ELBSecurityPolicy-2016-08"
  certificate_arn = var.acm_certificate_arn
  default_action { type = "forward", target_group_arn = aws_lb_target_group.gateway_tg.arn }
}
