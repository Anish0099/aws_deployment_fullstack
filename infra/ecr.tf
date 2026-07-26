resource "aws_ecr_repository" "backend" {
  name                 = "my-app-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

resource "aws_ecr_repository" "frontend" {
  name                 = "my-app-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}