pipeline {
    agent any

    tools {
        nodejs 'nodejs-22.6.0'
    }

    environment {
        MONGO_URI = "mongodb+srv://supercluster.d83jj.mongodb.net/superData"
        APP_NAME = "solar-system"
        DOCKER_IMAGE = "prajnashetty529/${APP_NAME}:${BUILD_NUMBER}"
    }

    options {
        disableResume()
        disableConcurrentBuilds abortPrevious: true
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

        stage('Dependency Scanning') {
            parallel {
                stage('NPM Dependency Audit') {
                    steps {
                        sh '''
                            npm audit --audit-level=critical
                            echo $?
                        '''
                    }
                }

                stage('OWASP Dependency Check') {
                    steps {
                        dependencyCheck additionalArguments: '''
                            --scan './'
                            --out './'
                            --format 'ALL'
                            --prettyPrint
                        ''', odcInstallation: 'owasp-dbcheck-10'

                        dependencyCheckPublisher failedTotalCritical: 1, pattern: 'dependency-check-report.xml', stopBuild: true

                        junit allowEmptyResults: true, keepProperties: true, testResults: 'dependency-check-junit.xml'

                        publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: './',
                            reportFiles: 'dependency-check-jenkins.html',
                            reportName: 'Dependency Check HTML Report',
                            reportTitles: '',
                            useWrapperFileDirectly: true
                        ])
                    }
                }
            }
        }

        stage('Unit Testing') {
            options {
                retry(2)
            }
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'mongo-db-credentials',
                        passwordVariable: 'MONGO_PASSWORD',
                        usernameVariable: 'MONGO_USERNAME'
                    )
                ]) {
                    sh 'npm test'
                }
                junit allowEmptyResults: true, testResults: 'test-results.xml'
            }
        }

        stage('Code Coverage') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'mongo-db-credentials',
                        passwordVariable: 'MONGO_PASSWORD',
                        usernameVariable: 'MONGO_USERNAME'
                    )
                ]) {
                    catchError(buildResult: 'SUCCESS', message: 'Oops! it will be fixed in future releases', stageResult: 'UNSTABLE') {
                        sh 'npm run coverage'
                    }
                }
                publishHTML([
                    allowMissing: true,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'coverage/lcov-report',
                    reportFiles: 'index.html',
                    reportName: 'Code Coverage HTML Report',
                    reportTitles: '',
                    useWrapperFileDirectly: true
                ])
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("${DOCKER_IMAGE}")
                }
            }
        }

        stage('Push Docker Image to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    script {
                        docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-creds') {
                            dockerImage.push()
                        }
                    }
                }
            }
        }
    }
}
