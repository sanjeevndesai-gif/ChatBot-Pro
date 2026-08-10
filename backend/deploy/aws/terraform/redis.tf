resource "aws_elasticache_subnet_group" "redis" {
  count = var.redis_enabled ? 1 : 0
  name = "${local.prefix}-redis-subnet-group"
  subnet_ids = local.private_subnets
}

resource "aws_elasticache_cluster" "redis" {
  count = var.redis_enabled ? 1 : 0
  cluster_id = "${local.prefix}-redis"
  engine = "redis"
  node_type = var.redis_node_type
  num_cache_nodes = 1
  parameter_group_name = "default.redis6.x"
  subnet_group_name = aws_elasticache_subnet_group.redis[0].name
  security_group_ids = [aws_security_group.internal_svc.id]
}
