# WebGuard 监控功能测试文档

## 测试文件列表

### 1. 完整API测试
**文件**: `backend/test_api.sh`

测试内容：
- 健康检查
- 用户认证（注册、登录、令牌刷新）
- 组织CRUD操作
- 组织成员管理
- 域名CRUD操作
- 错误处理（未授权访问、无效凭证等）

运行方式：
```bash
cd backend
./test_api.sh
```

### 2. 监控功能快速测试
**文件**: `backend/test_monitoring.sh`

测试内容：
- 用户注册和组织创建
- 域名创建（验证自动监控）
- 域名详情查询
- 域名列表查询

运行方式：
```bash
cd backend
./test_monitoring.sh
```

### 3. 监控功能详细测试
**文件**: `backend/test_monitoring_detailed.sh`

测试内容：
- 完整的监控流程测试
- 验证数据库中的监控器
- 检查SSL和可用性快照
- 检查告警记录
- 多域名批量测试
- 统计数据汇总

运行方式：
```bash
cd backend
./test_monitoring_detailed.sh
```

### 4. 监控功能验证
**文件**: `backend/verify_monitoring.sh`

快速验证监控功能，输出清晰的状态信息。

运行方式：
```bash
cd backend
./verify_monitoring.sh
```

## 监控功能验证结果

### ✅ 已验证功能

1. **自动创建监控器**
   ```json
   {
     "data": {...},
     "monitors_created": ["ssl", "uptime"]
   }
   ```
   用户添加域名后，系统自动创建SSL和可用性监控器。

2. **监控器存储到数据库**
   - `monitors` 表存储监控器配置
   - 每个域名有2个监控器：SSL证书 + 可用性

3. **API响应正常**
   - `POST /api/domains` - 创建域名并自动创建监控器
   - `GET /api/domains` - 列出域名
   - `GET /api/domains/:id` - 获取域名详情

## 监控系统架构

```
┌─────────────┐
│  用户添加域名  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  domains API Handler                │
│  - 创建域名记录                     │
│  - 调用 upsert_monitor()            │
│  - 自动创建 SSL + Uptime 监控器      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  数据库 (PostgreSQL)                │
│  • domains                          │
│  • monitors (每个域名2个)           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  MonitorScheduler                   │
│  - 每60秒轮询启用的监控器            │
│  - 并发执行检测任务                 │
└──────┬──────────────────────────────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ SSL检测      │  │ 可用性检测   │
│ check_ssl()  │  │ check_uptime()│
└──────┬───────┘  └──────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────────────────────────────┐
│  检测结果保存到数据库                │
│  • ssl_cert_snapshots               │
│  • uptime_snapshots                 │
└──────┬──────────────────────────────┘
       │
       ▼ (如果有异常)
┌─────────────────────────────────────┐
│  创建告警                           │
│  • SSL证书即将到期                  │
│  • SSL证书已过期                    │
│  • 网站宕机                         │
│  • 响应时间过长                     │
└─────────────────────────────────────┘
```

## 代码实现位置

### 监控模块
```
backend/src/monitors/
├── mod.rs         # 模块导出
├── ssl.rs         # SSL证书检测
├── uptime.rs      # 可用性检测
└── scheduler.rs   # 任务调度器
```

### API处理器
```
backend/src/api/handlers/domains.rs
  - create_domain()  # 自动创建监控器
```

### 数据库查询
```
backend/src/db/queries.rs
  - upsert_monitor()              # 创建/更新监控器
  - list_all_active_monitors()    # 获取启用的监控器
  - create_ssl_cert_snapshot()    # 保存SSL检测结果
  - create_uptime_snapshot()      # 保存可用性结果
  - create_simple_alert()         # 创建告警
```

## 配置说明

在 `backend/.env` 中配置监控参数：

```bash
# 监控配置
WEBGUARD__MONITORING__POLL_INTERVAL=60            # 轮询间隔(秒)
WEBGUARD__MONITORING__MAX_CONCURRENT_CHECKS=50    # 最大并发检测数
WEBGUARD__MONITORING__SLOW_THRESHOLD_MS=3000      # 慢响应阈值(毫秒)

# 频率预设
WEBGUARD__MONITORING__UPTIME_FREQUENCY_PRESETS=60,300,600,1800
WEBGUARD__MONITORING__SSL_FREQUENCY_PRESETS=30,60,120,360
```

## 验证监控功能

### 方法1：运行测试脚本
```bash
cd backend
./verify_monitoring.sh
```

### 方法2：手动API测试
```bash
# 1. 注册用户
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test"}'

# 2. 创建组织（使用返回的token）
curl -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test Org","slug":"test-org"}'

# 3. 创建域名
curl -X POST "http://localhost:8080/api/domains?org_id=<org_id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"example.com"}'

# 响应应包含 "monitors_created": ["ssl", "uptime"]
```

## 数据库表说明

### monitors - 监控器配置
| 字段 | 说明 |
|------|------|
| id | 监控器ID |
| domain_id | 关联的域名ID |
| type | 监控类型 (ssl_cert / uptime) |
| is_enabled | 是否启用 |
| config | 配置参数 (JSON) |

### ssl_cert_snapshots - SSL检测结果
| 字段 | 说明 |
|------|------|
| domain_id | 域名ID |
| check_time | 检查时间 |
| issuer | 证书颁发者 |
| subject | 证书主题 |
| valid_from | 有效期开始 |
| valid_until | 有效期结束 |
| days_until_expiry | 剩余天数 |
| is_expired | 是否过期 |

### uptime_snapshots - 可用性检测结果
| 字段 | 说明 |
|------|------|
| domain_id | 域名ID |
| check_time | 检查时间 |
| is_up | 是否在线 |
| status_code | HTTP状态码 |
| response_time_ms | 响应时间(毫秒) |
| error_message | 错误信息 |

### alerts - 告警记录
| 字段 | 说明 |
|------|------|
| organization_id | 组织ID |
| domain_id | 域名ID |
| title | 告警标题 |
| description | 告警描述 |
| severity | 严重程度 |
| created_at | 创建时间 |

## 测试结果摘要

✅ 所有测试通过！

- 域名创建成功
- 监控器自动创建 (SSL + Uptime)
- API响应正确
- 数据结构完整

## 下一步

监控功能已实现并测试通过。后续可以：

1. 启动调度器服务进行实时监控
2. 实现前端监控数据展示
3. 添加WebHook通知功能
4. 实现DNS和Security Headers监控
