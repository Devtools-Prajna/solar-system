pipeline {
    agent any

    tools {
        nodejs 'nodejs-22.6.0'
    }

    environment {
        MONGO_URI       = "mongodb+srv://supercluster.d83jj.mongodb.net/superData"
        MONGO_DB_Creds  = credentials('mongo-db-credentials')
        MONGO_USERNAME  = credentials('mongo-db-username')
        MONGO_PASSWORD  = credentials('mongo-db-password')
    }

    options {
        disableResume()
        disableConcurrentBuilds(abortPrevious: true)
    }

    stages {
        stage('Installing Dependencies') {
            options {
                timestamps()
            }
            steps {
                sh 'npm install --no-audit'
            }
        }

        stage('NPM Dependency Audit') {
            steps {
                sh '''
                    npm audit --audit-level=critical
                    echo $?
                '''
            }
        }

      stage('Unit Testing') {
            options {
                retry(2)
            }
            steps {
                sh 'echo Colon-Separated - $MONGO_DB_Creds'
                sh 'echo Username - $MONGO_USERNAME'
                sh 'echo Password - $MONGO_PASSWORD'
                sh 'npm test'
            }
        }

        stage('Code Coverage') {
            steps {
                catchError(buildResult: 'SUCCESS', message: 'Oops! It will be fixed in future releases', stageResult: 'UNSTABLE') {
                    sh 'npm run coverage'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'printenv'
                sh 'docker build -t prajnashetty529/solar-system:$GIT_COMMIT .'
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([string(credentialsId: 'DOCKER_PAT', variable: 'DOCKER_PAT')]) {
                    sh '''
                        echo "Logging in to Docker Hub..."
                        echo "$DOCKER_PAT" | docker login -u prajnashetty529 --password-stdin

                        echo "Pushing image to Docker Hub..."
                        docker push prajnashetty529/solar-system:$GIT_COMMIT
                    '''
                }
            }
        }

        stage('Deploy Temporary Container for ZAP Scan') {
            steps {
                sh '''
                    CONTAINER_ID=$(docker ps -a -q -f name=^/solar-temp-container$)
                    if [ ! -z "$CONTAINER_ID" ]; then
                      docker rm -f $CONTAINER_ID
                    fi

                    docker run -d -p 8081:3000 --name solar-temp-container prajnashetty529/solar-system:$GIT_COMMIT
                    sleep 10
                '''
            }
        }

        stage('OWASP ZAP DAST Scan') {
            environment {
                ZAP_TARGET = 'http://localhost:8081'
            }
            steps {
                sh '''
                    chmod 777 $(pwd)
                    docker run -v $(pwd):/zap/wrk/:rw ghcr.io/zaproxy/zap-api-scan.py \
                        -t ${ZAP_TARGET} \
                        -f openapi \
                        -r zap-report.html \
                        -w zap-report.md \
                        -J zap-report.json \
                        -x zap-report.xml
                '''
            }
        }

        stage('Upload ZAP Reports to AWS S3') {
            environment {
                AWS_REGION = 'US East (N. Virginia) us-east-1' // Set your actual AWS region here
                S3_BUCKET = 'appsolar' // Replace with your actual S3 bucket name
            }
            steps {
                withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-jenkins-creds']]) {
                    sh '''
                        aws s3 cp zap-report.html s3://${S3_BUCKET}/zap-report.html --region ${AWS_REGION}
                        aws s3 cp zap-report.json s3://${S3_BUCKET}/zap-report.json --region ${AWS_REGION}
                        aws s3 cp zap-report.xml s3://${S3_BUCKET}/zap-report.xml --region ${AWS_REGION}
                    '''
                }
            }
        }

        stage('Stop Temporary Container') {
            steps {
                sh '''
                    docker stop solar-temp-container || true
                    docker rm solar-temp-container || true
                '''
            }
        }
        
        stage('Approval for Production Deployment') {
            steps {
                script {
                    def approvedBy = input(
                        message: 'Approve Production Deployment?',
                        parameters: [string(name: 'AdminUser', description: 'Enter admin username')]
                    )
                    if (approvedBy != 'admin') {
                        error("Only admin can approve the deployment")
                    }
                }
            }
        }

        stage('Deploy to Azure Web App') {
            environment {
                APP_NAME = 'solar-system-app' // Customize your app name
            }
            steps {
                withCredentials([file(credentialsId: 'azure-publish-profiles', variable: 'PUBLISH_PROFILE')]) {
                    sh '''
                        zip -r ${APP_NAME}.zip .
                        PUBLISH_URL=$(xmllint --xpath "string(//publishProfile[@publishMethod='MSDeploy']/publishUrl)" $PUBLISH_PROFILE)
                        USERNAME=$(xmllint --xpath "string(//publishProfile[@publishMethod='MSDeploy']/userName)" $PUBLISH_PROFILE)
                        PASSWORD=$(xmllint --xpath "string(//publishProfile[@publishMethod='MSDeploy']/userPWD)" $PUBLISH_PROFILE)

                        curl -X POST -u $USERNAME:$PASSWORD --data-binary @${APP_NAME}.zip https://$PUBLISH_URL/api/zipdeploy
                    '''
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'test-results.xml'

            publishHTML([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'coverage/lcov-report',
                reportFiles: 'index.html',
                reportName: 'Code Coverage HTML Report'
            ])

            archiveArtifacts artifacts: 'zap-report.*', fingerprint: true
            echo "ZAP reports archived and uploaded."
        }
    }
}
