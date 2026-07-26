# 1. DB Subnet Group using Private DB Subnets
resource "aws_db_subnet_group" "default" {
  name       = "ems-db-subnet-group"
  subnet_ids = aws_subnet.private_db[*].id
}

# 2. Security Group (Port 3306 ONLY from ECS tasks)
resource "aws_security_group" "rds" {
  name        = "rds-security-group"
  description = "Allow inbound MySQL traffic from ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 3. Private RDS Instance
resource "aws_db_instance" "mysql" {
  identifier             = "ems-mysql-db"
  allocated_storage      = 20
  db_name                = "emsdb"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  username               = "admin"
  password               = "SuperSecretPassword123!"
  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot    = true
  publicly_accessible    = false # Hardened: No public access
}