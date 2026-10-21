pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        AWS_REGION     = 'ap-south-1'
        AWS_ACCOUNT_ID = 'REPLACE_WITH_YOUR_12_DIGIT_ACCOUNT_ID'
        ECR_REPO       = 'cca2-task-tracker'
        ECR_REGISTRY   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    if (env.AWS_ACCOUNT_ID.contains('REPLACE')) {
                        error('Set AWS_ACCOUNT_ID in the Jenkinsfile first.')
                    }
                    env.GIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_SHORT}"
                    env.IMAGE_URI = "${env.ECR_REGISTRY}/${env.ECR_REPO}:${env.IMAGE_TAG}"
                }
                echo "Image for this build: ${env.IMAGE_URI}"
            }
        }

        stage('Build and Test') {
            steps {
                sh '''
                    node --version
                    npm --version
                    npm ci
                    npm run lint
                    npm test
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    docker build -t "$IMAGE_URI" -t "$ECR_REGISTRY/$ECR_REPO:latest" .
                    docker images "$ECR_REGISTRY/$ECR_REPO"
                '''
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-ecr-creds',
                                                  usernameVariable: 'AWS_ACCESS_KEY_ID',
                                                  passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh '''
                        set +x
                        aws ecr get-login-password --region "$AWS_REGION" | \
                            docker login --username AWS --password-stdin "$ECR_REGISTRY"
                        set -x
                        docker push "$IMAGE_URI"
                        docker push "$ECR_REGISTRY/$ECR_REPO:latest"
                    '''
                }
            }
        }

        stage('Deploy to Minikube') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'aws-ecr-creds',
                                                  usernameVariable: 'AWS_ACCESS_KEY_ID',
                                                  passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh '''
                        # ECR tokens expire after 12h, so refresh the pull secret on every run
                        set +x
                        ECR_PASSWORD=$(aws ecr get-login-password --region "$AWS_REGION")
                        kubectl create secret docker-registry ecr-secret \
                            --docker-server="$ECR_REGISTRY" \
                            --docker-username=AWS \
                            --docker-password="$ECR_PASSWORD" \
                            --dry-run=client -o yaml | kubectl apply -f -
                        set -x

                        sed -e "s|IMAGE_PLACEHOLDER|$IMAGE_URI|" \
                            -e "s|VERSION_PLACEHOLDER|$IMAGE_TAG|" \
                            k8s/deployment.yaml | kubectl apply -f -
                        kubectl apply -f k8s/service.yaml
                        kubectl rollout status deployment/task-tracker --timeout=180s
                    '''
                }
            }
        }

        stage('Verification') {
            steps {
                sh '''
                    kubectl get deployment task-tracker
                    kubectl get pods -l app=task-tracker -o wide
                    kubectl get svc task-tracker

                    MINIKUBE_IP=$(minikube ip)
                    curl -fsS --retry 5 --retry-delay 3 --retry-connrefused "http://$MINIKUBE_IP:30080/health"
                    echo
                    curl -fsS "http://$MINIKUBE_IP:30080/api/info"
                    echo
                '''
            }
        }
    }

    post {
        success {
            echo "Deployed ${env.IMAGE_URI} successfully."
        }
        failure {
            echo 'Pipeline failed - check the logs of the failed stage.'
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
