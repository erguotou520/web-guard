use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Application configuration loaded from environment variables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database: DatabaseConfig,
    pub server: ServerConfig,
    pub auth: AuthConfig,
    pub scheduler: SchedulerConfig,
    pub workers: WorkerConfig,
    pub monitoring: MonitoringConfig,
    pub http: HttpConfig,
    pub telemetry: TelemetryConfig,
    pub webhook: WebhookConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub frontend_dist_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    #[serde(with = "duration_serde")]
    pub access_token_duration: Duration,
    #[serde(with = "duration_serde")]
    pub refresh_token_duration: Duration,
    pub bcrypt_rounds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulerConfig {
    #[serde(with = "duration_serde")]
    pub poll_interval: Duration,
    pub max_tasks_per_poll: usize,
    #[serde(with = "duration_serde")]
    pub graceful_shutdown_timeout: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerConfig {
    pub pool_size: usize,
    #[serde(with = "duration_serde")]
    pub task_timeout: Duration,
    pub max_retries: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    /// How often to poll for new monitoring tasks (in seconds)
    #[serde(with = "duration_serde")]
    pub poll_interval: Duration,
    /// Maximum number of concurrent checks
    pub max_concurrent_checks: u32,
    /// Threshold for slow response time (in milliseconds)
    pub slow_threshold_ms: u64,
    /// Available frequency presets in seconds
    pub uptime_frequency_presets: Vec<u64>,
    /// Available frequency presets in minutes
    pub dns_frequency_presets: Vec<u64>,
    pub ssl_frequency_presets: Vec<u64>,
    pub security_frequency_presets: Vec<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpConfig {
    #[serde(with = "duration_serde")]
    pub timeout: Duration,
    pub max_redirects: u32,
    pub user_agent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryConfig {
    pub rust_log: String,
    pub enable_tracing: bool,
    pub enable_metrics: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    #[serde(with = "duration_serde")]
    pub timeout: Duration,
    pub retry_attempts: u32,
}

/// Duration serialization helper
mod duration_serde {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::time::Duration;

    pub fn serialize<S>(duration: &Duration, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_u64(duration.as_secs())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Duration, D::Error>
    where
        D: Deserializer<'de>,
    {
        let secs = u64::deserialize(deserializer)?;
        Ok(Duration::from_secs(secs))
    }
}

impl Config {
    /// Load configuration from environment variables
    ///
    /// # Errors
    ///
    /// Returns an error if required environment variables are missing or invalid
    pub fn from_env() -> Result<Self, config::ConfigError> {
        dotenvy::dotenv().ok();

        let mut cfg = config::Config::builder();

        // Database
        cfg = cfg
            .set_default("database.url", "postgresql://localhost:5432/webguard")?
            .set_default("database.max_connections", 20)?
            .set_default("database.min_connections", 5)?;

        // Server
        cfg = cfg
            .set_default("server.host", "0.0.0.0")?
            .set_default("server.port", 9001)?
            .set_default("server.frontend_dist_path", "../frontend/dist")?;

        // Auth
        cfg = cfg
            .set_default("auth.jwt_secret", "change-this-secret-in-production")?
            .set_default("auth.access_token_duration", 900)?  // 15 minutes
            .set_default("auth.refresh_token_duration", 604800)?  // 7 days
            .set_default("auth.bcrypt_rounds", 12)?;

        // Scheduler
        cfg = cfg
            .set_default("scheduler.poll_interval", 60)?
            .set_default("scheduler.max_tasks_per_poll", 100)?
            .set_default("scheduler.graceful_shutdown_timeout", 30)?;

        // Workers
        cfg = cfg
            .set_default("workers.pool_size", 10)?
            .set_default("workers.task_timeout", 300)?
            .set_default("workers.max_retries", 3)?;

        // Monitoring
        cfg = cfg
            .set_default("monitoring.poll_interval", 60)?  // Check every minute
            .set_default("monitoring.max_concurrent_checks", 50)?
            .set_default("monitoring.slow_threshold_ms", 3000)?  // 3 seconds
            .set_default("monitoring.uptime_frequency_presets", vec![60, 300, 600, 1800])?  // 1min, 5min, 10min, 30min
            .set_default("monitoring.dns_frequency_presets", vec![60, 360, 720, 1440])?  // 1h, 6h, 12h, 24h (in minutes)
            .set_default("monitoring.ssl_frequency_presets", vec![30, 60, 120, 360])?  // 30min, 1h, 2h, 6h (in minutes)
            .set_default("monitoring.security_frequency_presets", vec![30, 60, 120, 360])?;

        // HTTP
        cfg = cfg
            .set_default("http.timeout", 10)?
            .set_default("http.max_redirects", 3)?
            .set_default("http.user_agent", "WebGuard/1.0 (+https://webguard.io)")?;

        // Telemetry
        cfg = cfg
            .set_default("telemetry.rust_log", "info,web_guard=debug")?
            .set_default("telemetry.enable_tracing", true)?
            .set_default("telemetry.enable_metrics", true)?;

        // Webhook
        cfg = cfg
            .set_default("webhook.timeout", 5)?
            .set_default("webhook.retry_attempts", 3)?;

        // Override with environment variables
        cfg = cfg.add_source(
            config::Environment::default()
                .prefix("WEBGUARD")
                .prefix_separator("__")
                .try_parsing(true)
                .list_separator(","),
        );

        cfg.build()?.try_deserialize()
    }

    /// Get the database URL
    #[must_use]
    pub fn database_url(&self) -> &str {
        &self.database.url
    }

    /// Get the server bind address
    #[must_use]
    pub fn server_address(&self) -> String {
        format!("{}:{}", self.server.host, self.server.port)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_from_env() {
        // Set required environment variables for testing
        std::env::set_var("WEBGUARD_DATABASE__URL", "postgresql://localhost/test");
        std::env::set_var("WEBGUARD_AUTH__JWT_SECRET", "test-secret");

        let config = Config::from_env().expect("Failed to load config");

        assert_eq!(config.database.url, "postgresql://localhost/test");
        assert_eq!(config.auth.jwt_secret, "test-secret");
        assert_eq!(config.server.port, 9001);
        assert_eq!(config.workers.pool_size, 10);
    }
}
