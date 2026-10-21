#!/usr/bin/env bash
# Makes the Minikube service reachable from a browser via the EC2 public IP.
# Run as the jenkins user (it owns the Minikube cluster), e.g.:
#   sudo -iu jenkins
#   bash /var/lib/jenkins/workspace/<job-name>/scripts/expose.sh
# Re-run it after every deployment (the old port-forward dies with the old pod).
pkill -f "kubectl port-forward.*task-tracker" || true
nohup kubectl port-forward --address 0.0.0.0 svc/task-tracker 8081:80 > /tmp/port-forward.log 2>&1 &
sleep 2
echo "App exposed on port 8081 -> open http://<EC2-PUBLIC-IP>:8081"
