pipeline {
    environment {
        CONTAINER_NAME = 'paper-juragan-material'
        URL_BITBUCKET = "https://papertechnical@bitbucket.org/yosiadrywebsite/paper-google-api.git"
        BRANCH_NAME = 'master'
        BRANCH_PROD_REGEX = /(master|^.*prod*)/
        BRANCH_BUILD_REGEX = /(master|staging|development|project.*)/
        BRANCH_PROJECT_REGEX = /project.*/
        BITBUCKET_CRED = "3f1c89d3-4479-470f-b167-d3b238fb58a9"
        GITHUB_TOKEN ="4acfd1c74a8dda1a14771ccd10c7396a5e51b0d4"
        GIT_SLUG_BRANCH = getSlug(env.BRANCH_NAME,env.BRANCH_PROJECT_REGEX)
        IMAGE_TAG =  "${env.GIT_SLUG_BRANCH}-${currentBuild.number}"
        IMAGE_URL = "gcr.io/paper-prod/${env.CONTAINER_NAME}"
        IMAGE_FULL_URL = "${env.IMAGE_URL}:${env.IMAGE_TAG}"
        BUILD_ARG = "--build-arg APP_ENV=${getArgs(env.BRANCH_NAME,env.BRANCH_PROJECT_REGEX)} --build-arg GITHUB_TOKEN=${env.GITHUB_TOKEN}"
        ENV_FILE_SUFFIX = "${getArgs(env.BRANCH_NAME,env.BRANCH_PROJECT_REGEX)}"
        GOOGLE_SERVICE_ACCOUNT = getGoogleServiceAccount(env.BRANCH_NAME,env.BRANCH_PROD_REGEX)
        RELEASE= "${env.CONTAINER_NAME}"
        NAMESPACE = getNamespace(env.BRANCH_NAME,env.BRANCH_PROJECT_REGEX)
        GCP_PROJECT = getGCPProject(env.BRANCH_NAME,env.BRANCH_PROD_REGEX)
        CLUSTER = getCluster(env.BRANCH_NAME,env.BRANCH_PROD_REGEX)
        ZONE= getZone()
    }
    agent {
        docker{
            image "gcr.io/paper-prod/paper-k8s-deployment"
        }
    }
    options {
        skipDefaultCheckout()
    }
    stages {
        stage('Init') {
            steps {
                slackSend( message: "${env.CONTAINER_NAME} >> ${env.BRANCH_NAME} ver. ${currentBuild.number} is building to k8s now! :pray:",color: '#4199d5')
            }
        }
        stage('Pull Source Code') {
            steps {
                sh "mkdir -p /var/jenkins_home/workspace/${env.JOB_NAME}"
                sh "cd /var/jenkins_home/workspace/${env.JOB_NAME}"
                git branch : "${env.BRANCH_NAME}", url : "${env.URL_BITBUCKET}", credentialsId : "${env.BITBUCKET_CRED}"
            }
        }
        stage('Build Image') {
            when {
                expression { env.BRANCH_NAME ==~ env.BRANCH_BUILD_REGEX }
            }
            steps {
                sh "cd /var/jenkins_home/workspace/${env.JOB_NAME}"
                sh "DOCKER_BUILDKIT=1 docker build -t ${env.CONTAINER_NAME}-${env.GIT_SLUG_BRANCH} ${env.BUILD_ARG} ."
                sh "docker tag ${env.CONTAINER_NAME}-${env.GIT_SLUG_BRANCH} ${env.IMAGE_FULL_URL}"
                withCredentials([file(credentialsId: "${env.GOOGLE_SERVICE_ACCOUNT}", variable: 'GC_KEY')]) {
                    sh("gcloud auth activate-service-account --key-file=${GC_KEY}")
                    sh "gcloud auth configure-docker"
                    sh "docker push ${env.IMAGE_FULL_URL}"
                }
            }
        }
        stage('Deploy') {
            when {
                expression { env.BRANCH_NAME ==~ env.BRANCH_BUILD_REGEX }
            }
            steps {
                withCredentials([file(credentialsId: "${env.GOOGLE_SERVICE_ACCOUNT}", variable: 'GC_KEY')]) {
                    // Get kube config
                    sh("gcloud auth activate-service-account --key-file=${GC_KEY} --project=${env.GCP_PROJECT}")
                    sh("gcloud container clusters get-credentials ${env.CLUSTER}")
                    // Create namespace if it doesn't exist
                    createNamespace(env.NAMESPACE)
                    // Deploy using helm
                    sh("cd /var/jenkins_home/workspace/${env.JOB_NAME}")
                    helmInstall(env.NAMESPACE,env.RELEASE,env.IMAGE_URL,env.IMAGE_TAG)
                }
            }
        }
        stage("Post Build"){
            steps {
                slackSend( message: "${env.CONTAINER_NAME} >> ${env.BRANCH_NAME} ver. ${currentBuild.number}, Build Finished on k8s! Congratulation! :dab_unicorn:", color:"#aae481")
            }
        }
    }
}

