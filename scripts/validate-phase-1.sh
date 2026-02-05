#!/bin/bash

# Phase 1 Validation Script
# Run this to validate TypeScript and ESLint configuration changes

set -e

echo "=========================================="
echo "Phase 1 Validation: TypeScript & ESLint"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASSED=0
FAILED=0

# Test 1: Check tsconfig.json exists and is valid JSON
echo "Test 1: Root tsconfig.json syntax..."
if bun run --silent sh -c 'jq . /vercel/share/v0-project/tsconfig.json > /dev/null 2>&1'; then
  echo -e "${GREEN}✓ PASS${NC}: Root tsconfig.json is valid"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Root tsconfig.json has invalid JSON"
  ((FAILED++))
fi
echo ""

# Test 2: Check eslint.config.js syntax
echo "Test 2: ESLint configuration syntax..."
if node -c /vercel/share/v0-project/eslint.config.js 2>/dev/null; then
  echo -e "${GREEN}✓ PASS${NC}: eslint.config.js is valid"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: eslint.config.js has syntax errors"
  ((FAILED++))
fi
echo ""

# Test 3: Verify strict mode is enabled
echo "Test 3: TypeScript strict mode enabled..."
if grep -q '"strict": true' /vercel/share/v0-project/tsconfig.json; then
  echo -e "${GREEN}✓ PASS${NC}: strict mode enabled"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: strict mode not enabled"
  ((FAILED++))
fi
echo ""

# Test 4: Verify path aliases are defined
echo "Test 4: Path aliases configured..."
if grep -q '"@neocode' /vercel/share/v0-project/tsconfig.json; then
  echo -e "${GREEN}✓ PASS${NC}: Path aliases defined"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Path aliases missing"
  ((FAILED++))
fi
echo ""

# Test 5: Check that packages extend root config
echo "Test 5: Package configs extend root..."
PACKAGES_OK=0
PACKAGES_TOTAL=0
for dir in /vercel/share/v0-project/packages/*/; do
  if [ -f "${dir}tsconfig.json" ]; then
    ((PACKAGES_TOTAL++))
    if grep -q '"extends": ".*tsconfig.json"' "${dir}tsconfig.json"; then
      ((PACKAGES_OK++))
    fi
  fi
done
if [ $PACKAGES_OK -eq $PACKAGES_TOTAL ] && [ $PACKAGES_TOTAL -gt 0 ]; then
  echo -e "${GREEN}✓ PASS${NC}: All $PACKAGES_TOTAL packages extend root"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ WARN${NC}: Only $PACKAGES_OK/$PACKAGES_TOTAL packages extend root"
  ((FAILED++))
fi
echo ""

# Test 6: ESLint strict rules are configured
echo "Test 6: ESLint strict rules configured..."
if grep -q 'typescript.configs.strict' /vercel/share/v0-project/eslint.config.js; then
  echo -e "${GREEN}✓ PASS${NC}: ESLint strict rules enabled"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: ESLint strict rules not configured"
  ((FAILED++))
fi
echo ""

# Test 7: Check for documentation
echo "Test 7: Documentation files exist..."
DOCS_OK=0
if [ -f /vercel/share/v0-project/TYPESCRIPT_GUIDELINES.md ]; then
  ((DOCS_OK++))
fi
if [ -f /vercel/share/v0-project/PHASE_1_IMPLEMENTATION_REPORT.md ]; then
  ((DOCS_OK++))
fi
if [ $DOCS_OK -eq 2 ]; then
  echo -e "${GREEN}✓ PASS${NC}: All documentation files created"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ WARN${NC}: Only $DOCS_OK/2 documentation files found"
  ((FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "=========================================="
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ Phase 1 Validation PASSED${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run: bun run typecheck"
  echo "2. Run: bun run lint:check"
  echo "3. Review TypeScript and ESLint output"
  echo "4. Fix errors using TYPESCRIPT_GUIDELINES.md"
  exit 0
else
  echo -e "${RED}✗ Phase 1 Validation FAILED${NC}"
  echo ""
  echo "Issues found. Review the tests above."
  exit 1
fi
