# Task Tracker: CI/CD Pipeline with Jenkins, Docker, Amazon ECR and Minikube

CCA 2, Cloud Computing and DevOps (TYCSE). An existing web application is built, tested, packaged and deployed automatically. A `git push` to GitHub is picked up by Jenkins, which builds and tests the code, creates a Docker image, pushes it to Amazon ECR and deploys it to Minikube using Kubernetes manifests.

## 1. The project

Task Tracker is a small Node.js / Express web app. Users can add tasks with a priority (low, medium, high), mark them done, delete them, filter by all/active/done and see live counters. The page footer shows the app version and the name of the pod serving the request, which makes each deployment visible. A dark/light mode toggle was added as the source-code change for the second pipeline run.

Tasks are stored in memory, so the Kubernetes Deployment uses one replica.

### Run locally

```bash
npm install
npm test        # automated tests
npm start       # http://localhost:3000
```

### Repository layout

```
Dockerfile           image recipe (node:24-alpine, non-root user)
Jenkinsfile          declarative pipeline
k8s/deployment.yaml  Kubernetes Deployment
k8s/service.yaml     Kubernetes Service (NodePort 30080)
scripts/expose.sh    publishes the Service on port 8081 of the EC2 server
app.js, store.js, server.js   application code
public/              front end (index.html, style.css, main.js)
test/app.test.js     automated tests (node:test)
```

### API

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Health check used by probes and the pipeline |
| GET | /api/info | App version and pod hostname |
| GET | /api/stats | Task counts |
| GET | /api/tasks?status=all\|active\|done | List tasks |
| POST | /api/tasks | Create a task |
| PATCH | /api/tasks/:id | Update a task |
| DELETE | /api/tasks/:id | Delete a task |

## 2. Pipeline stages

Defined in the `Jenkinsfile`. Jenkins checks GitHub every 2 minutes (Poll SCM, `H/2 * * * *`) and starts a run when there is a new commit.

| # | Stage | What it does |
|---|---|---|
| 1 | Checkout | Pulls the latest code and builds the image tag `<build-number>-<git-sha>` |
| 2 | Build and Test | `npm ci`, `npm run lint` (syntax check) and `npm test` |
| 3 | Docker Build | Builds the image from the Dockerfile and tags it with the build tag and `latest` |
| 4 | Push Image | Logs in to Amazon ECR and pushes both tags |
| 5 | Deploy to Minikube | Refreshes the ECR pull secret, applies the Deployment and Service, waits for the rollout |
| 6 | Verification | Lists the deployment, pods and service, then checks `/health` and `/api/info` with `curl` |

If any stage fails, the pipeline stops and the previous deployment keeps running.

## 3. Jenkins on AWS

- **Server:** EC2 instance `cca2-jenkins-server` (c7i-flex.large, 2 vCPU, 4 GiB RAM, Ubuntu 24.04) in `ap-south-1` (Mumbai), with a 25 GiB disk.
- **Security group:** inbound ports 22 (SSH), 8080 (Jenkins) and 8081 (app), restricted to my IP address.
- **Installed on the server:** Docker, Jenkins (with OpenJDK 21), Node.js 24, AWS CLI, kubectl and Minikube (Docker driver). Minikube runs as the `jenkins` user so the pipeline can use `kubectl` directly, and the `jenkins` user is in the `docker` group.
- **Jenkins plugins:** the suggested set (Git, Pipeline, Credentials Binding, Timestamper).
- **Credentials:** a Jenkins credential with ID `aws-ecr-creds` (kind: Username with password) holds the access key of an IAM user that only has the `AmazonEC2ContainerRegistryPowerUser` policy. The keys are injected during the Push and Deploy stages with `withCredentials` and are never stored in the repository.
- **Job:** `cca2-task-tracker-pipeline`, type Pipeline, definition "Pipeline script from SCM", Git, this repository, branch `main`, script path `Jenkinsfile`. Poll SCM is enabled through the `triggers` block in the Jenkinsfile.

## 4. Pushing the image to Amazon ECR

1. A private ECR repository `cca2-task-tracker` was created in `ap-south-1` (tags mutable, because `latest` is re-pushed).
2. In the Push Image stage, Jenkins gets a temporary token with `aws ecr get-login-password`, logs in with `docker login`, and pushes:
   - `<account-id>.dkr.ecr.ap-south-1.amazonaws.com/cca2-task-tracker:<build-number>-<git-sha>` (for example `6-24b18a7`)
   - `<account-id>.dkr.ecr.ap-south-1.amazonaws.com/cca2-task-tracker:latest`

## 5. Deploying and accessing the app on Minikube

- `k8s/deployment.yaml` contains placeholders for the image and version. The Deploy stage replaces them with `sed` and applies the result with `kubectl apply`, so each build rolls out a new, uniquely tagged image.
- Minikube pulls the private image using the `ecr-secret` pull secret. ECR tokens expire after 12 hours, so the pipeline recreates the secret on every run.
- `k8s/service.yaml` exposes the app as a NodePort Service (port 80 to container port 3000, node port 30080).
- The Verification stage checks the pods, deployment and service and calls the health endpoint through the Minikube IP.
- To open the app in a browser, run `scripts/expose.sh` as the `jenkins` user on the server (it port-forwards the Service to port 8081) and open `http://<EC2-PUBLIC-IP>:8081`. Re-run it after each deployment, because the old pod is replaced.

Useful checks on the server:

```bash
kubectl get pods,deployment,svc
kubectl rollout status deployment/task-tracker
```

## 6. Source-code change for the second run

A dark/light mode toggle was added (`public/index.html`, `public/style.css`, `public/main.js`) together with a test that checks the toggle is present. After pushing the commit, Jenkins started a new run on its own, built and pushed a new image and rolled it out to Minikube. The footer version changed from `5-2b17166` to `6-24b18a7` and the toggle appeared in the page header.