/* ECS Task Definitions and Services (gateway example) */
resource "aws_ecs_task_definition" "gateway" {
  family = "${local.prefix}-gateway"
  cpu = "256"
  memory = "512"
  network_mode = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  execution_role_arn = aws_iam_role.ecs_task_execution.arn
  task_role_arn = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([
    {
      name = "gateway"
      image = "${aws_ecr_repository.repos["gateway"].repository_url}:<IMAGE_TAG>"
      essential = true
      portMappings = [{ containerPort = 8080, hostPort = 8080, protocol = "tcp" }]
      logConfiguration = { logDriver = "awslogs", options = { awslogs-group = "/ecs/${var.repo_prefix}-gateway", awslogs-region = var.aws_region, awslogs-stream-prefix = "ecs" } }
      environment = []
      secrets = []
    }
  ])
}

resource "aws_ecs_service" "gateway" {
  name = "${local.prefix}-gateway-svc"
  cluster = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.gateway.arn
  launch_type = "FARGATE"
  desired_count = lookup(var.env_desired_counts, "gateway", 1)
  network_configuration {
    subnets = local.private_subnets
    security_groups = [aws_security_group.gateway_svc.id]
    assign_public_ip = var.assign_public_ip ? "ENABLED" : "DISABLED"
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.gateway_tg.arn
    container_name = "gateway"
    container_port = 8080
  }
}
