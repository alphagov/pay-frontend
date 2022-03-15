#!/usr/bin/env groovy

pipeline {
  agent any

  parameters {
    string(name: 'CYPRESS_VERSION', defaultValue: '5.6.0', description: 'Cypress version number')
  }

  options {
    timestamps()
  }

  libraries {
    lib("pay-jenkins-library@master")
  }
  environment {
    CYPRESS_VERSION = "${params.CYPRESS_VERSION}"
    JAVA_HOME = "/usr/lib/jvm/java-1.11.0-openjdk-amd64"
  }

  stages {
    stage('Docker Build') {
      steps {
        script {
          buildMultistageAppWithMetrics {
            app = "frontend"
          }
        }
      }
      post {
        failure {
          postMetric("frontend.docker-build.failure", 1)
        }
      }
    }
    stage('Browser Tests') {
      steps {
        cypress('frontend')
      }
      post { 
        always { 
          script { 
            cypress.cleanUp()
          }
        }
      }
    }
    stage('Contract Tests') {
      steps {
        script {
          env.PACT_TAG = gitBranchName()
        }
        ws('contract-tests-wp') {
          runPactProviderTests("pay-connector", "${env.PACT_TAG}", "frontend")
        }
      }
      post {
        always {
          ws('contract-tests-wp') {
            deleteDir()
          }
        }
      }
    }
    stage('Docker Tag') {
      steps {
        script {
          dockerTagWithMetrics {
            app = "frontend"
          }
        }
      }
      post {
        failure {
          postMetric("frontend.docker-tag.failure", 1)
        }
      }
    }
    stage('Complete') {
      failFast true
      parallel {
        stage('Tag Build') {
          when {
            branch 'master'
          }
          steps {
            tagDeployment("frontend")
          }
        }
      }
    }
  }
  post {
    failure {
      postMetric(appendBranchSuffix("frontend") + ".failure", 1)
    }
    success {
      postSuccessfulMetrics(appendBranchSuffix("frontend"))
    }
  }
}
