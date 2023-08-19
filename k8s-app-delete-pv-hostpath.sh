# replicas: 1 # if we want multiple replicas we need set up nodeselector in spec as all the pods can share the hostpath.
kubectl delete -f k8s/manifests/other-cases/deployment-for-type-hostpath-pv.yaml 

kubectl delete -f k8s/manifests/other-cases/hostpath-pv.yaml
kubectl delete -f k8s/manifests/step3-deploy-app/pdb.yaml
kubectl delete -f k8s/manifests/step3-deploy-app/service.yaml
kubectl delete -f k8s/manifests/step3-deploy-app/web-ingress.yaml
kubectl delete -f k8s/manifests/step1-create-namespace/