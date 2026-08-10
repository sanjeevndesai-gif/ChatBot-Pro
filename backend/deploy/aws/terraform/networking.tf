/* VPC + subnets (create when create_vpc = true) */
resource "aws_vpc" "main" {
  count = var.create_vpc ? 1 : 0
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "${local.prefix}-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "igw" {
  count = var.create_vpc ? 1 : 0
  vpc_id = aws_vpc.main[0].id
  tags = { Name = "${local.prefix}-igw" }
}

resource "aws_subnet" "public" {
  count = var.create_vpc ? 2 : 0
  vpc_id = aws_vpc.main[0].id
  cidr_block = cidrsubnet(aws_vpc.main[0].cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${local.prefix}-public-${count.index+1}" }
}

resource "aws_subnet" "private" {
  count = var.create_vpc ? 2 : 0
  vpc_id = aws_vpc.main[0].id
  cidr_block = cidrsubnet(aws_vpc.main[0].cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false
  tags = { Name = "${local.prefix}-private-${count.index+1}" }
}

data "aws_availability_zones" "available" {}

resource "aws_route_table" "public" {
  count = var.create_vpc ? 1 : 0
  vpc_id = aws_vpc.main[0].id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw[0].id
  }
  tags = { Name = "${local.prefix}-public-rt" }
}

resource "aws_route_table_association" "public_assoc" {
  count = var.create_vpc ? length(aws_subnet.public) : 0
  subnet_id = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

/* If user provided subnets and vpc, expose them as data sources via locals */
locals {
  public_subnets = var.create_vpc ? aws_subnet.public[*].id : var.public_subnet_ids
  private_subnets = var.create_vpc ? aws_subnet.private[*].id : var.private_subnet_ids
  vpc_id_final = var.create_vpc ? (aws_vpc.main[0].id) : var.vpc_id
}
