# Develop Terraform code for creating and managing 10,000 Google Pub/Sub topics.

- Created terraform code to create and manage 10000 Pub/Sub topics.
- Created gcs bucket which holds terraform state.
    - Step 1: `terraform plan` and `apply` with out backend configuration which will create all the resources and save the `terraform.tfstate` locally.
    - step 2: Add the backend config and execute the `terraform apply`  which will move `terraform.tfstate` to remote gcs bucket which we created in step 1.  
- At this point multiple users can work on the terraform module using remote backend which supports locking of state when someone is executing the plan.
- Tested creating and destroying pub/sub topics using this terraform code.
- Included `terraform state list` in this repo for verification.
- GCS terraform state shown below.
  
![image](https://github.com/ciwa09/k8s-web-app/assets/194199/1d848eb6-2335-4d1a-84d5-30342e77625a)

![image](https://github.com/ciwa09/k8s-web-app/assets/194199/d3b3ed28-c5ba-43fe-bf69-ecc19462a366)

