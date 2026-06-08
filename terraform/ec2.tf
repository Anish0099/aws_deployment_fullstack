# Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

# EC2 Instance
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type

  subnet_id                   = aws_subnet.public_1.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true

  key_name                    = "ems-keypair"

  user_data = <<-EOF
    #!/bin/bash
    # Update system
    dnf update -y
    
    # Install Java 21 & Maven
    dnf install -y java-21-amazon-corretto-devel maven git
    
    # Create directory and set permissions
    mkdir -p /home/ec2-user/aws_fullstack_deploy
    chown ec2-user:ec2-user /home/ec2-user/aws_fullstack_deploy
    
    # Clone the repository
    sudo -u ec2-user git clone https://github.com/Anish0099/aws_deployment_fullstack.git /home/ec2-user/aws_fullstack_deploy || true
    
    # Set up environment variables
    cat <<EOT > /etc/environment
    DB_HOST=${aws_db_instance.mysql.address}
    DB_PORT=3306
    DB_NAME=${var.db_name}
    DB_USERNAME=${var.db_username}
    DB_PASSWORD=${var.db_password}
    JAVA_HOME=/usr/lib/jvm/java-21-amazon-corretto
    EOT
    
    # Note: If the repo doesn't exist publicly, you'd need to SCP it or use IAM roles to pull from S3.
    # Assuming the code is uploaded, we set up a systemd service:
    
    cat <<EOT > /etc/systemd/system/ems.service
    [Unit]
    Description=Employee Management System - Spring Boot
    After=network.target

    [Service]
    User=ec2-user
    WorkingDirectory=/home/ec2-user/aws_fullstack_deploy/backend
    # Run maven locally for now or assume pre-built jar
    ExecStartPre=/usr/bin/mvn clean package -DskipTests
    ExecStart=/usr/bin/java -jar target/ems-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
    EnvironmentFile=/etc/environment
    Restart=always
    RestartSec=10
    StandardOutput=syslog
    StandardError=syslog

    [Install]
    WantedBy=multi-user.target
    EOT
    
    systemctl daemon-reload
    systemctl enable ems
    systemctl start ems
  EOF

  tags = {
    Name = "ems-backend"
  }
}
