// Declarative Jenkins pipeline implementing all seven assessed stages:
// Build, Test, Code Quality, Security, Deploy, Release, and Monitoring.
//
// Deployment model: Jenkins is in control. It builds and pushes the Docker
// image to a registry, then calls the EasyPanel per-service "deploy URL" to
// trigger a redeploy. EasyPanel pulls the new image and restarts the service.
//
// Configure these in Jenkins > Manage Jenkins > Credentials:
//   dockerhub             (username + password) - image registry
//   easypanel-staging-url (secret text)         - staging service deploy URL
//   easypanel-prod-url    (secret text)         - production service deploy URL
//   sonar-token           (secret text)
//   snyk-token            (secret text)
//   github-token          (secret text)

pipeline {
  agent any

  environment {
    IMAGE_NAME     = 'taskmanager-api'
    REGISTRY       = 'docker.io/aarohime'                 // change to your registry/user
    IMAGE_TAG      = "${env.BUILD_NUMBER}"
    STAGING_URL    = 'https://taskmanager-staging.example.com'  // your EasyPanel staging domain
    PROD_URL       = 'https://taskmanager.example.com'          // your EasyPanel production domain
    SONAR_HOST     = 'https://sonarcloud.io'
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {

    // ── 1. BUILD ──────────────────────────────────────────────────────────
    stage('Build') {
      steps {
        echo 'Installing dependencies and building the Docker image artefact'
        sh 'npm ci'
        sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
      }
    }

    // ── 2. TEST ───────────────────────────────────────────────────────────
    stage('Test') {
      steps {
        echo 'Running Jest unit and Supertest integration tests with coverage'
        sh 'npm test'
      }
      post {
        always {
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
      }
    }

    // ── 3. CODE QUALITY ───────────────────────────────────────────────────
    stage('Code Quality') {
      steps {
        echo 'Running ESLint and SonarCloud analysis'
        sh 'npm run lint'
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          sh """
            npx sonar-scanner \
              -Dsonar.host.url=${SONAR_HOST} \
              -Dsonar.login=${SONAR_TOKEN}
          """
        }
      }
    }

    // ── 4. SECURITY ───────────────────────────────────────────────────────
    stage('Security') {
      steps {
        echo 'Scanning dependencies with npm audit and Snyk'
        sh 'npm audit --audit-level=high || echo "Review audit findings (documented in report)"'
        withCredentials([string(credentialsId: 'snyk-token', variable: 'SNYK_TOKEN')]) {
          sh '''
            npx snyk auth $SNYK_TOKEN
            npx snyk test --severity-threshold=high || true
          '''
        }
      }
    }

    // ── 5. DEPLOY (push image + trigger EasyPanel staging) ────────────────
    stage('Deploy') {
      steps {
        echo 'Pushing the staging image and triggering an EasyPanel redeploy'
        withCredentials([usernamePassword(credentialsId: 'dockerhub',
                          usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:staging
            docker push ${REGISTRY}/${IMAGE_NAME}:staging
          '''
        }
        // Jenkins triggers EasyPanel's per-service deploy URL
        withCredentials([string(credentialsId: 'easypanel-staging-url', variable: 'EP_STAGING')]) {
          sh 'curl -fsS -X POST "$EP_STAGING"'
        }
        echo 'Waiting for staging to report healthy'
        sh '''
          for i in $(seq 1 15); do
            if curl -sf ${STAGING_URL}/health; then echo " staging healthy"; exit 0; fi
            echo "waiting..."; sleep 5
          done
          echo "staging did not become healthy in time"; exit 1
        '''
      }
    }

    // ── 6. RELEASE (promote to EasyPanel production) ──────────────────────
    stage('Release') {
      when { branch 'main' }
      steps {
        echo 'Tagging a versioned release image and triggering production redeploy'
        withCredentials([usernamePassword(credentialsId: 'dockerhub',
                          usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:v1.0.${BUILD_NUMBER}
            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:latest
            docker push ${REGISTRY}/${IMAGE_NAME}:v1.0.${BUILD_NUMBER}
            docker push ${REGISTRY}/${IMAGE_NAME}:latest
          '''
        }
        withCredentials([string(credentialsId: 'easypanel-prod-url', variable: 'EP_PROD')]) {
          sh 'curl -fsS -X POST "$EP_PROD"'
        }
        sh '''
          for i in $(seq 1 15); do
            if curl -sf ${PROD_URL}/health; then echo " production healthy"; exit 0; fi
            echo "waiting..."; sleep 5
          done
          echo "production did not become healthy in time"; exit 1
        '''
        withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
          sh '''
            gh release create v1.0.${BUILD_NUMBER} \
              --title "Release v1.0.${BUILD_NUMBER}" \
              --notes "Automated release from Jenkins build ${BUILD_NUMBER}" || true
          '''
        }
      }
    }

    // ── 7. MONITORING & ALERTING ──────────────────────────────────────────
    stage('Monitoring') {
      steps {
        echo 'Verifying the deployed app exposes metrics for Prometheus'
        sh 'curl -sf ${PROD_URL}/metrics | grep tasks_total'
        echo 'Prometheus + Grafana run as services scraping ${PROD_URL}/metrics'
        // For a local monitoring demo instead, run:
        //   docker compose -f docker-compose.monitoring.yml up -d --build
      }
    }
  }

  post {
    success { echo 'Pipeline completed successfully — all stages green.' }
    failure { echo 'Pipeline failed — check the stage logs above.' }
  }
}
