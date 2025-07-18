pipeline {
    agent any

    tools {
        nodejs 'nodejs-22.6.0'
    }
    environment {
        // You can build the full MONGO_URI using the injected credentials
        MONGO_URI = ""
    }
    stages {
        stage('Installing Dependencies') {
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
                        publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'dependency-check-jenkins.html', reportName: 'Dependency Check HTML Report', reportTitles: '', useWrapperFileDirectly: true])
                        junit allowEmptyResults: true, testResults: 'dependency-check-junit.xml'
                    }
                }
                stage('Unit Testing') {
                    steps {
                        withCredentials([
                            string(credentialsId: 'mongo-username', variable: 'MONGO_USERNAME'),
                            string(credentialsId: 'mongo-password', variable: 'MONGO_PASSWORD')
                        ]) {
                            script {
                                // Build your full Mongo URI including credentials here
                                env.MONGO_URI = "mongodb+srv://${env.MONGO_USERNAME}:${env.MONGO_PASSWORD}@supercluster.d83jj.mongodb.net/superData"
                            }
                            sh '''
                                echo "Testing with Mongo URI: $MONGO_URI"
                                npm test
                            '''
                        }
                    }
                }
            }
        }
    }
}

