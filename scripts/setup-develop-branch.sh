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

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up develop branch for staging deployments...${NC}"

# Ensure we're on main and up to date
echo -e "${YELLOW}Checking out main branch...${NC}"
git checkout main

echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin main

# Create develop branch
echo -e "${YELLOW}Creating develop branch...${NC}"
git checkout -b develop

echo -e "${YELLOW}Pushing develop branch to remote...${NC}"
git push -u origin develop

echo -e "${GREEN}✅ Develop branch created successfully!${NC}"
echo -e "${GREEN}✅ You can now create feature branches from develop${NC}"
echo -e "${GREEN}✅ Merging to develop will deploy to staging${NC}"
echo -e "${GREEN}✅ Merging to main will deploy to production${NC}"

echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Go to https://github.com/LarryAnglin/helpdesk-oss/settings/branches"
echo "2. Add branch protection rules as described in BRANCH_PROTECTION_SETUP.md"
echo "3. Create your first feature branch: git checkout -b feature/my-feature"