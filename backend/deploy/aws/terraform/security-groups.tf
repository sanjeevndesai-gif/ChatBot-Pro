/* Security groups: ALB and service groups */
resource "aws_security_group" "alb" {
  name   = "${local.prefix}-alb-sg"
  vpc_id = local.vpc_id_final
  description = "ALB security group"
  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = [var.ingress_cidr]
  }
  ingress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = [var.ingress_cidr]
  }
  egress { from_port=0; to_port=0; protocol="-1"; cidr_blocks=["0.0.0.0/0"] }
  tags = { Name = "${local.prefix}-alb-sg" }
}

resource "aws_security_group" "gateway_svc" {
  name = "${local.prefix}-gateway-svc-sg"
  vpc_id = local.vpc_id_final
  description = "Gateway service security group, allow from ALB only"
  ingress {
    from_port = 8080
    to_port = 8080
    protocol = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress { from_port=0; to_port=0; protocol="-1"; cidr_blocks=["0.0.0.0/0"] }
}

resource "aws_security_group" "internal_svc" {
  name = "${local.prefix}-internal-sg"
  vpc_id = local.vpc_id_final
  description = "Internal service security group for DB/Redis access"
  ingress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = [cidrsubnet(aws_vpc.main[0].cidr_block, 0, 0)]
    # If using existing VPC the above may not apply; review in prod
  }
  egress { from_port=0; to_port=0; protocol="-1"; cidr_blocks=["0.0.0.0/0"] }
}
