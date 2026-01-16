export type OpenAPIComponents = {
  schemas: {
    AddMemberRequest: {
      email: string,
      role: OpenAPIComponents['schemas']['MemberRole']
    },
    AggregateQuery: {
      period?: string
    },
    AuthResponse: {
      access_token: string,
      refresh_token: string,
      user: OpenAPIComponents['schemas']['UserResponse']
    },
    CreateDomainRequest: {
      name: string
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
    DomainQueryParams: {
      org_id?: string
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
    MemberRole: string,
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
      response: any
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