/*
    Create the kubernetes namespace
*/
def createNamespace (namespace) {
    echo "Creating namespace ${namespace} if needed"
    sh "[ ! -z \"\$(kubectl get ns ${namespace} -o name 2>/dev/null)\" ] || kubectl create ns ${namespace}"
}
/*
    Helm install
*/
def helmInstall (namespace,release,image_url,image_tag) {
    echo "Installing ${release} in ${namespace} with image ${image_url}:${image_tag}"
    echo "env ${release}"
    script {
        sh("cd /var/jenkins_home/workspace/${env.JOB_NAME}")
        sh """
            helm upgrade --install --namespace ${namespace} ${release} ./deployment/chart \
                --set image.repository=${image_url},image.tag=${image_tag}
        """
    }
}
/*
    Helm delete (if exists)
*/
def helmDelete (namespace,release) {
    echo "Deleting ${release} in ${namespace} if deployed"
    script {
        sh "[ -z \"\$(helm ls --namespace ${namespace} --short ${release} 2>/dev/null)\" ] || helm uninstall ${release} --namespace ${namespace} "
    }
}
/*
    Get slug
*/
def getSlug(branchName,branchProjectRegex) {
    if (branchName == 'master') {
        slug = "prd"
    } else if (branchName == 'staging') {
        slug = "stg"
    } else if (branchName ==~ branchProjectRegex){
        slug = branchName.replace("/", "-").replace("project-","")
    } else {
        slug = "dev"
    }
    echo "slug ${slug} from regex ${branchProjectRegex} if deployed"
    return slug
}
/*
    Get Args for set environment app
*/
def getArgs(branchName,branchProjectRegex) {
    if (branchName == 'master') {
        args = "production"
    } else if (branchName == 'staging') {
        args = "staging"
    } else if (branchName ==~ branchProjectRegex){
        args = branchName.replace("/", "-").replace("project-","")
    } else {
        args = "development"
    }
    echo "args ${args} from regex ${branchProjectRegex} if deployed"
    return args
}
/*
    Get Namespace
*/
def getNamespace(branchName,branchProjectRegex) {
    if (branchName == 'master') {
        namespace = "production"
    } else if (branchName == 'staging') {
        namespace = "staging"
    } else if (branchName ==~ branchProjectRegex){
        namespace = branchName.replace("/", "-").replace("project-","")
    } else {
        namespace = "development"
    }
    echo "namespace ${namespace} from regex ${branchProjectRegex} if deployed"
    return "paper-${namespace}"
}
/*
    Get Project
*/
def getGCPProject(branchName,branchProdRegex) {
    if (branchName == 'master') {
        project = "production"
    } else if (branchName == 'staging') {
        project = "development"
    } else if (branchName ==~ branchProdRegex){
        project = "development"
    } else {
        project = "development"
    }
    return "paper-${project}"
}
/*
    Get Cluster
*/
def getCluster(branchName,branchProdRegex) {
    if (branchName ==~ branchProdRegex) {
        args = "paper-prod-cluster --zone asia-southeast2-a --project paper-production"
    } else {
        args = "paper-dev-cluster-01 --zone asia-southeast2-a --project paper-development"
    }
    return args
}
/*
    Get Zone
*/
def getZone() {
    return "asia-southeast2"
}
/*
    Get Google Service Account
*/
def getGoogleServiceAccount(branchName,branchProdRegex) {
    if (branchName ==~ branchProdRegex) {
        gsa = "paper-prod-secret"
    } else {
        gsa = "paper-development-secret"
    }
    return gsa
}