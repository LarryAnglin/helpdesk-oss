# Firebase Extensions Email Setup Guide

## Location Mapping for Firebase Extensions

When setting up the Firebase Extensions Trigger Email extension, you'll need to select a location that matches your Firestore database location. Here's the mapping between Firestore location codes and the dropdown options:

### Location Reference Table

| Firestore Location Code | Extension Dropdown Option |
|------------------------|---------------------------|
| **nam5** | **Multi-region (United States)** |
| eur3 | Multi-region (Europe - Belgium and Netherlands) |
| us-central1 | Iowa (us-central1) |
| us-west1 | Oregon (us-west1) |
| us-west2 | Los Angeles (us-west2) |
| us-west3 | Salt Lake City (us-west3) |
| us-west4 | Las Vegas (us-west4) |
| us-east1 | South Carolina (us-east1) |
| us-east4 | Northern Virginia (us-east4) |
| europe-west1 | Belgium (europe-west1) |
| europe-west2 | London (europe-west2) |
| europe-west3 | Frankfurt (europe-west3) |
| asia-southeast1 | Singapore (asia-southeast1) |
| asia-south1 | Mumbai (asia-south1) |
| asia-northeast1 | Tokyo (asia-northeast1) |
| asia-northeast2 | Osaka (asia-northeast2) |
| australia-southeast1 | Sydney (australia-southeast1) |

## How to Find Your Firestore Location

1. Go to your Firebase Console
2. Navigate to **Firestore Database**
3. Look for the location indicator (it will show something like "nam5" or another code)
4. Use the table above to find the matching dropdown option

## Common Locations

- If your Firestore shows **nam5**, select **Multi-region (United States)**
- If your Firestore shows **eur3**, select **Multi-region (Europe - Belgium and Netherlands)**
- For single-region locations, the city name in the dropdown usually matches

## Important Note

The extension MUST be installed in the same location as your Firestore database to minimize latency and costs. Cross-region communication can result in:
- Higher latency for email sending
- Additional data transfer charges
- Potential reliability issues

## Need Help?

If you're unsure about your Firestore location:
1. Check the Firestore section in Firebase Console
2. Look for the location code in the database settings
3. Refer to the table above to find the matching option