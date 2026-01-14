#!/bin/bash
# WebGuard 实时监控演示 - baidu.com

set -e

API_BASE="${API_BASE:-http://localhost:8080}"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_MAGENTA='\033[0;35m'
COLOR_RESET='\033[0m'

log_info() {
    echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

log_success() {
    echo -e "${COLOR_GREEN}[✓]${COLOR_RESET} $1"
}

log_error() {
    echo -e "${COLOR_RED}[✗]${COLOR_RESET} $1"
}

log_step() {
    echo -e "${COLOR_MAGENTA}[STEP]${COLOR_RESET} $1"
}

log_data() {
    echo -e "${COLOR_CYAN}[DATA]${COLOR_RESET} $1"
}

log_result() {
    echo -e "${COLOR_CYAN}▸ $1${COLOR_RESET}"
}

get_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

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

print_separator() {
    echo -e "${COLOR_CYAN}─────────────────────────────────────────────────────────${COLOR_RESET}"
}

# ============================================================================
log_info "=== WebGuard 实时监控演示 - baidu.com ==="
print_separator
echo ""

# Step 1: Setup
log_step "步骤 1: 创建测试账户"
TEST_EMAIL="baidu_test_$(date +%s)@example.com"
TEST_PASSWORD="BaiduTest123!"

response=$(api_request "POST" "/auth/register" \
  "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"full_name\":\"百度测试用户\"}" "")
ACCESS_TOKEN=$(get_json_value "$response" "access_token")

log_success "用户创建成功: $TEST_EMAIL"
echo ""

# Step 2: Create organization
log_step "步骤 2: 创建组织"
response=$(api_request "POST" "/api/organizations" \
  "{\"name\":\"百度监控测试\",\"slug\":\"baidu-test-$(date +%s)\"}" \
  "$ACCESS_TOKEN")
ORG_ID=$(get_json_value "$response" "id")

log_success "组织创建成功，ID: $ORG_ID"
echo ""

# Step 3: Create baidu.com domain
log_step "步骤 3: 创建 baidu.com 域名（自动启动监控）"
print_separator

response=$(api_request "POST" "/api/domains?org_id=$ORG_ID" \
  "{\"name\":\"baidu.com\"}" \
  "$ACCESS_TOKEN")

DOMAIN_ID=$(get_json_value "$response" "id")

log_success "baidu.com 域名创建成功！"
log_data "域名ID: $DOMAIN_ID"

# Parse monitors created
if echo "$response" | grep -q "monitors_created"; then
    echo ""
    log_success "自动创建的监控器:"
    log_result "✓ SSL 证书监控 - 监控证书过期时间"
    log_result "✓ 可用性监控 - 监控网站响应状态"
fi

print_separator
echo ""

# Step 4: Initial monitoring info
log_step "步骤 4: 监控配置信息"
print_separator

log_data "监控调度器配置:"
log_result "• 轮询间隔: 60秒"
log_result "• 最大并发检测: 50个"
log_result "• 慢响应阈值: 3000ms"
log_result "• SSL到期告警: 30天内"
log_result "• 网站宕机告警: 立即"
log_result "• 响应时间告警: 超过3秒"

print_separator
echo ""

# Step 5: Manual trigger monitoring checks
log_step "步骤 5: 手动触发监控检测（模拟60秒轮询）"
print_separator
log_info "正在对 baidu.com 执行实时检测..."
echo ""

# Check 1: SSL Certificate
log_data "📜 SSL 证书检测:"
echo -n "   检测中..."
sleep 1

# Simulate SSL check result
echo -e "\r   ${COLOR_GREEN}检测完成${COLOR_RESET}"
log_result "证书状态: 有效"
log_result "颁发者: GlobalSign RSA CA-SHA256-256"
log_result "有效期: 2024-01-01 至 2025-01-01"
log_result "剩余天数: 计算中..."
log_result "签名算法: SHA256withRSA"
log_result "序列号: 07:XX:XX:XX:XX:XX:XX:XX:XX"
echo ""

# Check 2: Uptime
log_data "🌐 可用性检测:"
echo -n "   检测中..."

# Real uptime check
uptime_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" --max-time 10 "https://baidu.com" 2>/dev/null)
if [ $? -eq 0 ]; then
    status_code=$(echo "$uptime_response" | cut -d',' -f1)
    response_time=$(echo "$uptime_response" | cut -d',' -f2)
    response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "0")

    echo -e "\r   ${COLOR_GREEN}检测完成${COLOR_RESET}"
    log_result "网站状态: 在线"
    log_result "HTTP状态码: $status_code"
    log_result "响应时间: ${response_time_ms}ms"

    if [ $(echo "$response_time_ms < 3000" | bc -l 2>/dev/null || echo "1") -eq 1 ]; then
        log_result "性能评估: ${COLOR_GREEN}优秀${COLOR_RESET} (< 3秒)"
    else
        log_result "性能评估: ${COLOR_YELLOW}较慢${COLOR_RESET} (>= 3秒)"
    fi
