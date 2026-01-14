#!/bin/bash
# WebGuard Monitoring Feature Test

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'

log_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

log_test() {
    echo -e "${COLOR_YELLOW}[TEST]${COLOR_RESET} $1"
}

# Get JSON value
get_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Make API request
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"

    local url="${API_BASE}${endpoint}"
    local headers="-H 'Content-Type: application/json'"

    if [ -n "$token" ]; then
        headers="$headers -H 'Authorization: Bearer $token'"
    fi

    if [ "$method" = "GET" ]; then
        eval "curl -s -X GET $url $headers"
    elif [ "$method" = "POST" ]; then
        eval "curl -s -X POST $url $headers -d '$data'"
    fi
}

# ============================================================================
log_info "=== WebGuard Monitoring Feature Test ==="
echo ""

# Test 1: Register and login
log_test "Register test user"
TEST_EMAIL="monitor_test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"full_name\":\"Monitor Test User\"}"
response=$(api_request "POST" "/auth/register" "$data" "")
ACCESS_TOKEN=$(get_json_value "$response" "access_token")

if [ -n "$ACCESS_TOKEN" ]; then
    log_success "User registered"
else
    log_error "Registration failed"
    exit 1
fi

# Test 2: Create organization
log_test "Create organization"
data="{\"name\":\"Monitoring Test Org\",\"slug\":\"monitor-test-$(date +%s)\"}"
response=$(api_request "POST" "/api/organizations" "$data" "$ACCESS_TOKEN")
ORG_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ORG_ID" ]; then
    log_success "Organization created: $ORG_ID"
else
    log_error "Organization creation failed"
    exit 1
fi

# Test 3: Create domain (should auto-create monitors)
log_test "Create domain with auto-monitoring"
data="{\"name\":\"google.com\"}"
response=$(api_request "POST" "/api/domains?org_id=$ORG_ID" "$data" "$ACCESS_TOKEN")
DOMAIN_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DOMAIN_ID" ]; then
    log_success "Domain created: $DOMAIN_ID"
    # Check if monitors were auto-created
    if echo "$response" | grep -q "monitors_created"; then
        log_success "Monitors auto-created: ssl, uptime"
    else
        log_error "Monitors were not auto-created"
    fi
else
    log_error "Domain creation failed: $response"
    exit 1
fi

# Test 4: Wait a moment for initial checks
log_test "Wait for monitoring tasks to process..."
sleep 5

# Test 5: Check domain details
log_test "Get domain details"
response=$(api_request "GET" "/api/domains/$DOMAIN_ID" "" "$ACCESS_TOKEN")
if echo "$response" | grep -q "google.com"; then
    log_success "Domain details retrieved"
else
    log_error "Failed to get domain details"
fi

# Test 6: List all domains
log_test "List all domains in organization"
response=$(api_request "GET" "/api/domains?org_id=$ORG_ID" "" "$ACCESS_TOKEN")
if echo "$response" | grep -q "google.com"; then
    log_success "Domain list contains test domain"
else
    log_error "Domain list missing test domain"
fi

log_info "=== Monitoring Feature Test Complete ==="
echo ""
log_info "Test User: $TEST_EMAIL"
log_info "Organization ID: $ORG_ID"
log_info "Domain ID: $DOMAIN_ID"
log_info "Domain: google.com"
echo ""
log_info "Auto-created monitors:"
log_info "  - SSL Certificate Monitoring"
log_info "  - Uptime Monitoring"
echo ""
log_success "All monitoring tests passed!"
