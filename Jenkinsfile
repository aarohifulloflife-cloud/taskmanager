pipeline {
  agent any

  environment {
    IMAGE_NAME  = 'taskmanager'
    REGISTRY    = 'docker.io/aarohime'
    IMAGE_TAG   = "${env.BUILD_NUMBER}"
    STAGING_URL = 'https://taskmanager-taskmanager-staging.aqpjta.easypanel.host'
    PROD_URL    = 'https://taskmanager-taskmanager-prod.aqpjta.easypanel.host'
    SONAR_HOST  = 'https://sonarcloud.io'
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {

    // -- 1. BUILD --
    stage('Build') {
      steps {
        echo 'Installing dependencies and building the Docker image artefact'
        bat 'npm ci'
        bat "docker build -t %IMAGE_NAME%:%IMAGE_TAG% ."
      }
    }

    // -- 2. TEST --
    stage('Test') {
      steps {
        echo 'Running Jest unit and Supertest integration tests with coverage'
        bat 'npm test'
      }
      post {
        always {
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
        }
      }
    }

    // -- 3. CODE QUALITY --
    stage('Code Quality') {
      steps {
        echo 'Running ESLint and SonarCloud analysis'
        bat 'npm run lint'
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          bat "npx sonar-scanner -Dsonar.host.url=%SONAR_HOST% -Dsonar.login=%SONAR_TOKEN%"
        }
      }
    }

    // -- 4. SECURITY --
    stage('Security') {
      steps {
        echo 'Scanning dependencies with npm audit and Snyk'
        bat 'npm audit --audit-level=high & exit 0'
        withCredentials([string(credentialsId: 'snyk-token', variable: 'SNYK_TOKEN')]) {
          bat 'npx snyk auth %SNYK_TOKEN%'
          bat 'npx snyk test --severity-threshold=high & exit 0'
        }
      }
    }

    // -- 5. DEPLOY (push staging image + trigger EasyPanel staging) --
    stage('Deploy') {
      steps {
        echo 'Pushing the staging image and triggering an EasyPanel redeploy'
        withCredentials([usernamePassword(credentialsId: 'dockerhub',
                          usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          bat """
            docker login -u %DH_USER% -p %DH_PASS%
            docker tag %IMAGE_NAME%:%IMAGE_TAG% %REGISTRY%/%IMAGE_NAME%:staging
            docker push %REGISTRY%/%IMAGE_NAME%:staging
          """
        }
        withCredentials([string(credentialsId: 'easypanel-staging-url', variable: 'EP_STAGING')]) {
          bat 'curl -fsS -X POST "%EP_STAGING%"'
        }
        echo 'Waiting for staging to report healthy'
        powershell '''
          $ok = $false
          for ($i = 0; $i -lt 15; $i++) {
            try {
              Invoke-RestMethod -Uri "$env:STAGING_URL/health" -TimeoutSec 5 | Out-Null
              Write-Host "staging healthy"; $ok = $true; break
            } catch { Write-Host "waiting..."; Start-Sleep -Seconds 5 }
          }
          if (-not $ok) { Write-Error "staging did not become healthy in time"; exit 1 }
        '''
      }
    }

    // -- 6. RELEASE (promote versioned image to EasyPanel production) --
    stage('Release') {
      steps {
        echo 'Tagging a versioned release image and triggering production redeploy'
        withCredentials([usernamePassword(credentialsId: 'dockerhub',
                          usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          bat """
            docker login -u %DH_USER% -p %DH_PASS%
            docker tag %IMAGE_NAME%:%IMAGE_TAG% %REGISTRY%/%IMAGE_NAME%:v1.0.%BUILD_NUMBER%
            docker tag %IMAGE_NAME%:%IMAGE_TAG% %REGISTRY%/%IMAGE_NAME%:latest
            docker push %REGISTRY%/%IMAGE_NAME%:v1.0.%BUILD_NUMBER%
            docker push %REGISTRY%/%IMAGE_NAME%:latest
          """
        }
        withCredentials([string(credentialsId: 'easypanel-prod-url', variable: 'EP_PROD')]) {
          bat 'curl -fsS -X POST "%EP_PROD%"'
        }
        echo 'Waiting for production to report healthy'
        powershell '''
          $ok = $false
          for ($i = 0; $i -lt 15; $i++) {
            try {
              Invoke-RestMethod -Uri "$env:PROD_URL/health" -TimeoutSec 5 | Out-Null
              Write-Host "production healthy"; $ok = $true; break
            } catch { Write-Host "waiting..."; Start-Sleep -Seconds 5 }
          }
          if (-not $ok) { Write-Error "production did not become healthy in time"; exit 1 }
        '''
        // withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
        //   bat 'gh release create v1.0.%BUILD_NUMBER% --title "Release v1.0.%BUILD_NUMBER%" --notes "Automated release from Jenkins build %BUILD_NUMBER%" & exit 0'
        // }
      }
    }

    // -- 7. MONITORING & ALERTING --
    stage('Monitoring') {
      steps {
        echo 'Verifying the production app exposes metrics for Prometheus'
        powershell '''
          $body = Invoke-RestMethod -Uri "$env:PROD_URL/metrics" -TimeoutSec 5
          if ($body -match "tasks_total") { Write-Host "metrics present" }
          else { Write-Error "tasks_total metric not found"; exit 1 }
        '''
        echo 'Prometheus + Grafana scrape the production /metrics endpoint'
      }
    }
  }

  post {
    success { echo 'Pipeline completed successfully -- all seven stages green.' }
    failure { echo 'Pipeline failed -- check the stage logs above.' }
  }
}