# Develop Terraform code for creating and managing 10,000 Google Pub/Sub topics.

- Created terraform code to create and manage 10000 Pub/Sub topics.
- Created gcs bucket which holds terraform state.
    - Step 1: `terraform plan` and `apply` with out backend configuration which will create all the resources and save the `terraform.tfstate` locally.
    - step 2: Add the backend config and execute the `terraform apply`  which will move `terraform.tfstate` to remote gcs bucket which we created in step 1.  
- At this point multiple users can work on the terraform module using remote backend which supports locking of state when someone is executing the plan.
- Tested creating and destroying pub/sub topics using this terraform code.
- Included `terraform state list` in this repo for verification.
- GCS terraform state shown below.
![image](https://github.com/ciwa09/k8s-web-app/assets/194199/3dd9eebc-4129-46d9-b962-ec5efa24a5f0)
![image](https://github.com/ciwa09/k8s-web-app/assets/194199/eef25901-f14d-45e6-91bb-ce160cbe283b)
