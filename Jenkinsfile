#!/usr/bin/env groovy

pipeline {
  agent any

  options {
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
    stage('Docker Tag') {
      steps {
        script {
          dockerTag {
            app = "frontend"
          }
        }
      }
    }
    stage('Deploy') {
      when {
        branch 'master'
      }
      steps {
        deploy("frontend", "test", null, true)
      }
    }
  }
}
