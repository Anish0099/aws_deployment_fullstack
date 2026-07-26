# Fetch Default VPC & Subnets automatically
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group to allow inbound traffic to Frontend (80) and Backend (8080)
resource "aws_security_group" "ecs_tasks" {
  name        = "ecs-tasks-security-group"
  description = "Allow HTTP inbound traffic for fullstack app"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"
}

# Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "fullstack-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name         = "backend"
      image        = "${aws_ecr_repository.backend.repository_url}:latest"
      essential    = true
      portMappings = [
      {
        containerPort = 8080
        hostPort      = 8080
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/fullstack-app"
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "backend"
        "awslogs-create-group"  = "true"
      }
    }
    },
    {
      name         = "frontend"
      image        = "${aws_ecr_repository.frontend.repository_url}:latest"
      essential    = true
      portMappings = [
      {
        containerPort = 80
        hostPort      = 80
      }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/fullstack-app"
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "frontend"
        "awslogs-create-group"  = "true"
      }
    }
  }
  ])
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = "fullstack-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
}

# Pre-creates the log group in CloudWatch
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/fullstack-app"
  retention_in_days = 7
}