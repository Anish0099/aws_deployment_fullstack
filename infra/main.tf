terraform {
  backend "s3" {
    bucket = "my-app-tfstate-911167889594" # Globally unique bucket name
    key    = "production/terraform.tfstate"
    region = "us-east-1"                  # Set to your AWS region
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"                    # Set to your AWS region
}