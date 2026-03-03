terraform {
  required_version = ">= 1.9.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "rayan-memory"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "backend_image" {
  description = "Backend container image"
  type        = string
  default     = "gcr.io/rayan-memory/rayan-backend:latest"
}

# Service account for backend
resource "google_service_account" "backend" {
  account_id   = "rayan-backend"
  display_name = "Rayan Backend Service"
}

resource "google_project_iam_member" "backend_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_vertex" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# Cloud Run backend service
resource "google_cloud_run_v2_service" "backend" {
  name     = "rayan-backend"
  location = var.region

  template {
    service_account = google_service_account.backend.email

    containers {
      image = var.backend_image

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 8080
      }
    }

    annotations = {
      "run.googleapis.com/sessionAffinity" = "true"
    }

    scaling {
      max_instance_count = 10
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Firestore database
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Cloud Storage for media artifacts
resource "google_storage_bucket" "media" {
  name          = "rayan-media-${var.project_id}"
  location      = "US"
  force_destroy = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  uniform_bucket_level_access = true
}

# Cloud Storage for frontend hosting
resource "google_storage_bucket" "frontend" {
  name          = "rayan-frontend-${var.project_id}"
  location      = "US"
  force_destroy = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  uniform_bucket_level_access = false
}

resource "google_storage_bucket_iam_member" "frontend_public" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Vertex AI Vector Search index
resource "google_vertex_ai_index" "artifacts" {
  display_name = "artifact-embeddings"
  description  = "Semantic search index for memory artifacts"
  region       = var.region

  metadata {
    contents_delta_uri = "gs://${google_storage_bucket.media.name}/embeddings/"
    config {
      dimensions                  = 768
      approximate_neighbors_count = 150
      distance_measure_type       = "COSINE_DISTANCE"

      algorithm_config {
        tree_ah_config {
          leaf_node_embedding_count    = 1000
          leaf_nodes_to_search_percent = 10
        }
      }
    }
  }
}

output "backend_url" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "Cloud Run backend URL"
}

output "media_bucket" {
  value       = google_storage_bucket.media.name
  description = "Media storage bucket name"
}

output "frontend_bucket" {
  value       = google_storage_bucket.frontend.name
  description = "Frontend hosting bucket name"
}
