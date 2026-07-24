pipeline {
    agent any

    environment {
        SONAR_HOST_URL = 'http://sonarqube:9000'
        SONAR_TOKEN = credentials('sonar-token')
        DB_URL = 'jdbc:postgresql://postgres:5432/claudelens'
        MONGO_URI = 'mongodb://mongodb:27017/claudelens'
        REDIS_HOST = 'redis'
    }

    stages {

        stage('체크아웃') {
            steps {
                checkout scm
            }
        }

        stage('백엔드 빌드') {
            steps {
                dir('backend') {
                    sh './gradlew clean build -x test'
                }
            }
        }

        stage('백엔드 테스트') {
            steps {
                dir('backend') {
                    sh './gradlew test'
                }
            }
            post {
                always {
                    junit 'backend/build/test-results/test/*.xml'
                }
            }
        }

        stage('SonarQube 분석') {
            steps {
                dir('backend') {
                    sh """
                        ./gradlew sonar \
                        -Dsonar.projectKey=claude-lens-backend \
                        -Dsonar.projectName='Claude Lens Backend' \
                        -Dsonar.host.url=${SONAR_HOST_URL} \
                        -Dsonar.token=${SONAR_TOKEN}
                    """
                }
            }
        }

        stage('프론트엔드 빌드') {
            when {
                changeset 'frontend/**'
            }
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

    }

    post {
        success {
            echo '✅ 파이프라인 성공!'
        }
        failure {
            echo '❌ 파이프라인 실패!'
        }
    }
}
