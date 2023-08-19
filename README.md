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
**Create a simple application using any language of your choice that can be deployed to Kubernetes and satisfies the following requirements**

***a. An application that returns some data to https requests***

- Wrote a simple weapp using nodejs with the help of google (I dont have much experience with application development).
- Containerized the app and the dockerfile can be found [here](https://github.com/ciwa09/k8s-web-app/blob/main/Dockerfile)
- Applying these [manifests](https://github.com/ciwa09/k8s-web-app/tree/main/k8s/manifests) should bring up the application.
```
# sh k8s-app-install-pv-nfs.sh
namespace/frontend created
persistentvolumeclaim/nfs-pvc created
deployment.apps/web-app created
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
- i have not completed this task practically as i dont have a DNS name which is required by the ingress to setup TLS. Included the tls secret and ingress manifests in the [manifests](https://github.com/ciwa09/k8s-web-app/tree/main/k8s/manifests) folder.
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

---

***b. Automatically restarts if the application is unresponsive***
- As we have setup livenessprobe kubernetes will automatically restart the application if it doesnt app the liveness check.
- By default, the restartPolicy is set to Always in a pod's specification. This means that if a container becomes unresponsive or fails, it will be automatically restarted.
    Types of restartPolicies : There are three options for restartPolicy: Always, OnFailure, and Never.
    1 Always: Kubernetes will restart the container(s) in the pod regardless of the exit status or liveness probe results.
    2 OnFailure: Kubernetes will restart the container(s) only if they fail (exit with a non-zero status code).
    3 Never: Kubernetes will never automatically restart the container(s), regardless of their exit status or liveness probe results.
Kubernetes provides mechanisms like liveness probes and the restartPolicy setting to ensure that pods remain responsive and healthy. If a pod becomes unresponsive due to a failing liveness probe or container failure, Kubernetes will restart the pod to maintain the desired state of the application.

---

***c. Only one replica can be unavailable at any time***
- This setup was done using PodDisruptionBudget and setting up `maxUnavailable` to 1 which will make sure only 1 pod is unavailable at any point of time. Values for `minAvailable` or `maxUnavailable` can be expressed as integers or as a percentage. The use of maxUnavailable is recommended as it automatically responds to changes in the number of replicas of the corresponding controller.
```
# k get pdb -n frontend
NAME          MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
web-app-pdb   N/A             1                 1                     79m
```

---

***d. Organize Kubernetes resource manifests using Kustomize and/or Helm***

- Helm chart can be found here: [Helm Chart](https://github.com/ciwa09/k8s-web-app/tree/main/charts/web-app)
```
# sh k8s-app-delete-pv-nfs.sh
deployment.apps "web-app" deleted
poddisruptionbudget.policy "web-app-pdb" deleted
service "web-app" deleted
ingress.networking.k8s.io "web-app-ingress" deleted
secret "web-tls" deleted
persistentvolumeclaim "nfs-pvc" deleted
namespace "frontend" deleted

# cd charts
# pwd
/Users/sivavaka/github/k8s-web-app/charts

# k create ns frontend
namespace/frontend created

# helm install web-app web-app
W0818 03:41:45.031625   18419 warnings.go:70] tls: failed to find any PEM data in certificate input
NAME: web-app
LAST DEPLOYED: Fri Aug 18 03:41:44 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None

# helm ls -n frontend
NAME   	NAMESPACE	REVISION	UPDATED                             	STATUS  	CHART        	APP VERSION
web-app	frontend 	1       	2023-08-19 01:22:33.744067 -0700 PDT	deployed	web-app-0.1.0	0.1.0

$ helm get values web-app -a -n frontend
COMPUTED VALUES:
image:
  repository: ciwa09/k8s-web-app
  tag: v1
imagePullPolicy: Always
namespace: frontend
pvc:
  nfsPvc:
    storageClass: nfs-client
    storageRequest: 1Gi
replicas: 3
svc:
  ports:
  - nodePort: 30001
    port: 80
    protocol: TCP
    targetPort: 8080
  type: NodePort
...

```

---

***e. Deploy the application into a service mesh***

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

# Question 2
[Documented here](https://github.com/ciwa09/k8s-web-app/blob/main/terraform/README.md)

---

**Considering App Engine and Cloud Run, if the application is required to be multi-regional which service would you recommend? Explain.**

- ***For a multi-regional application, both Google App Engine and Google Cloud Run can be viable options. If you prioritize ease of use, automatic scaling, and require minimal infrastructure management, Google App Engine might be a better fit. On the other hand, if you want more control over the runtime environment, containerization, and deployment flexibility, Google Cloud Run could be a suitable choice.***

---

**What is the recommended way to connect to CloudSQL?**
- ***The recommended way to connect to Google Cloud SQL (CloudSQL) is by using the Cloud SQL Proxy. The Cloud SQL Proxy provides a secure and efficient connection method that abstracts away the complexities of handling authentication, SSL/TLS encryption, and secure connections. It's designed to be versatile, easy to use, and suitable for various development environments and deployment scenarios.***

**Advantages of using the Cloud SQL Proxy:**

- ***Security: The Cloud SQL Proxy establishes secure connections to your Cloud SQL instance using SSL/TLS encryption. It ensures that your data remains encrypted during transit.***

- ***Authentication: The proxy handles authentication, reducing the risk of exposing database credentials. This simplifies your application's connection code and enhances security.***

- ***Flexibility: The Cloud SQL Proxy can be used locally on your development machine, on virtual machines, and even within containerized environments like Kubernetes.***

- ***Connection Pooling: The proxy provides efficient connection pooling, reducing the overhead of creating new connections for each database request.***

- ***IP Whitelisting Bypass: The proxy allows you to bypass IP whitelisting requirements, which can be helpful in dynamic IP environments.***

- ***Localhost Connection: The proxy creates a local socket that your application can connect to using the standard localhost address, making integration seamless.***

- ***Support for Various Languages: The proxy supports various programming languages and environments, making it suitable for different application stacks.***

---

**What are some challenges working with a Shared VPC?**

- ***Working with a Shared Virtual Private Cloud (VPC) in Google Cloud Platform (GCP) offers several benefits, such as resource sharing and network isolation. However, there are also challenges that come with managing and using a Shared VPC:***

    - ***Complex Setup and Management:***
        ***Setting up a Shared VPC requires careful planning and configuration. You need to define the host and service projects, IAM roles, firewall rules, and other networking components. Managing the relationships between projects can become complex as the number of projects and resources increases.***

    - ***Dependency on Networking Team:***
        ***Implementing and managing a Shared VPC often involves collaboration with networking teams to ensure proper network design, addressing, routing, and firewall configurations. This can introduce dependencies and potential delays.***

    - ***Cross-Project Communication:***
        ***While a Shared VPC facilitates cross-project communication, establishing and maintaining secure communication between projects might require additional configuration, especially when dealing with firewall rules, VPNs, or interconnects.***

    - ***IAM and Permissions:***
        ***Managing Identity and Access Management (IAM) roles and permissions across multiple projects can be challenging. Ensuring that users have the right level of access without overexposing resources requires careful role assignment.***

    - ***Resource Organization:***
        ***As multiple projects share the same network resources, keeping track of which resources belong to which projects can become complex. Proper naming conventions and tagging are essential.***

    - ***Network Addressing:***
        ***Properly planning and allocating IP address ranges for each project within the Shared VPC is crucial. Poor planning can lead to IP address conflicts or inefficient address usage.***

    - ***Resource Visibility:***
        ***In a Shared VPC, resources are spread across multiple projects, which can make it harder to gain a unified view of your infrastructure. Monitoring and managing resources might require tools that can handle cross-project visibility.***

    - ***Resource Quotas and Limits:***
        ***Cloud resource quotas and limits are applied per project, so you need to consider how these quotas will be shared across the projects in the Shared VPC.***

    - ***Deployment and Automation:***
        ***Deploying resources across different projects can be more challenging than within a single project. Automating deployments and ensuring consistency requires well-defined workflows and tools.***

    - ***Upgrading and Maintenance:***
        ***Keeping all projects in sync with respect to network changes, security patches, and maintenance can be more complex when dealing with multiple projects in a Shared VPC.***

---

**What GCP service would you use to provide WAF for a public endpoint?**

- ***To provide Web Application Firewall (WAF) protection for a public endpoint in Google Cloud Platform (GCP), you can use the "Google Cloud Armor" service. Google   Cloud Armor is a fully-managed, scalable, and distributed denial-of-service (DDoS) and application defense service that helps protect your applications and services from web-based threats and attacks. By using Google Cloud Armor, you can protect your public endpoints from common web application threats like SQL injection, cross-site scripting (XSS) attacks, and more. It also helps protect against DDoS attacks by inspecting and filtering traffic before it reaches your application. Also, Google Cloud Armor integrates seamlessly with Google Cloud's global network infrastructure, providing low-latency, high-performance security.***
