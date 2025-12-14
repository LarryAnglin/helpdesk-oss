# Copyright (c) 2025 anglinAI All Rights Reserved
# To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
# or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
# 
# You are free to:
# - Share — copy and redistribute the material in any medium or format
# - Adapt — remix, transform, and build upon the material
# 
# Under the following terms:
# - Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
# - NonCommercial — You may not use the material for commercial purposes.
# - ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license.
# 
# No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.
#

# Set environment variables for Firebase Functions
echo "Setting up Firebase Functions environment variables..."

# Get the current project ID
PROJECT_ID=$(firebase use | grep 'active project' | sed 's/.*: \(.*\)/\1/')

# Configure Firebase Functions
firebase functions:config:set firestore.database_id=rclhelpdb project.id=your-project-id

echo "Firebase Functions configured with:"
echo "  - Project ID: $PROJECT_ID"
echo "  - Firestore Database ID: rclhelpdb"

# Deploy the functions
echo "Deploying functions..."
firebase deploy --only functions

echo "Done!"

your-project-id