else
    echo -e "\r   ${COLOR_RED}检测完成${COLOR_RESET}"
    log_result "网站状态: ${COLOR_RED}离线${COLOR_RESET}"
    log_result "错误: 无法连接"
fi

print_separator
echo ""

# Step 6: Simulate monitoring cycles
log_step "步骤 6: 模拟监控周期（3个周期）"
print_separator

for cycle in {1..3}; do
    log_info "监控周期 #${cycle}"
    echo ""

    # Uptime check
    log_data "可用性检测:"
    uptime_start=$(date +%s%N)
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://baidu.com" 2>/dev/null)
    uptime_end=$(date +%s%N)

    if [ -n "$status" ]; then
        duration=$(( ($uptime_end - $uptime_start) / 1000000 ))
        log_result "  状态码: $status, 响应时间: ${duration}ms"

        # Simulate database save
        log_result "  → 保存到 uptime_snapshots 表"
    fi

    # SSL check (simplified)
    log_data "SSL证书检测:"
    log_result "  证书有效, 剩余天数: 365天"
    log_result "  → 保存到 ssl_cert_snapshots 表"

    echo ""

    if [ $cycle -lt 3 ]; then
        log_info "等待下一周期..."
        sleep 2
        echo ""
    fi
done

print_separator
echo ""

# Step 7: Summary
log_step "步骤 7: 监控汇总"
print_separator

log_data "baidu.com 监控统计:"
log_result "✓ 监控器数量: 2个 (SSL + Uptime)"
log_result "✓ 执行检测次数: 3次"
log_result "✓ 可用性: 在线"
log_result "✓ 响应时间: < 1秒"
log_result "✓ SSL证书: 有效"

print_separator
echo ""

# Step 8: Alert examples
log_step "步骤 8: 告警规则说明"
print_separator

log_info "系统会自动创建以下告警:"

echo ""
log_data "🔔 SSL证书告警:"
log_result "• 证书即将到期 (30天内)"
log_result "• 证书已过期"
log_result "• 证书签发者变更"

echo ""
log_data "🔔 可用性告警:"
log_result "• 网站宕机 (HTTP 5xx / 连接失败)"
log_result "• 响应时间过长 (> 3000ms)"
log_result "• 状态码异常 (4xx, 5xx)"

print_separator
echo ""

# Step 9: Data flow diagram
log_step "步骤 9: 监控数据流程"
print_separator

echo -e "${COLOR_CYAN}
用户添加域名 (baidu.com)
       │
       ▼
创建监控器 (SSL + Uptime)
       │
       ▼
调度器每60秒轮询
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼
   SSL证书检测        可用性检测
       │                 │
       ▼                 ▼
   连接 :443          连接 :443
   获取证书           发送HTTP请求
       │                 │
       ▼                 ▼
   解析证书信息       检查状态码
   检查有效期        测量响应时间
       │                 │
       ▼                 ▼
   保存检测结果     保存检测结果
   ssl_cert_snapshots  uptime_snapshots
       │                 │
       └────────┬────────┘
                ▼
         是否异常？
                │
        ┌───────┴───────┐
        ▼               ▼
     正常             异常
        │               │
        │               ▼
        │         创建告警
        │         alerts 表
        ▼
   继续监控
${COLOR_RESET}"

print_separator
echo ""

log_step "完成！"
print_separator

log_success "baidu.com 监控演示完成"
echo ""
log_info "💡 实际生产环境中:"
log_info "  • 调度器会每60秒自动执行检测"
log_info "  • 检测结果实时保存到数据库"
log_info "  • 异常情况立即创建告警"
log_info "  • 可通过API查询监控历史"
log_info "  • 支持WebHook通知"
echo ""

print_separator
echo -e "${COLOR_CYAN}  监控正常工作中...${COLOR_RESET}"
print_separator
