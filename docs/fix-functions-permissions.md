<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Fix Firebase Functions Permissions

To fix the error: "Unable to retrieve the repository metadata for projects/your-project-id/locations/us-central1/repositories/gcf-artifacts", follow these steps:

## 1. Enable the Artifact Registry API

First, you need to enable the Artifact Registry API for your project:

```bash
gcloud services enable artifactregistry.googleapis.com --project=your-project-id
```

## 2. Grant the Cloud Functions Service Account the Required Permissions

The Cloud Functions service account needs the Artifact Registry Reader role:

```bash
# Get the project number (needed for service account identification)
PROJECT_NUMBER=$(gcloud projects describe your-project-id --format="value(projectNumber)")

# Grant Artifact Registry Reader role to the Cloud Functions service account
gcloud projects add-iam-policy-binding your-project-id \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcf-admin-robot.iam.gserviceaccount.com \
  --role=roles/artifactregistry.reader
```

## 3. Grant Additional Required Permissions

You may also need to grant the following permissions:

```bash
# Grant Storage Object Viewer role
gcloud projects add-iam-policy-binding your-project-id \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcf-admin-robot.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer

# Grant Artifact Registry Repository Administrator role (if needed)
gcloud projects add-iam-policy-binding your-project-id \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/artifactregistry.admin
```

## 4. Using Firebase Console (Alternative Method)

If you prefer using the Firebase Console:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service accounts
4. Click on "Manage service account permissions" (this will take you to Google Cloud Console)
5. Find the service account named "App Engine default service account" or "Cloud Functions service account"
6. Click on the edit icon (pencil)
7. Add the following roles:
   - Artifact Registry Reader
   - Storage Object Viewer

## 5. Wait and Re-deploy

After setting permissions, wait a few minutes for them to propagate, then try deploying again:

```bash
firebase deploy --only functions
```

## Troubleshooting Further Permission Issues

If you encounter additional permission issues, you might need to grant more roles to the service accounts:

```bash
# Cloud Build Service Account
gcloud projects add-iam-policy-binding your-project-id \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/cloudfunctions.developer

# Cloud Functions Service Account - Service Agent role
gcloud projects add-iam-policy-binding your-project-id \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcf-admin-robot.iam.gserviceaccount.com \
  --role=roles/cloudfunctions.serviceAgent
```

Remember to replace `your-project-id` with your actual project ID if it's different.