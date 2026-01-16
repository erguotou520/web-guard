export type OpenAPIComponents = {
  schemas: {
    AddMemberRequest: {
      email: string,
      role: OpenAPIComponents['schemas']['MemberRole']
    },
    AggregateQuery: {
      period?: string
    },
    Alert: {
      created_at: string,
      description?: string,
      domain_id: string,
      id: string,
      metadata: any,
      organization_id: string,
      severity: OpenAPIComponents['schemas']['AlertSeverity'],
      title: string,
      type: string,
      webhook_sent_at?: string,
      webhook_status_code?: number,
      webhook_success?: boolean
    },
    AlertSeverity: string,
    AlertsResponse: {
      data: OpenAPIComponents['schemas']['Alert'][]
    },
    AuthResponse: {
      access_token: string,
      refresh_token: string,
      user: OpenAPIComponents['schemas']['UserResponse']
    },
    CreateDomainRequest: {
      /**
       * @description Display name (user-friendly name for the domain)
       */
      display_name: string,
      /**
       * @description URL (actual domain address like https://example.com)
       */
      url: string
    },
    CreateOrganizationRequest: {
      name: string,
      slug?: string
    },
    Domain: {
      created_at: string,
      id: string,
      is_active: boolean,
      name: string,
      normalized_name: string,
      organization_id: string,
      updated_at: string
    },
    DomainCreateResponse: {
      data: OpenAPIComponents['schemas']['Domain'],
      monitors_created: string[]
    },
    DomainQueryParams: {
      org_id?: string
    },
    DomainResponse: {
      data: OpenAPIComponents['schemas']['Domain']
    },
    DomainStatistics: {
      avg_response_time_7d?: number,
      latest_check_time?: string,
      latest_is_up?: boolean,
      latest_response_time_ms?: number,
      latest_status_code?: number,
      ssl_days_until_expiry?: number,
      ssl_is_expired?: boolean,
      ssl_is_expiring_soon?: boolean,
      ssl_is_valid?: boolean,
      successful_checks_7d?: number,
      total_checks_7d?: number,
      uptime_7d?: (OpenAPIComponents['schemas']['rust_decimal.Decimal'])
    },
    DomainStatisticsResponse: {
      data: OpenAPIComponents['schemas']['DomainStatistics']
    },
    DomainWithStatus: {
      created_at: string,
      id: string,
      is_active: boolean,
      name: string,
      normalized_name: string,
      organization_id: string,
      ssl_days_until_expiry?: number,
      ssl_is_expired?: boolean,
      ssl_is_expiring_soon?: boolean,
      ssl_is_valid?: boolean,
      updated_at: string,
      uptime_consecutive_failures?: number,
      uptime_is_up?: boolean,
      uptime_response_time_ms?: number,
      uptime_status_code?: number,
      url: string
    },
    DomainsResponse: {
      data: OpenAPIComponents['schemas']['Domain'][]
    },
    DomainsWithStatusResponse: {
      data: OpenAPIComponents['schemas']['DomainWithStatus'][]
    },
    ErrorResponse: {
      code: string,
      details?: {},
      message: string
    },
    HistoryQuery: {
      hours?: number,
      interval_minutes?: number
    },
    LoginRequestJson: {
      email: string,
      password: string
    },
    MemberResponse: {
      data: OpenAPIComponents['schemas']['OrganizationMember']
    },
    MemberRole: string,
    MembersResponse: {
      data: OpenAPIComponents['schemas']['OrganizationMember'][]
    },
    Organization: {
      created_at: string,
      id: string,
      max_monitors: number,
      name: string,
      slug: string,
      updated_at: string,
      webhook_url?: string
    },
    OrganizationMember: {
      created_at: string,
      id: string,
      organization_id: string,
      role: OpenAPIComponents['schemas']['MemberRole'],
      user_id: string
    },
    OrganizationResponse: {
      data: OpenAPIComponents['schemas']['Organization']
    },
    OrganizationStats: {
      active_domains: number,
      avg_uptime_7d?: (OpenAPIComponents['schemas']['rust_decimal.Decimal']),
      critical_alerts_24h: number,
      online_domains: number,
      ssl_valid_domains: number,
      total_domains: number
    },
    OrganizationStatsResponse: {
      data: OpenAPIComponents['schemas']['OrganizationStats']
    },
    OrganizationWithDomains: {
      domains: OpenAPIComponents['schemas']['PublicDomainStatus'][],
      organization: OpenAPIComponents['schemas']['Organization']
    },
    OrganizationsResponse: {
      data: OpenAPIComponents['schemas']['Organization'][]
    },
    PublicDomainStatus: {
      id: string,
      is_active: boolean,
      is_up?: boolean,
      last_check_time?: string,
      name: string,
      response_time_ms?: number,
      uptime_30d?: (OpenAPIComponents['schemas']['rust_decimal.Decimal']),
      uptime_7d?: (OpenAPIComponents['schemas']['rust_decimal.Decimal']),
      url: string
    },
    PublicStatusResponse: {
      data: OpenAPIComponents['schemas']['OrganizationWithDomains']
    },
    RefreshTokenRequest: {
      refresh_token: string
    },
    RegisterRequestJson: {
      email: string,
      full_name?: string,
      password: string
    },
    SslStatusResponse: {
      chain_is_valid: boolean,
      check_time: string,
      days_until_expiry?: number,
      domain_id: string,
      hostname_matches: boolean,
      id: string,
      is_expired: boolean,
      is_expiring_soon: boolean,
      is_valid: boolean,
      issuer?: string,
      sans: string[],
      subject?: string,
      valid_from?: string,
      valid_until?: string
    },
    UpdateDomainRequest: {
      is_active?: boolean
    },
    UpdateMemberRoleRequest: {
      role: OpenAPIComponents['schemas']['MemberRole']
    },
    UpdateOrganizationRequest: {
      name?: string,
      webhook_url?: string
    },
    UptimeStatusResponse: {
      check_time: string,
      consecutive_failures: number,
      domain_id: string,
      error_type?: string,
      id: string,
      is_up: boolean,
      response_time_ms?: number,
      status_code?: number
    },
    UserResponse: {
      created_at: string,
      email: string,
      full_name?: string,
      id: string,
      last_login_at?: string
    }
  },
  responses: never,
  // parameters: {},
  // headers: {},
  requestBodies: never
}
export type OpenAPIs = {
  post: {
    /**
     * Login
     */
    '/api/auth/login': {
      query: never,
      params: never,
      headers: never,
      body: OpenAPIComponents['schemas']['LoginRequestJson'],
      response: OpenAPIComponents['schemas']['AuthResponse']
    },
    /**
     * Refresh access token
     */
    '/api/auth/refresh': {
      query: never,
      params: never,
      headers: never,
      body: OpenAPIComponents['schemas']['RefreshTokenRequest'],
      response: OpenAPIComponents['schemas']['AuthResponse']
    },
    /**
     * Register a new user
     */
    '/api/auth/register': {
      query: never,
      params: never,
      headers: never,
      body: OpenAPIComponents['schemas']['RegisterRequestJson'],
      response: OpenAPIComponents['schemas']['AuthResponse']
    },
    /**
     * Create a new domain
     */
    '/api/domains': {
      query: {
        org_id?: string
      },
      params: never,
      headers: never,
      body: OpenAPIComponents['schemas']['CreateDomainRequest'],
      response: any
    },
    /**
     * POST /api/domains/{id}/monitoring/check
     * @description Manually trigger a monitoring check
     */
    '/api/domains/{id}/monitoring/check': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * Create a new organization
     */
    '/api/organizations': {
      query: never,
      params: never,
      headers: never,
      body: OpenAPIComponents['schemas']['CreateOrganizationRequest'],
      response: any
    },
    /**
     * Add member to organization
     */
    '/api/organizations/{id}/members': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: OpenAPIComponents['schemas']['AddMemberRequest'],
      response: any
    }
  },
  get: {
    /**
     * List domains for an organization
     */
    '/api/domains': {
      query: {
        org_id?: string
      },
      params: never,
      headers: never,
      body: never,
      response: OpenAPIComponents['schemas']['DomainsWithStatusResponse']
    },
    /**
     * Get domain by ID
     */
    '/api/domains/{id}': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * GET /api/domains/{id}/monitoring/ssl/latest
     * @description Get the latest SSL certificate status for a domain
     */
    '/api/domains/{id}/monitoring/ssl/latest': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: OpenAPIComponents['schemas']['SslStatusResponse']
    },
    /**
     * GET /api/domains/{id}/monitoring/uptime/aggregate
     * @description Get aggregated uptime statistics
     */
    '/api/domains/{id}/monitoring/uptime/aggregate': {
      query: {
        period?: string
      },
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * GET /api/domains/{id}/monitoring/uptime/history
     * @description Get historical uptime data with time bucketing
     */
    '/api/domains/{id}/monitoring/uptime/history': {
      query: {
        hours?: number,
        interval_minutes?: number
      },
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * GET /api/domains/{id}/monitoring/uptime/latest
     * @description Get the latest uptime status for a domain
     */
    '/api/domains/{id}/monitoring/uptime/latest': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: OpenAPIComponents['schemas']['UptimeStatusResponse']
    },
    /**
     * Get domain statistics (comprehensive monitoring data)
     */
    '/api/domains/{id}/statistics': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: OpenAPIComponents['schemas']['DomainStatisticsResponse']
    },
    /**
     * List user's organizations
     */
    '/api/organizations': {
      query: never,
      params: never,
      headers: never,
      body: never,
      response: any
    },
    /**
     * Get organization by ID
     */
    '/api/organizations/{id}': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * List organization alerts
     */
    '/api/organizations/{id}/alerts': {
      query: {
        limit?: number
      },
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: OpenAPIComponents['schemas']['AlertsResponse']
    },
    /**
     * List organization members
     */
    '/api/organizations/{id}/members': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * Get organization statistics
     */
    '/api/organizations/{id}/stats': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: OpenAPIComponents['schemas']['OrganizationStatsResponse']
    },
    /**
     * Get public monitoring status page by organization slug
     * @description This endpoint is publicly accessible without authentication
     */
    '/api/public/status/{org_slug}': {
      query: never,
      params: {
        org_slug: string
      },
      headers: never,
      body: never,
      response: OpenAPIComponents['schemas']['PublicStatusResponse']
    },
    /**
     * Health check endpoint
     */
    '/health': {
      query: never,
      params: never,
      headers: never,
      body: never,
      response: any
    }
  },
  put: {
    /**
     * Update domain
     */
    '/api/domains/{id}': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: OpenAPIComponents['schemas']['UpdateDomainRequest'],
      response: any
    },
    /**
     * Update organization
     */
    '/api/organizations/{id}': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: OpenAPIComponents['schemas']['UpdateOrganizationRequest'],
      response: any
    },
    /**
     * Update member role
     */
    '/api/organizations/{id}/members/{user_id}/role': {
      query: never,
      params: {
        id: string,
        user_id: string
      },
      headers: never,
      body: OpenAPIComponents['schemas']['UpdateMemberRoleRequest'],
      response: any
    }
  },
  delete: {
    /**
     * Delete domain
     */
    '/api/domains/{id}': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * Delete organization
     */
    '/api/organizations/{id}': {
      query: never,
      params: {
        id: string
      },
      headers: never,
      body: never,
      response: any
    },
    /**
     * Remove member from organization
     */
    '/api/organizations/{id}/members/{user_id}': {
      query: never,
      params: {
        id: string,
        user_id: string
      },
      headers: never,
      body: never,
      response: any
    }
  }
}