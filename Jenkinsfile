#!/usr/bin/env groovy

pipeline {
  agent any

  parameters {
    booleanParam(defaultValue: false, description: '', name: 'runEndToEndTestsOnPR')
  }

  options {
    timestamps()
  }

  libraries {
    lib("pay-jenkins-library@master")
  }
  environment {
    RUN_END_TO_END_ON_PR = "${params.runEndToEndTestsOnPR}"
    JAVA_HOME="/usr/lib/jvm/java-1.11.0-openjdk-amd64"
  }

  stages {
    stage('Docker Build') {
      steps {
        script {
          buildAppWithMetrics {
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
    stage('Tests') {
      failFast true
      parallel {
        stage('End to End Tests') {
            when {
                anyOf {
                  branch 'master'
                  environment name: 'RUN_END_TO_END_ON_PR', value: 'true'
                }
            }
            steps {
                runAppE2E("frontend", "card,zap")
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
    stage('Check Pact Compatibility') {
      when {
        branch 'master'
      }
      steps {
        checkPactCompatibility("frontend", gitCommit(), "test")
      }
    }
    stage('Card Smoke Test') {
      when { branch 'master' }
      steps { runCardSmokeTest() }
    }
    stage('Pact Tag') {
      when {
          branch 'master'
      }
      steps {
          echo 'Tagging consumer pact with "test"'
          tagPact("frontend", gitCommit(), "test")
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
        stage('Trigger Deploy Notification') {
          when {
            branch 'master'
          }
          steps {
            triggerGraphiteDeployEvent("frontend")
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
