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
set -e

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building React application...${NC}"
cd react
npm run build

echo -e "${BLUE}Preparing files for deployment...${NC}"
# Make sure the dist directory exists
if [ ! -d "dist" ]; then
  echo -e "${YELLOW}Warning: 'dist' directory not found. Build may have failed.${NC}"
  exit 1
fi

cd ..

echo -e "${BLUE}Installing dependencies in functions directory...${NC}"
cd functions
npm install
cd ..

echo -e "${YELLOW}Deploying to Firebase...${NC}"
echo "N" | firebase deploy --only functions,hosting,storage,firestore

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "Your application should now be available at your Firebase Hosting URL"