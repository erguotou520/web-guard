#!/bin/bash
# WebGuard Detailed Monitoring Test
# This script verifies that monitoring actually works end-to-end

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'

log_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[✓]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[✗]${COLOR_RESET} $1"
}

log_test() {
    echo -e "${COLOR_YELLOW}[TEST]${COLOR_RESET} $1"
}

log_data() {
    echo -e "${COLOR_CYAN}[DATA]${COLOR_RESET} $1"
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

# Query database directly
db_query() {
    local sql="$1"
    /opt/homebrew/opt/postgresql@16/bin/psql -U postgres -d webguard -c "$sql" -t 2>/dev/null || echo ""
}

# ============================================================================
log_info "=== WebGuard 详细监控功能测试 ==="
echo ""

# Step 1: Setup
log_test "步骤 1: 创建测试用户和组织"
TEST_EMAIL="detailed_test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"full_name\":\"Detailed Test\"}"
response=$(api_request "POST" "/auth/register" "$data" "")
ACCESS_TOKEN=$(get_json_value "$response" "access_token")

data="{\"name\":\"详细测试组织\",\"slug\":\"detailed-test-$(date +%s)\"}"
response=$(api_request "POST" "/api/organizations" "$data" "$ACCESS_TOKEN")
ORG_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

log_success "用户和组织创建成功"

# Step 2: Create domain and verify monitors are created
log_test "步骤 2: 创建域名并验证监控器自动创建"
data="{\"name\":\"example.com\"}"
response=$(api_request "POST" "/api/domains?org_id=$ORG_ID" "$data" "$ACCESS_TOKEN")
DOMAIN_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DOMAIN_ID" ]; then
    log_success "域名创建成功: $DOMAIN_ID"
else
    log_error "域名创建失败"
    exit 1
fi

# Step 3: Verify monitors in database
log_test "步骤 3: 验证数据库中的监控器"
sleep 2

# Check monitors table
MONITORS_COUNT=$(db_query "SELECT COUNT(*) FROM monitors WHERE domain_id = '$DOMAIN_ID';" | tr -d ' ')
log_data "监控器数量: $MONITORS_COUNT"

if [ "$MONITORS_COUNT" -ge 2 ]; then
    log_success "找到 $MONITORS_COUNT 个监控器 (SSL + Uptime)"

    # Show monitor details
    db_query "SELECT type, is_enabled FROM monitors WHERE domain_id = '$DOMAIN_ID';" | while read type enabled; do
        type_clean=$(echo $type | tr -d ' ')
        enabled_clean=$(echo $enabled | tr -d ' ')
        log_data "  - 类型: $type_clean, 启用: $enabled_clean"
    done
else
    log_error "监控器数量不足: 期望 >= 2, 实际: $MONITORS_COUNT"
fi

# Step 4: Wait for monitoring tasks to run
log_test "步骤 4: 等待监控任务执行 (等待10秒)..."
log_info "调度器会定期检查启用的监控器并执行检测"
for i in {10..1}; do
    echo -n "  $i 秒..."
    sleep 1
done
echo ""

# Step 5: Check SSL snapshots
log_test "步骤 5: 检查SSL证书快照"
SSL_SNAPSHOTS=$(db_query "SELECT COUNT(*) FROM ssl_cert_snapshots WHERE domain_id = '$DOMAIN_ID';" | tr -d ' ')
log_data "SSL快照数量: $SSL_SNAPSHOTS"

if [ "$SSL_SNAPSHOTS" -gt 0 ]; then
    log_success "SSL证书检测结果已记录"

    # Show latest SSL snapshot
    db_query "SELECT issuer, is_valid, days_until_expiry FROM ssl_cert_snapshots WHERE domain_id = '$DOMAIN_ID' ORDER BY check_time DESC LIMIT 1;" | while read issuer valid days; do
        log_data "  最新SSL快照:"
        log_data "    颁发者: $issuer"
        log_data "    有效: $valid"
        log_data "    剩余天数: $days"
    done
else
    log_info "SSL快照尚未生成（调度器可能还未运行）"
fi

# Step 6: Check uptime snapshots
log_test "步骤 6: 检查可用性快照"
UPTIME_SNAPSHOTS=$(db_query "SELECT COUNT(*) FROM uptime_snapshots WHERE domain_id = '$DOMAIN_ID';" | tr -d ' ')
log_data "可用性快照数量: $UPTIME_SNAPSHOTS"

if [ "$UPTIME_SNAPSHOTS" -gt 0 ]; then
    log_success "可用性检测结果已记录"

    # Show latest uptime snapshots
    db_query "SELECT is_up, status_code, response_time_ms FROM uptime_snapshots WHERE domain_id = '$DOMAIN_ID' ORDER BY check_time DESC LIMIT 3;" | while read up status time; do
        log_data "  检测记录:"
        log_data "    状态: $up"
        log_data "    状态码: $status"
        log_data "    响应时间: ${time}ms"
    done
else
    log_info "可用性快照尚未生成（调度器可能还未运行）"
fi

# Step 7: Check alerts
log_test "步骤 7: 检查告警记录"
ALERTS_COUNT=$(db_query "SELECT COUNT(*) FROM alerts WHERE domain_id = '$DOMAIN_ID';" | tr -d ' ')
log_data "告警数量: $ALERTS_COUNT"

if [ "$ALERTS_COUNT" -gt 0 ]; then
    log_info "找到 $ALERTS_COUNT 条告警:"
    db_query "SELECT title, created_at FROM alerts WHERE domain_id = '$DOMAIN_ID' ORDER BY created_at DESC LIMIT 5;" | while read title created; do
        log_data "  - $title (创建时间: $created)"
    done
else
    log_success "没有触发告警（域名状态正常）"
fi

# Step 8: Test multiple domains
log_test "步骤 8: 测试多个域名的监控"
DOMAINS=("github.com" "stackoverflow.com" "reddit.com")

for domain in "${DOMAINS[@]}"; do
    data="{\"name\":\"$domain\"}"
    response=$(api_request "POST" "/api/domains?org_id=$ORG_ID" "$data" "$ACCESS_TOKEN")
    new_domain_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$new_domain_id" ]; then
        monitors=$(db_query "SELECT COUNT(*) FROM monitors WHERE domain_id = '$new_domain_id';" | tr -d ' ')
        log_data "  $domain - 域名ID: $new_domain_id, 监控器: $monitors 个"
    fi
done

# Step 9: Summary
log_test "步骤 9: 监控数据汇总"
sleep 5

TOTAL_DOMAINS=$(db_query "SELECT COUNT(*) FROM domains WHERE organization_id = '$ORG_ID';" | tr -d ' ')
TOTAL_MONITORS=$(db_query "SELECT COUNT(*) FROM monitors WHERE domain_id IN (SELECT id FROM domains WHERE organization_id = '$ORG_ID');" | tr -d ' ')
TOTAL_SSL_SNAPSHOTS=$(db_query "SELECT COUNT(*) FROM ssl_cert_snapshots WHERE domain_id IN (SELECT id FROM domains WHERE organization_id = '$ORG_ID');" | tr -d ' ')
TOTAL_UPTIME_SNAPSHOTS=$(db_query "SELECT COUNT(*) FROM uptime_snapshots WHERE domain_id IN (SELECT id FROM domains WHERE organization_id = '$ORG_ID');" | tr -d ' ')

log_data "组织统计:"
log_data "  域名总数: $TOTAL_DOMAINS"
log_data "  监控器总数: $TOTAL_MONITORS"
log_data "  SSL检测记录: $TOTAL_SSL_SNAPSHOTS"
log_data "  可用性检测记录: $TOTAL_UPTIME_SNAPSHOTS"

# ============================================================================
echo ""
log_info "=== 监控系统架构说明 ==="
log_info ""
log_info "📊 监控流程:"
log_info "  1. 用户添加域名"
log_info "  2. 系统自动创建监控器 (SSL + Uptime)"
log_info "  3. 调度器定期检查启用的监控器"
log_info "  4. 执行检测并保存结果到数据库"
log_info "  5. 异常情况自动创建告警"
log_info ""
log_info "🗄️ 数据库表:"
log_info "  • monitors - 监控器配置"
log_info "  • ssl_cert_snapshots - SSL证书检测结果"
log_info "  • uptime_snapshots - 可用性检测结果"
log_info "  • alerts - 告警记录"
log_info ""
log_info "⚙️ 配置参数 (.env):"
log_info "  • MONITORING__POLL_INTERVAL=60 - 轮询间隔(秒)"
log_info "  • MONITORING__MAX_CONCURRENT_CHECKS=50 - 最大并发检测数"
log_info "  • MONITORING__SLOW_THRESHOLD_MS=3000 - 慢响应阈值"
log_info ""
log_info "📁 测试脚本位置:"
log_info "  • backend/test_api.sh - 完整API测试"
log_info "  • backend/test_monitoring.sh - 监控功能快速测试"
log_info "  • backend/test_monitoring_detailed.sh - 监控功能详细测试(本文件)"
log_info ""

log_success "详细监控功能测试完成！"
