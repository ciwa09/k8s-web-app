# k8s-web-app

## Setup/prerequisites
- k8s cluster running on raspberry pi's with NFS storage. 1 master and 2 worker node setup.
- Installed nginx ingress controller for for SSL.
- installed istio for service mesh.
- installed NFS storage class for dynamic pv provisioning.


### k8s cluster
```
# k get nodes
NAME      STATUS   ROLES                  AGE   VERSION
master    Ready    control-plane,master   19d   v1.27.2+k3s1
worker2   Ready    <none>                 19d   v1.27.2+k3s1
worker1   Ready    <none>                 19d   v1.27.2+k3s1
```

### nginx ingress controller installation
```
# helm install my-release oci://ghcr.io/nginxinc/charts/nginx-ingress --version 0.18.1
```

### Instio Installation
```
# brew install istioctl
# istioctl install
# k get pods -n istio-system
NAME                                    READY   STATUS    RESTARTS   AGE
istiod-977466b69-rds9k                  1/1     Running   0          21m
istio-ingressgateway-559fb9c9d9-qcvnq   1/1     Running   0          20m
```

### NFS storage class setup
```
# helm install nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
    --set nfs.server=x.x.x.x \
    --set nfs.path=/srv/nfs
# k get sc
NAME                      PROVISIONER                                     RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
local-path                rancher.io/local-path                           Delete          WaitForFirstConsumer   false                  19d
local-storage (default)   kubernetes.io/no-provisioner                    Delete          WaitForFirstConsumer   false                  15d
nfs-client                cluster.local/nfs-subdir-external-provisioner   Delete          Immediate              true                   9h
```
---

## Questions
**Create a simple application using any language of your choice that can be deployed to
Kubernetes and satisfies the following requirements**

***a. An application that returns some data to https requests***

