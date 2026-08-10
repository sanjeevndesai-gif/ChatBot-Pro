output "alb_dns" {
  value = aws_lb.alb.dns_name
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "vpc_id" {
  value = local.vpc_id_final
}
