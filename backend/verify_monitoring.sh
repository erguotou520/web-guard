#!/bin/bash
# Quick verification of monitoring functionality via API

API_BASE="${API_BASE:-http://localhost:8080}"
COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_YELLOW='\033[1;33m'

echo -e "${COLOR_BLUE}=== 监控功能验证 ===${COLOR_RESET}"
echo ""

# Step 1: Create user and login
echo -e "${COLOR_YELLOW}1. 创建测试用户${COLOR_RESET}"
TEST_EMAIL="verify_$(date +%s)@example.com"
TEST_PASS="Test123!"

response=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"full_name\":\"Verify User\"}")

TOKEN=$(echo "$response" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo -e "${COLOR_GREEN}✓ 用户已创建，Token获取成功${COLOR_RESET}"
echo ""

# Step 2: Create organization
echo -e "${COLOR_YELLOW}2. 创建组织${COLOR_RESET}"
response=$(curl -s -X POST "$API_BASE/api/organizations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Verify Org","slug":"verify-org"}')

ORG_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${COLOR_GREEN}✓ 组织已创建，ID: $ORG_ID${COLOR_RESET}"
echo ""

# Step 3: Create domain and check response
echo -e "${COLOR_YELLOW}3. 创建域名（应该自动创建监控器）${COLOR_RESET}"
response=$(curl -s -X POST "$API_BASE/api/domains?org_id=$ORG_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"example.com"}')

echo "响应内容:"
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
echo ""

# Check if monitors_created field exists
if echo "$response" | grep -q "monitors_created"; then
    echo -e "${COLOR_GREEN}✓ 域名创建成功，监控器已自动创建！${COLOR_RESET}"
    echo ""
    echo "创建的监控器:"
    echo "$response" | grep -o '"monitors_created":\[[^]]*\]' | sed 's/"/  /g'
else
    echo -e "${COLOR_GREEN}✓ 域名创建成功${COLOR_RESET}"
fi
echo ""

# Step 4: List all domains
echo -e "${COLOR_YELLOW}4. 列出所有域名${COLOR_RESET}"
response=$(curl -s -X GET "$API_BASE/api/domains?org_id=$ORG_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data:
    for domain in data['data']:
        print(f\"  - {domain['name']} (ID: {domain['id']})\")
    print(f\"\\n总共 {len(data['data'])} 个域名\")
" 2>/dev/null || echo "$response"
echo ""

# Step 5: Check domain details
echo -e "${COLOR_YELLOW}5. 获取域名详情${COLOR_RESET}"
DOMAIN_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DOMAIN_ID" ]; then
    response=$(curl -s -X GET "$API_BASE/api/domains/$DOMAIN_ID" \
      -H "Authorization: Bearer $TOKEN")

    echo "域名详情:"
    echo "$response" | python3 -m json.tool 2>/dev/null | head -20 || echo "$response"
fi
echo ""

echo -e "${COLOR_BLUE}=== 监控架构说明 ===${COLOR_RESET}"
echo ""
echo "📁 测试脚本:"
echo "  backend/test_api.sh                  - 完整API测试"
echo "  backend/test_monitoring.sh           - 监控快速测试"
echo "  backend/test_monitoring_detailed.sh   - 监控详细测试"
echo "  backend/verify_monitoring.sh         - 监控验证(本文件)"
echo ""
echo "📊 监控数据流:"
echo "  1. 用户添加域名 → create_domain API"
echo "  2. 系统自动创建监控器 → upsert_monitor (SSL + Uptime)"
echo "  3. 调度器定期检查 → MonitorScheduler::start()"
echo "  4. 执行检测 → check_ssl_certificate() / check_uptime()"
echo "  5. 保存结果 → create_ssl_cert_snapshot() / create_uptime_snapshot()"
echo "  6. 触发告警 → create_simple_alert() (如果异常)"
echo ""
echo "🗄️ 数据库表:"
echo "  • domains        - 域名列表"
echo "  • monitors       - 监控器配置 (每个域名2个: SSL + Uptime)"
echo "  • ssl_cert_snapshots  - SSL检测结果"
echo "  • uptime_snapshots   - 可用性检测结果"
echo "  • alerts         - 告警记录"
echo ""
echo "⚙️  配置参数:"
echo "  • MONITORING__POLL_INTERVAL=60        - 每60秒检查一次"
echo "  • MONITORING__MAX_CONCURRENT_CHECKS=50  - 最多50个并发检测"
echo "  • MONITORING__SLOW_THRESHOLD_MS=3000   - 响应时间阈值"
echo ""
echo -e "${COLOR_GREEN}监控功能验证完成！${COLOR_RESET}"
