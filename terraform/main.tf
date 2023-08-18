provider "google" {
  project = "sound-abbey-xxxxxx"
  region  = "us-west1"
}

terraform {
  backend "gcs" {
    bucket         = "pub-sub-tf-state"
    prefix         = "terraform/pubsub"
  }
}

resource "google_storage_bucket" "state_bucket" {
  name = "pub-sub-tf-state"
  location      = "US"
}

resource "google_pubsub_topic" "topics" {
  count = 10000
  name  = "topic-${count.index}"
}
