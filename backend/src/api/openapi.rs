//! OpenAPI/Swagger 文档配置

use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};
use utoipa::OpenApi;

/// WebGuard API 文档
#[derive(OpenApi)]
#[openapi(
    info(
        title = "WebGuard API",
        version = "1.0.0",
        description = "WebGuard - 域名监控服务 API 文档",
        contact(
            name = "WebGuard Team"
        )
    ),
    paths(
        // 认证相关
        crate::api::handlers::auth::health_check,
        crate::api::handlers::auth::register,
        crate::api::handlers::auth::login,
        crate::api::handlers::auth::refresh_token,
        // 组织相关
        crate::api::handlers::organizations::create_organization,
        crate::api::handlers::organizations::list_organizations,
        crate::api::handlers::organizations::get_organization,
        crate::api::handlers::organizations::update_organization,
        crate::api::handlers::organizations::delete_organization,
        crate::api::handlers::organizations::list_members,
        crate::api::handlers::organizations::add_member,
        crate::api::handlers::organizations::remove_member,
        crate::api::handlers::organizations::update_member_role,
        // 域名相关
        crate::api::handlers::domains::list_domains,
        crate::api::handlers::domains::create_domain,
        crate::api::handlers::domains::get_domain,
        crate::api::handlers::domains::update_domain,
        crate::api::handlers::domains::delete_domain,
        // 监控相关
        crate::api::handlers::monitoring::get_latest_uptime,
        crate::api::handlers::monitoring::get_latest_ssl,
        crate::api::handlers::monitoring::get_uptime_history,
        crate::api::handlers::monitoring::get_uptime_aggregate,
        crate::api::handlers::monitoring::trigger_check,
    ),
    components(
        schemas(
            // 错误
            crate::error::ErrorResponse,
            // 认证
            crate::api::handlers::auth::RegisterRequestJson,
            crate::api::handlers::auth::LoginRequestJson,
            crate::api::handlers::auth::RefreshTokenRequest,
            crate::api::handlers::auth::AuthResponse,
            crate::api::handlers::auth::UserResponse,
            // 组织
            crate::api::handlers::organizations::CreateOrganizationRequest,
            crate::api::handlers::organizations::UpdateOrganizationRequest,
            crate::api::handlers::organizations::AddMemberRequest,
            crate::api::handlers::organizations::UpdateMemberRoleRequest,
            crate::db::models::Organization,
            crate::db::models::OrganizationMember,
            crate::db::models::MemberRole,
            // 域名
            crate::api::handlers::domains::CreateDomainRequest,
            crate::api::handlers::domains::UpdateDomainRequest,
            crate::api::handlers::domains::DomainQueryParams,
            crate::db::models::Domain,
            // 监控
            crate::api::handlers::monitoring::HistoryQuery,
            crate::api::handlers::monitoring::AggregateQuery,
            crate::api::handlers::monitoring::UptimeStatusResponse,
            crate::api::handlers::monitoring::SslStatusResponse,
        )
    ),
    tags(
        (name = "认证", description = "用户认证相关接口"),
        (name = "组织", description = "组织管理相关接口"),
        (name = "域名", description = "域名监控相关接口"),
        (name = "监控", description = "域名监控数据接口")
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

/// 安全认证添加器
struct SecurityAddon;

impl utoipa::Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "BearerAuth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some("JWT 访问令牌认证"))
                        .build(),
                ),
            )
        }
    }
}
