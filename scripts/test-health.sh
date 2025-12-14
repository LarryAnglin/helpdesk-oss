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

# Simple script to test the health check endpoint
# Run this script to verify the health endpoint is working correctly

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Testing health check endpoint at http://localhost:3000/api/health"
echo "=============================================================="

# Make the request
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$response" == "200" ]; then
  echo -e "${GREEN}✓ Health check passed: Status code $response${NC}"
  echo "Fetching response details..."
  echo ""
  curl -s http://localhost:3000/api/health | jq
  exit 0
else
  echo -e "${RED}✗ Health check failed: Status code $response${NC}"
  echo "Make sure the development server is running (npm run dev)"
  exit 1
fi