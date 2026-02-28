pipeline {
    agent any

    environment {
        // 镜像名称
        IMAGE_NAME = 'omnibase'
        // 容器名称
        CONTAINER_NAME = 'omnibase-container'
        // 端口映射：宿主机端口:容器内端口
        PORT_MAPPING = '3500:3500'
    }

    stages {
        stage('Checkout Code') {
            steps {
                // 从配置的 Git 仓库拉取代码
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "开始构建 Docker 镜像: ${IMAGE_NAME}"
                    // 构建 Docker 镜像
                    // 注：如果 Jenkins 跑在 Windows 原生环境，请将 sh 换成 bat
                    sh "docker build -t ${IMAGE_NAME} ."
                }
            }
        }

        stage('Deploy / Run Container') {
            steps {
                script {
                    echo "部署 Docker 容器: ${CONTAINER_NAME}"
                    
                    // 检查并停止、删除已存在的同名容器
                    sh """
                        if [ "\$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
                            echo "Stopping existing container..."
                            docker stop ${CONTAINER_NAME} || true
                            echo "Removing existing container..."
                            docker rm -f ${CONTAINER_NAME} || true
                        fi
                    """

                    // 运行新的容器
                    sh "docker run -d --name ${CONTAINER_NAME} -p ${PORT_MAPPING} --restart unless-stopped ${IMAGE_NAME}"
                }
            }
        }

        stage('Clean Up') {
            steps {
                script {
                    echo "清理悬空(dangling)的旧镜像..."
                    sh "docker image prune -f"
                }
            }
        }
    }
}
