# 🚀 AWS Deployment Guide — Employee Management System

A step-by-step, beginner-friendly guide to deploying your Spring Boot + React application to AWS.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Step 1 — AWS Account Setup](#step-1--aws-account-setup)
4. [Step 2 — Create a VPC & Networking](#step-2--create-a-vpc--networking)
5. [Step 3 — Create Security Groups](#step-3--create-security-groups)
6. [Step 4 — Launch RDS MySQL Database](#step-4--launch-rds-mysql-database)
7. [Step 5 — Launch EC2 Instance (Backend)](#step-5--launch-ec2-instance-backend)
8. [Step 6 — Deploy Spring Boot to EC2](#step-6--deploy-spring-boot-to-ec2)
9. [Step 7 — Deploy React to S3 + CloudFront](#step-7--deploy-react-to-s3--cloudfront)
10. [Step 8 — Connect Everything](#step-8--connect-everything)
11. [Step 9 — Verify Deployment](#step-9--verify-deployment)
12. [Troubleshooting](#troubleshooting)
13. [Cost Summary](#cost-summary)
14. [Cleanup](#cleanup)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         AWS Cloud                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                    VPC (10.0.0.0/16)                  │    │
│  │                                                       │    │
│  │  ┌─────────────────────┐  ┌────────────────────────┐  │    │
│  │  │  Public Subnet      │  │  Private Subnet        │  │    │
│  │  │  (10.0.1.0/24)      │  │  (10.0.2.0/24)         │  │    │
│  │  │                     │  │                        │  │    │
│  │  │  ┌───────────────┐  │  │  ┌──────────────────┐  │  │    │
│  │  │  │ EC2 Instance  │  │  │  │ RDS MySQL        │  │  │    │
│  │  │  │ Spring Boot   │──┼──┼─►│ Employee DB      │  │  │    │
│  │  │  │ (t2.micro)    │  │  │  │ (db.t3.micro)    │  │  │    │
│  │  │  └───────────────┘  │  │  └──────────────────┘  │  │    │
│  │  └─────────────────────┘  └────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────┐    ┌───────────────────────┐               │
│  │ CloudFront   │───►│ S3 Bucket             │               │
│  │ (CDN/HTTPS)  │    │ React Static Files    │               │
│  └──────────────┘    └───────────────────────┘               │
└──────────────────────────────────────────────────────────────┘

User → CloudFront (React UI) → API calls → EC2 (Spring Boot) → RDS (MySQL)
```

**What goes where:**
| Component | AWS Service | Why? |
|-----------|-------------|------|
| React Frontend | S3 + CloudFront | Static files, global CDN, HTTPS |
| Spring Boot API | EC2 (t2.micro) | Runs the Java application |
| MySQL Database | RDS (db.t3.micro) | Managed database, auto-backups |

---

## 2. Prerequisites

Before you begin, make sure you have:

- [ ] An **AWS Account** (sign up at [aws.amazon.com](https://aws.amazon.com))
- [ ] **AWS CLI** installed on your local machine ([Install Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- [ ] Your project built and tested locally
- [ ] A basic understanding of terminal/command line

> **💡 Free Tier Note**: Everything in this guide uses AWS Free Tier eligible resources. You won't be charged anything for 12 months if you stay within limits (750 hrs EC2 t2.micro, 750 hrs RDS db.t3.micro, 5GB S3).

---

## Step 1 — AWS Account Setup

### 1.1 Create Your AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com) → Click **"Create an AWS Account"**
2. Enter your email, password, and account name
3. Add payment information (you won't be charged on Free Tier)
4. Choose the **"Basic Support - Free"** plan

### 1.2 Set Up Billing Alerts (IMPORTANT!)

This prevents surprise charges:

1. Go to **AWS Console** → Search **"Billing"** → Click **"Billing and Cost Management"**
2. Click **"Budgets"** in the left sidebar → **"Create a budget"**
3. Choose **"Monthly cost budget"**
4. Set budget amount: **$5** (or any amount)
5. Add your email for alerts → **Create**

### 1.3 Create an IAM User (Best Practice)

Never use the root account for daily work:

1. Go to **IAM** → **"Users"** → **"Create user"**
2. Username: `admin-user`
3. Check **"Provide user access to the AWS Management Console"**
4. Select **"I want to create an IAM user"**
5. Set a custom password
6. Click **"Next"** → **"Attach policies directly"**
7. Search and select: **`AdministratorAccess`**
8. Click **"Create user"**
9. **Save the sign-in URL** — you'll use this to log in going forward

---

## Step 2 — Create a VPC & Networking

A VPC (Virtual Private Cloud) is your own isolated network in AWS.

### 2.1 Create VPC

1. Go to **VPC Dashboard** → Click **"Create VPC"**
2. Choose **"VPC and more"** (this creates subnets automatically!)
3. Configure:
   - **Name tag auto-generation**: `ems`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **Number of Availability Zones**: `2`
   - **Number of public subnets**: `2`
   - **Number of private subnets**: `2`
   - **NAT gateways**: `None` (saves money — we don't need it)
   - **VPC endpoints**: `None`
4. Click **"Create VPC"**

> This creates: 1 VPC, 2 Public Subnets, 2 Private Subnets, 1 Internet Gateway, and Route Tables — all connected automatically!

### 2.2 Verify Your Networking

After creation, you should see:
- **VPC**: `ems-vpc`
- **Subnets**: `ems-subnet-public1`, `ems-subnet-public2`, `ems-subnet-private1`, `ems-subnet-private2`
- **Internet Gateway**: `ems-igw` (attached to VPC)

---

## Step 3 — Create Security Groups

Security Groups are virtual firewalls that control inbound/outbound traffic.

### 3.1 EC2 Security Group

1. Go to **EC2 Dashboard** → **"Security Groups"** → **"Create security group"**
2. Configure:
   - **Name**: `ems-ec2-sg`
   - **Description**: Security group for Spring Boot EC2 instance
   - **VPC**: Select `ems-vpc`
3. **Inbound Rules** — Click "Add rule" for each:

   | Type | Port | Source | Description |
   |------|------|--------|-------------|
   | SSH | 22 | My IP | SSH access from your machine |
   | Custom TCP | 8080 | 0.0.0.0/0 | Spring Boot API access |
   | HTTPS | 443 | 0.0.0.0/0 | HTTPS (optional, for later) |

4. **Outbound Rules**: Keep the default (Allow all traffic)
5. Click **"Create security group"**

### 3.2 RDS Security Group

1. Create another security group:
   - **Name**: `ems-rds-sg`
   - **Description**: Security group for RDS MySQL
   - **VPC**: Select `ems-vpc`
2. **Inbound Rules**:

   | Type | Port | Source | Description |
   |------|------|--------|-------------|
   | MySQL/Aurora | 3306 | `ems-ec2-sg` | Only EC2 can access the database |

   > ⚠️ **IMPORTANT**: Set the Source to the **EC2 Security Group** (`ems-ec2-sg`), NOT an IP address. This means only your EC2 instance can talk to the database.

3. Click **"Create security group"**

---

## Step 4 — Launch RDS MySQL Database

### 4.1 Create a Subnet Group

RDS needs to know which subnets to use:

1. Go to **RDS Dashboard** → **"Subnet groups"** → **"Create DB subnet group"**
2. Configure:
   - **Name**: `ems-db-subnet-group`
   - **VPC**: Select `ems-vpc`
   - **Availability Zones**: Select both AZs
   - **Subnets**: Select both **private** subnets (`ems-subnet-private1`, `ems-subnet-private2`)
3. Click **"Create"**

### 4.2 Launch the RDS Instance

1. Go to **RDS Dashboard** → **"Create database"**
2. Configure:
   - **Creation method**: Standard Create
   - **Engine**: MySQL
   - **Engine Version**: MySQL 8.0.x (latest)
   - **Templates**: ⭐ **Free tier**
   - **DB instance identifier**: `ems-database`
   - **Master username**: `admin`
   - **Master password**: Choose a strong password → **SAVE THIS!**
   
3. Instance configuration:
   - **DB instance class**: `db.t3.micro` (Free Tier)
   
4. Storage:
   - **Storage type**: gp2
   - **Allocated storage**: 20 GB
   - ❌ **Uncheck** "Enable storage autoscaling" (prevents surprise costs)
   
5. Connectivity:
   - **VPC**: `ems-vpc`
   - **DB subnet group**: `ems-db-subnet-group`
   - **Public access**: ❌ **No** (security best practice!)
   - **VPC security group**: Select `ems-rds-sg`
   
6. Additional configuration:
   - **Initial database name**: `emsdb`
   - ❌ **Uncheck** "Enable automated backups" (saves cost for learning)
   - ❌ **Uncheck** "Enable Enhanced Monitoring"

7. Click **"Create database"** — this takes ~5-10 minutes

### 4.3 Get Your RDS Endpoint

Once the status shows **"Available"**:
1. Click on your database → find the **Endpoint**
2. It looks like: `ems-database.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com`
3. **Save this endpoint** — you'll need it when configuring Spring Boot

---

## Step 5 — Launch EC2 Instance (Backend)

### 5.1 Launch the Instance

1. Go to **EC2 Dashboard** → **"Launch instance"**
2. Configure:
   - **Name**: `ems-backend`
   - **AMI**: Amazon Linux 2023 (Free Tier eligible)
   - **Instance type**: `t2.micro` (Free Tier)
   - **Key pair**: 
     - Click **"Create new key pair"**
     - Name: `ems-keypair`
     - Type: RSA
     - Format: `.pem` (for Mac/Linux) or `.ppk` (for Windows/PuTTY)
     - Click **"Create"** → **SAVE THE DOWNLOADED FILE!**
   
3. Network settings → Click **"Edit"**:
   - **VPC**: `ems-vpc`
   - **Subnet**: Select a **public** subnet (`ems-subnet-public1`)
   - **Auto-assign public IP**: ✅ **Enable**
   - **Select existing security group**: `ems-ec2-sg`

4. Storage: 8 GB (default, Free Tier)
5. Click **"Launch instance"**

### 5.2 Connect to Your Instance

Wait 1-2 minutes for the instance to start, then:

#### Option A: SSH from Terminal (Mac/Linux)

```bash
# Set correct permissions on your key file
chmod 400 ~/Downloads/ems-keypair.pem

# Connect via SSH
ssh -i ~/Downloads/ems-keypair.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

#### Option B: EC2 Instance Connect (Easiest)

1. Select your instance → Click **"Connect"**
2. Choose **"EC2 Instance Connect"** tab
3. Click **"Connect"** — opens a terminal in your browser!

---

## Step 6 — Deploy Spring Boot to EC2

Once connected to your EC2 instance:

### 6.1 Install Java & Maven

```bash
# Update the system
sudo dnf update -y

# Install Java 17
sudo dnf install java-17-amazon-corretto-devel -y

# Verify Java installation
java -version

# Install Maven
sudo dnf install maven -y

# Verify Maven
mvn -version
```

### 6.2 Install Git & Clone Your Project

```bash
# Install Git
sudo dnf install git -y

# Clone your project (push to GitHub first!)
git clone https://github.com/YOUR_USERNAME/aws_fullstack_deploy.git
cd aws_fullstack_deploy/backend
```

> **💡 Alternative**: If you haven't pushed to GitHub yet, you can transfer the JAR directly:
> ```bash
> # Build the JAR locally first
> mvn clean package -DskipTests
> 
> # Transfer to EC2 (from your LOCAL machine)
> scp -i ~/Downloads/ems-keypair.pem target/ems-0.0.1-SNAPSHOT.jar ec2-user@YOUR_EC2_IP:~/
> ```

### 6.3 Configure Environment Variables

Set the database connection details on your EC2 instance:

```bash
# Create an environment file
sudo nano /etc/environment

# Add these lines (replace with YOUR actual values):
DB_HOST=ems-database.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=emsdb
DB_USERNAME=admin
DB_PASSWORD=your-rds-password-here
```

Then reload:
```bash
source /etc/environment
```

### 6.4 Build & Run the Application

```bash
# Navigate to the backend directory
cd ~/aws_fullstack_deploy/backend

# Build the JAR file
mvn clean package -DskipTests

# Run with production profile
java -jar target/ems-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

If you see `Started EmsApplication in X seconds`, your backend is running! 🎉

### 6.5 Run as a Background Service (Recommended)

So the app keeps running after you disconnect:

```bash
# Create a systemd service file
sudo nano /etc/systemd/system/ems.service
```

Paste this content:
```ini
[Unit]
Description=Employee Management System - Spring Boot
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/aws_fullstack_deploy/backend
ExecStart=/usr/bin/java -jar target/ems-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
EnvironmentFile=/etc/environment
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Start the service
sudo systemctl start ems

# Enable auto-start on boot
sudo systemctl enable ems

# Check status
sudo systemctl status ems

# View logs
sudo journalctl -u ems -f
```

### 6.6 Test the API

From your **local machine**, test:
```bash
# Replace with your EC2 Public IP
curl http://YOUR_EC2_PUBLIC_IP:8080/api/employees
```

You should see `[]` (empty array) — the API is working! ✅

---

## Step 7 — Deploy React to S3 + CloudFront

### 7.1 Build React for Production

On your **local machine**, update the API URL and build:

```bash
cd frontend

# Create a production env file
echo "VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:8080/api" > .env.production

# Build for production
npm run build
```

This creates a `dist/` folder with your static files.

### 7.2 Create S3 Bucket

1. Go to **S3 Dashboard** → **"Create bucket"**
2. Configure:
   - **Bucket name**: `ems-frontend-XXXX` (must be globally unique — add random numbers)
   - **Region**: Same region as your EC2/RDS
   - ❌ **Uncheck** "Block all public access"
   - ✅ **Check** the acknowledgment box
3. Click **"Create bucket"**

### 7.3 Enable Static Website Hosting

1. Click on your bucket → **"Properties"** tab
2. Scroll to **"Static website hosting"** → **"Edit"**
3. **Enable** static website hosting
4. **Index document**: `index.html`
5. **Error document**: `index.html` (important for React Router!)
6. Click **"Save changes"**

### 7.4 Set Bucket Policy

1. Go to **"Permissions"** tab → **"Bucket policy"** → **"Edit"**
2. Paste this policy (replace `YOUR_BUCKET_NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        }
    ]
}
```

3. Click **"Save changes"**

### 7.5 Upload React Build Files

#### Option A: AWS Console

1. Click your bucket → **"Upload"**
2. Drag and drop ALL files/folders from your `dist/` folder
3. Click **"Upload"**

#### Option B: AWS CLI (Faster)

```bash
# Configure AWS CLI first (one-time setup)
aws configure
# Enter your Access Key ID, Secret Access Key, region, and output format

# Upload the build
aws s3 sync dist/ s3://YOUR_BUCKET_NAME/ --delete
```

### 7.6 Create CloudFront Distribution

CloudFront provides HTTPS and global CDN:

1. Go to **CloudFront** → **"Create distribution"**
2. Configure:
   - **Origin domain**: Select your S3 bucket's website endpoint
     > ⚠️ Use the **S3 website endpoint** (e.g., `ems-frontend-xxxx.s3-website-us-east-1.amazonaws.com`), NOT the S3 bucket directly
   - **Origin protocol policy**: HTTP Only (S3 website hosting is HTTP)
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Default root object**: `index.html`
3. Under **"Error pages"** → **"Create custom error response"**:
   - HTTP error code: `403`
   - Customize error response: Yes
   - Response page path: `/index.html`
   - HTTP response code: `200`
   - (Repeat for error code `404`)
   > This makes React Router work correctly for client-side routing
4. Click **"Create distribution"**

Wait ~5-10 minutes for CloudFront to deploy globally.

### 7.7 Get Your CloudFront URL

Once status shows **"Deployed"**, find your **Distribution domain name**:
```
d1234abcdef8.cloudfront.net
```

This is your production frontend URL! 🎉

---

## Step 8 — Connect Everything

### 8.1 Update CORS on Spring Boot

Update `WebConfig.java` to allow requests from your CloudFront domain:

```java
.allowedOrigins(
    "http://localhost:5173",
    "https://d1234abcdef8.cloudfront.net"  // Your CloudFront URL
)
```

Then rebuild and redeploy:
```bash
# On EC2
cd ~/aws_fullstack_deploy/backend
git pull  # or re-upload the JAR
mvn clean package -DskipTests
sudo systemctl restart ems
```

### 8.2 Verify the Full Stack

1. Open your CloudFront URL: `https://d1234abcdef8.cloudfront.net`
2. You should see the Employee Management System UI
3. Click "Add Employee" → Fill in the form → Click "Create"
4. The employee should appear in the table!

---

## Step 9 — Verify Deployment

Run through this checklist:

- [ ] CloudFront URL loads the React frontend
- [ ] Backend API responds: `curl http://EC2_IP:8080/api/employees`
- [ ] Can create a new employee from the frontend
- [ ] Can edit an existing employee
- [ ] Can delete an employee
- [ ] Page refreshes work correctly (React Router)

---

## Troubleshooting

### ❌ "Cannot connect to EC2"
- Check Security Group allows SSH (port 22) from your IP
- Verify the instance is in a **public** subnet
- Verify **Auto-assign public IP** is enabled

### ❌ "Spring Boot can't connect to RDS"
- Check RDS Security Group allows port 3306 from EC2 Security Group
- Verify RDS is in the same VPC as EC2
- Check environment variables are set correctly: `echo $DB_HOST`
- Make sure RDS status is "Available"

### ❌ "CORS error in browser console"
- Update `WebConfig.java` to include your CloudFront URL
- Rebuild and restart the Spring Boot service

### ❌ "React Router shows 404 on page refresh"
- Make sure CloudFront has custom error responses for 403/404 → `/index.html`
- Make sure S3 error document is set to `index.html`

### ❌ "API calls failing from frontend"
- Check `.env.production` has the correct EC2 IP and port
- Rebuild frontend: `npm run build`
- Re-upload to S3: `aws s3 sync dist/ s3://BUCKET_NAME/ --delete`
- Invalidate CloudFront cache: `aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"`

### Useful Commands on EC2
```bash
# Check if Spring Boot is running
sudo systemctl status ems

# View application logs
sudo journalctl -u ems -f --no-pager | tail -50

# Restart the application
sudo systemctl restart ems

# Check what's listening on port 8080
sudo netstat -tlnp | grep 8080
```

---

## Cost Summary

| Service | Free Tier Limit | Monthly Cost |
|---------|----------------|--------------|
| EC2 (t2.micro) | 750 hrs/month | **$0** |
| RDS (db.t3.micro) | 750 hrs/month | **$0** |
| S3 | 5 GB storage | **$0** |
| CloudFront | 1 TB transfer | **$0** |
| **Total** | | **$0/month** |

> ⚠️ Free Tier lasts **12 months** from account creation. After that, expect ~$15-25/month for this setup.

---

## Cleanup

When you're done and want to avoid charges:

```bash
# 1. Delete CloudFront distribution (disable first, then delete)
# 2. Empty and delete the S3 bucket
# 3. Terminate the EC2 instance
# 4. Delete the RDS instance (skip final snapshot)
# 5. Delete Security Groups
# 6. Delete the VPC
```

Or from the Console:
1. **RDS** → Delete database → Skip final snapshot
2. **EC2** → Terminate instance
3. **S3** → Empty bucket → Delete bucket
4. **CloudFront** → Disable → Delete distribution
5. **VPC** → Delete VPC (this cleans up subnets, route tables, etc.)

---

## 🎉 Congratulations!

You've successfully deployed a fullstack Spring Boot + React application to AWS! Here's what you've learned:

- ✅ VPC & Networking (Subnets, Internet Gateway)
- ✅ Security Groups (Firewall rules)
- ✅ RDS MySQL (Managed database)
- ✅ EC2 (Virtual server for Java apps)
- ✅ S3 (Static file hosting)
- ✅ CloudFront (CDN with HTTPS)

### Next Steps to Level Up:
1. **Add a custom domain** with Route 53 + ACM (SSL certificate)
2. **CI/CD Pipeline** with GitHub Actions to auto-deploy on push
3. **Docker** — containerize your Spring Boot app for easier deployments
4. **Elastic Beanstalk** — AWS's managed platform (even simpler deployments)
5. **Spring Security + JWT** — secure your API endpoints
