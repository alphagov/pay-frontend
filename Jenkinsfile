#!/usr/bin/env groovy

pipeline {
  agent any

  options {
    ansiColor('xterm')
    timestamps()
  }

  libraries {
    lib("pay-jenkins-library@master")
  }

  stages {
    stage('Docker Build') {
      steps {
        script {
          buildApp{
            app = "frontend"
          }
        }
      }
    }
    stage('Test') {
      steps {
        runEndToEnd("frontend")
      }
    }
    stage('Deploy') {
      when {
        branch 'master'
      }
      steps {
        deploy("frontend", "test")
      }
    }
  }
}