- Wrote a simple weapp using nodejs with the help of google (I dont have much experience with application development).
- Containerized the app and the dockerfile can be found [here](https://github.com/ciwa09/k8s-web-app/Dockerfile)
- Applying these [manifests](https://github.com/ciwa09/k8s-web-app/k8s/manifests) should bring up the application.
```
# k apply -f manifests/namespace.yaml
  namespace/frontend created

# k apply -f manifests/
deployment.apps/web-app created
namespace/frontend unchanged
persistentvolumeclaim/nfs-pvc created
poddisruptionbudget.policy/web-app-pdb created
service/web-app created
ingress.networking.k8s.io/web-app-ingress created
secret/web-tls created
```
- Running service as `NodePort`(30001) because i dont have access to loadbalancer. Service `NodePort`(30001) was used as i can access it through my browser using node ip.
- All the required services are running and we should be able to access the aplication using `NodePort`(30001) shown below.
```
# k get all,pv,pvc,pdb,secrets,ingress -n frontend
NAME                          READY   STATUS    RESTARTS   AGE
pod/web-app-fcf984bcb-lzqx7   1/1     Running   0          4m58s
pod/web-app-fcf984bcb-47gbx   1/1     Running   0          4m58s
pod/web-app-fcf984bcb-2b2lj   1/1     Running   0          4m58s

NAME              TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/web-app   NodePort   10.43.246.210   <none>        80:30001/TCP   4m58s

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/web-app   3/3     3            3           4m58s

NAME                                DESIRED   CURRENT   READY   AGE
replicaset.apps/web-app-fcf984bcb   3         3         3       4m58s

NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM               STORAGECLASS   REASON   AGE
persistentvolume/nginx-pv                                   10Gi       RWO            Retain           Bound    default/nginx-pvc   manual                  17d
persistentvolume/pvc-7e799572-592e-4cfd-aab7-d34611466870   1Gi        RWX            Delete           Bound    frontend/nfs-pvc    nfs-client              4m58s

NAME                            STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistentvolumeclaim/nfs-pvc   Bound    pvc-7e799572-592e-4cfd-aab7-d34611466870   1Gi        RWX            nfs-client     4m58s

NAME                                     MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
poddisruptionbudget.policy/web-app-pdb   N/A             1                 1                     4m58s

NAME             TYPE                DATA   AGE
secret/web-tls   kubernetes.io/tls   2      4m58s

NAME                                        CLASS   HOSTS                               ADDRESS   PORTS     AGE
ingress.networking.k8s.io/web-app-ingress   nginx   web-app.default.svc.cluster.local             80, 443   4m58s
```

- These are my node ips and application should be accessable using these. 
```
# k get nodes -owide | awk '{print $6}'
INTERNAL-IP
192.168.1.102
192.168.1.101
192.168.1.100
```
- Frontend Application
![frontend application](https://github.com/ciwa09/k8s-web-app/assets/194199/7b796878-5f47-4d45-8a1b-273714358099)

---

***b. Is highly available***
- We are running 3 replicas which were spread across nodes using `topologySpreadConstraints`. Using topologySpreadConstraints helps us pods not schedule on the same node which can be fatal if the node goes down. Also we are running PDB with `maxUnavailable: 1` which will make sure only 1 pod is unavailable duing any maintanance.
```
# k get rs -n frontend
NAME                DESIRED   CURRENT   READY   AGE
web-app-fcf984bcb   3         3         3       10m
```

```
# k get deploy -n frontend -oyaml | grep -v '{"' | grep -A6 'topologySpreadConstraints'
        topologySpreadConstraints:
        - labelSelector:
            matchLabels:
              app: web-app
          maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
```
---

***c. Is able to persist data beyond the life of the application***
- Add Data
![Add data](https://github.com/ciwa09/k8s-web-app/assets/194199/3468efc0-817c-4ceb-8142-7c9534ca4c2a)
- deleting and re-creating the app should persist data according to the design. Lets test it now.

```
# k get deploy -n frontend
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
web-app   3/3     3            3           17m

# k delete deploy web-app -n frontend
deployment.apps "web-app" deleted

# k apply -f manifests/deployment.yaml
deployment.apps/web-app created

# k get deploy -n frontend
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
web-app   3/3     3            3           25s
```
- Data persisted beyond the app lifecycle.
![Data persisted as we desired](https://github.com/ciwa09/k8s-web-app/assets/194199/c96c4b1d-8e3d-4061-9a8e-f21bd4930844)

---

***d. Securely stores and accesses its web security certificate (this cert can be any dummy file)***
- i have not completed this task practically as i dont have a DNS name which is required by the ingress to setup TLS. Included the tls secret and ingress manifests in the [manifests](https://github.com/ciwa09/k8s-web-app/k8s/manifests) folder.
- You can secure an application running on Kubernetes by creating a secret that contains a TLS private key and certificate.Currently, Ingress supports a single TLS port, 443, and assumes TLS termination. Any request post ingress controller are all private and not accessible as all the services and pods will be in a different network. 

### Bonus:
***a. Only receives requests once the application is started***
- For this i have setup readinessprobe which will make sure that the app is ready before sending any requests.
```
# k get deploy -n frontend -oyaml | grep -v '{"' | grep -A7 'readiness'
          readinessProbe:
            failureThreshold: 5
            httpGet:
              path: /
              port: 8080
              scheme: HTTP
            initialDelaySeconds: 10
            periodSeconds: 10
```
***b. Automatically restarts if the application is unresponsive***
- As we have setup livenessprobe kubernetes will automatically restart the application if it doesnt app the liveness check.
- By default, the restartPolicy is set to Always in a pod's specification. This means that if a container becomes unresponsive or fails, it will be automatically restarted.
    Types of restartPolicies : There are three options for restartPolicy: Always, OnFailure, and Never.
    1 Always: Kubernetes will restart the container(s) in the pod regardless of the exit status or liveness probe results.
    2 OnFailure: Kubernetes will restart the container(s) only if they fail (exit with a non-zero status code).
    3 Never: Kubernetes will never automatically restart the container(s), regardless of their exit status or liveness probe results.
Kubernetes provides mechanisms like liveness probes and the restartPolicy setting to ensure that pods remain responsive and healthy. If a pod becomes unresponsive due to a failing liveness probe or container failure, Kubernetes will restart the pod to maintain the desired state of the application.

***c. Only one replica can be unavailable at any time***
This setup was done using PodDisruptionBudget and setting up `maxUnavailable` to 1 which will make sure only 1 pod is unavailable at any point of time. Values for `minAvailable` or `maxUnavailable` can be expressed as integers or as a percentage. The use of maxUnavailable is recommended as it automatically responds to changes in the number of replicas of the corresponding controller.
```
# k get pdb -n frontend
NAME          MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
web-app-pdb   N/A             1                 1                     79m
```

***d. Organize Kubernetes resource manifests using Kustomize and/or Helm***

Helm chart can be found here: [Helm Chart](https://github.com/ciwa09/k8s-web-app/charts/web-app)
```
# k delete -f k8s/manifests
deployment.apps "web-app" deleted
namespace "frontend" deleted
persistentvolumeclaim "nfs-pvc" deleted
poddisruptionbudget.policy "web-app-pdb" deleted
service "web-app" deleted
ingress.networking.k8s.io "web-app-ingress" deleted
secret "web-tls" deleted

# cd charts

# pwd
/Users/sivavaka/github/k8s-web-app/charts

# helm install web-app web-app
W0818 03:41:45.031625   18419 warnings.go:70] tls: failed to find any PEM data in certificate input
NAME: web-app
LAST DEPLOYED: Fri Aug 18 03:41:44 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None

# helm ls
NAME                           	NAMESPACE	REVISION	UPDATED                             	STATUS  	CHART                                 	APP VERSION
nfs-subdir-external-provisioner	default  	1       	2023-08-17 16:21:14.064659 -0700 PDT	deployed	nfs-subdir-external-provisioner-4.0.18	4.0.2
nginx-ingress                  	default  	1       	2023-08-17 22:38:07.805979 -0700 PDT	deployed	nginx-ingress-0.18.1                  	3.2.1
web-app                        	default  	1       	2023-08-18 03:59:19.516166 -0700 PDT	deployed	web-app-0.1.0                         	0.1.0

$ helm get values web-app -a
COMPUTED VALUES:
image:
  repository: ciwa09/k8s-web-app
  tag: v1
imagePullPolicy: Always
namespace: frontend
....

```

e. Deploy the application into a service mesh 
 - I dont have working experience with service mesh setup. But, i have setup at my home and played with it. 

 - What Does a Service Mesh Do?
    A service mesh uses a proxy (or sidecar) that sides alongside each service. This sidecar is responsible for routing requests from one service to the sidecar in another service. As a result of this nature, service mesh makes collecting metrics and detecting issues easier.

    The following list shows some of the things you can use a service mesh for in your application:

    1. Collecting Metrics: A service mesh can collect details and logs about the traffic that flows through services and containers.
    2. Reducing Downtime: You can use a service mesh to reduce downtime in different ways. For example, a service mesh can route requests away from failing services to increase uptime and stability.
    3. Added Security: A Service mesh can offer security features like encryption, authentication, and authorization outside of a microservice application’s logic

```
# kubectl label namespace frontend istio-injection=enabled
# k get pods -n frontend
NAME                       READY   STATUS    RESTARTS   AGE
web-app-796b9b7496-rrkhq   2/2     Running   0          2m27s
web-app-796b9b7496-ngjxj   2/2     Running   0          2m27s
web-app-796b9b7496-wz9fp   2/2     Running   0          2m27s
```
