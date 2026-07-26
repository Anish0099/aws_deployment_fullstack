# 🚀 AWS Deployment Guide — Employee Management System (IaC & Containerized)

This guide details the modern deployment workflow transitioning from manual AWS Console steps to **Infrastructure as Code (Terraform)**, **Containerized Backend (Docker + AWS ECS/ECR)**, and **CI/CD Automation (GitHub Actions)**.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — AWS Setup & Credentials](#step-1--aws-setup--credentials)
4. [Step 2 — Infrastructure as Code (Terraform)](#step-2--infrastructure-as-code-terraform)
5. [Step 3 — Containerizing Spring Boot](#step-3--containerizing-spring-boot)
6. [Step 4 — Automated CI/CD Deployment (GitHub Actions)](#step-4--automated-cicd-deployment-github-actions)
7. [Step 5 — React Frontend Deployment (S3 + CloudFront)](#step-5--react-frontend-deployment-s3--cloudfront)
8. [Step 6 — Database Management & DBeaver Access](#step-6--database-management--dbeaver-access)
9. [Troubleshooting](#troubleshooting)
10. [Cleanup](#cleanup)

---

---

## 🏗️ Architecture Overview

```text
                      +-----------------------------+
                      |   Users (Browser / Client)  |
                      +--------------+--------------+
                                     |
                                     | HTTPS (Port 443)
                                     v
                      +-----------------------------+
                      |    AWS CloudFront (CDN)     |
                      +--------------+--------------+
                                     |
             +-----------------------+-----------------------+
             | Static Files (/index.html, JS, CSS)           | API Calls (/api/*)
             v                                               v
+------------------------+                     +---------------------------+
|    AWS S3 Bucket       |                     | Application Load Balancer |
| (React Frontend Build) |                     |          (ALB)            |
+------------------------+                     +-------------+-------------+
                                                             |
                                                             | HTTP (Port 8080)
                                                             v
                                               +---------------------------+
                                               |     AWS ECS (Fargate)     |
                                               |   (Spring Boot Container) |
                                               +-------------+-------------+
                                                             |
                                                             | MySQL (Port 3306)
                                                             v
                                               +---------------------------+
                                               |       AWS RDS MySQL       |
                                               |        (Database)         |
                                               +---------------------------+

### Component Summary

| Component | AWS Service / Tool | Purpose |
| :--- | :--- | :--- |
| **Infrastructure** | Terraform | Automated provisioning of VPC, Subnets, Security Groups, RDS, and ECS |
| **Backend API** | AWS ECS / ECR | Runs the Spring Boot Docker container |
| **Database** | AWS RDS (MySQL 8.0) | Relational database managed via Terraform |
| **Frontend** | S3 + CloudFront | Static hosting, global CDN, and SSL/HTTPS termination |
| **CI/CD** | GitHub Actions | Automated build, Docker push, and Terraform execution on `git push` |

---

## 2. Prerequisites

Before deploying, ensure you have installed:

* **AWS CLI** configured (`aws configure`)
* **Terraform CLI** installed locally
* **Docker Engine / Desktop** running
* **Git** and a **GitHub Repository** for your code

---

## Step 1 — AWS Setup & Credentials

### 1.1 Create IAM User for Deployment
1. Open **AWS Console** $\rightarrow$ **IAM** $\rightarrow$ **Users** $\rightarrow$ **Create User**.
2. Name: `github-actions-deployer`.
3. Attach policies: `AdministratorAccess` (or fine-grained ECS/RDS/S3 policies).
4. Generate an **Access Key** and **Secret Access Key**. Save these securely!

### 1.2 Store Secrets in GitHub
In your GitHub repository:
1. Navigate to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Add the following secrets:
   * `AWS_ACCESS_KEY_ID`: Your IAM user access key.
   * `AWS_SECRET_ACCESS_KEY`: Your IAM user secret key.
   * `AWS_REGION`: e.g., `us-east-1`.

---

## Step 2 — Infrastructure as Code (Terraform)

Store all infrastructure files inside an `infra/` folder in your project repository.

### 2.1 Database Infrastructure (`infra/rds.tf`)

```hcl
# 1. DB Subnet Group
resource "aws_db_subnet_group" "default" {
  name       = "ems-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
}

# 2. Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "rds-security-group"
  description = "Allow inbound MySQL traffic from ECS tasks and local management tools"
  vpc_id      = data.aws_vpc.default.id

  # Allow connection from ECS tasks
  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  # Optional: Allow connection from DBeaver/Local Machine for testing
  ingress {
    from_port   = 3306
    to_port     = 3306
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

# 3. RDS MySQL Instance
resource "aws_db_instance" "mysql" {
  identifier             = "ems-mysql-db"
  allocated_storage      = 20
  db_name                = "emsdb"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  username               = "admin"
  password               = "**********"
  db_subnet_group_name   = aws_db_subnet_group.default.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot    = true
  publicly_accessible    = true
}
```

---

## Step 3 — Containerizing Spring Boot

Place a `Dockerfile` inside the root of your `backend/` directory:

```dockerfile
# Build Stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run Stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## Step 4 — Automated CI/CD Deployment (GitHub Actions)

Create `.github/workflows/deploy.yml` in your repository root:

```yaml
name: Deploy Infrastructure and Application

on:
  push:
    branches: [ "main" ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Code
      uses: actions/checkout@v3

    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ secrets.AWS_REGION }}

    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v2

    - name: Terraform Init & Apply
      run: |
        cd infra
        terraform init
        terraform apply -auto-approve

    - name: Build and Push Docker Image to ECR
      run: |
        aws ecr get-login-password --region ${{ secrets.AWS_REGION }} | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
        docker build -t ems-backend ./backend
        docker tag ems-backend:latest ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}[.amazonaws.com/ems-backend:latest](https://.amazonaws.com/ems-backend:latest)
        docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}[.amazonaws.com/ems-backend:latest](https://.amazonaws.com/ems-backend:latest)
```

---

## Step 5 — React Frontend Deployment (S3 + CloudFront)

### 5.1 Build Frontend Locally or in Pipeline
```bash
cd frontend
echo "VITE_API_URL=http://YOUR_ECS_ALB_ENDPOINT/api" > .env.production
npm run build
```

### 5.2 Upload Build Files to S3
```bash
aws s3 sync dist/ s3://YOUR_S3_BUCKET_NAME/ --delete
```

### 5.3 Configure CloudFront Fallback for React Router
When using client-side routing (e.g., React Router), configure custom error responses on your CloudFront distribution:
* **HTTP Error Code**: `403` & `404`
* **Response Page Path**: `/index.html`
* **HTTP Response Code**: `200`

---

## Step 6 — Database Management & DBeaver Access

To connect DBeaver directly to your RDS instance during development:

1. **Host Mode Setup**: In DBeaver, select **Connect by: Host** (do not select `URL`).
2. **Server Host**: Enter your RDS endpoint (e.g., `ems-mysql-db.cotm0qe6osd7.us-east-1.rds.amazonaws.com`).
3. **Port**: `3306`
4. **Database**: `emsdb`
5. **Credentials**: `admin` / `SuperSecretPassword123!`

> ⚠️ **Note**: Ensure `publicly_accessible = true` is declared in `rds.tf` and `cidr_blocks = ["0.0.0.0/0"]` is defined in your inbound security group rules.

---

## Troubleshooting

### ❌ `Communications link failure` / `Connect timed out` in DBeaver
* **Cause**: Inbound security group rule missing port `3306` for external traffic, or `publicly_accessible` is set to `false`.
* **Fix**: Verify `infra/rds.tf` includes `cidr_blocks = ["0.0.0.0/0"]` under `ingress` and push changes through Git.

### ❌ `Invalid JDBC URL` Error in DBeaver
* **Cause**: Connecting via `URL` radio option instead of `Host` form fields.
* **Fix**: Toggle connection settings in DBeaver from **URL** to **Host**.

### ❌ React Router returns `404 Not Found` on Page Refresh
* **Cause**: CloudFront attempting to resolve client-side routes directly against S3 object keys.
* **Fix**: Add CloudFront Error Responses mapping HTTP `403` and `404` status codes to `/index.html` with a `200` status response.

---

## Cleanup

To destroy all provisioned AWS resources and avoid extra billing:

```bash
cd infra
terraform destroy -auto-approve
```
