# DB Subnet Group
resource "aws_db_subnet_group" "default" {
  name       = "ems-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name = "EMS DB Subnet Group"
  }
}

# RDS Instance
resource "aws_db_instance" "mysql" {
  identifier        = "ems-database"
  engine            = "mysql"
  engine_version    = "8.0"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  publicly_accessible = false
  skip_final_snapshot = true

  # For Free Tier limits
  multi_az                = false
  backup_retention_period = 0
}
