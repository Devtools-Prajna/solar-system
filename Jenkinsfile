
pipeline {
    agent any

    tools {
        nodejs 'nodejs-22.6.0'
    }

    environment {
        MONGO_URI = "mongodb+srv://supercluster.d83jj.mongodb.net/superData"
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
                withCredentials([usernamePassword(credentialsId: 'mongo-db-credentials', passwordVariable: 'MONGO_PASSWORD', usernameVariable: 'MONGO_USERNAME')]) {
                    catchError(buildResult: 'SUCCESS', message: 'Oops! it will be fixed in future releases', stageResult: 'UNSTABLE') {
                        sh 'npm run coverage'
                    }
                }
                publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            }
         }
    }
}
