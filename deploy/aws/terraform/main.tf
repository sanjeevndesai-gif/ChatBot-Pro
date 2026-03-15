terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_ecr_repository" "gateway" {
  name = "${var.repo_prefix}-gateway"
  image_scanning_configuration {
    scan_on_push = true
  }
  lifecycle_policy {
    policy = jsonencode({
      rules = [
        {
          rulePriority = 1
          description  = "Keep the last 20 images"
          selection = {
            tagStatus = "any"
            countType = "imageCountMoreThan"
            countNumber = 20
          }
          action = { type = "expire" }
        }
      ]
    })
  }
}

resource "aws_ecr_repository" "auth_service" {
  name = "${var.repo_prefix}-auth-service"
}

resource "aws_ecr_repository" "book_appointment" {
  name = "${var.repo_prefix}-book-appointment"
}

resource "aws_ecr_repository" "chat" {
  name = "${var.repo_prefix}-chat"
}

resource "aws_ecr_repository" "eureka" {
  name = "${var.repo_prefix}-eureka"
}

resource "aws_ecs_cluster" "main" {
  name = "${var.repo_prefix}-cluster"
}

resource "aws_cloudwatch_log_group" "gateway" {
  name              = "/ecs/${var.repo_prefix}-gateway"
  retention_in_days = 14
}

resource "aws_security_group" "alb" {
  name        = "${var.repo_prefix}-alb-sg"
  description = "ALB security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.ingress_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "gateway_service" {
  name        = "${var.repo_prefix}-gateway-svc-sg"
  description = "Gateway ECS service security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "gateway" {
  name               = "${var.repo_prefix}-gateway-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "gateway" {
  name        = "${var.repo_prefix}-gateway-tg"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    enabled             = true
    path                = "/actuator/health/readiness"
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "gateway_http" {
  load_balancer_arn = aws_lb.gateway.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gateway.arn
  }
}

# Example ECS task definition for gateway (Fargate)
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.repo_prefix}-ecs-task-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  ]
}

# Placeholder task definition - update image URIs and environment as needed
resource "aws_ecs_task_definition" "gateway" {
  family                   = "${var.repo_prefix}-gateway"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  container_definitions    = jsonencode([
    {
      name      = "gateway"
      image     = "${aws_ecr_repository.gateway.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE"
          value = "http://eureka-service:8761/eureka/"
        },
        {
          name  = "MANAGEMENT_ENDPOINT_HEALTH_PROBES_ENABLED"
          value = "true"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.gateway.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "gateway"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "gateway" {
  name                               = "${var.repo_prefix}-gateway"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.gateway.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.gateway_service.id]
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.gateway.arn
    container_name   = "gateway"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.gateway_http]
}
