pipeline {
    agent any

    tools {
        nodejs 'nodejs-22.6.0' // This must match the name you used in Jenkins configuration
    }

    stages {
        stage('Node Version') {
            steps {
                sh '''
                    node -v
                    npm -v
                '''
            }
        }
    }
}
