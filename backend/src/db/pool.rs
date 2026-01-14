use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;
use crate::config::Config;
use crate::error::{AppError, AppResult};

/// Create a new database connection pool
///
/// # Errors
///
/// Returns an error if the pool cannot be created or connected to
pub async fn create_pool(config: &Config) -> AppResult<PgPool> {
    let max_connections = config.database.max_connections;
    let min_connections = config.database.min_connections;

    tracing::info!(
        database_url = %config.database.url,
        max_connections = max_connections,
        min_connections = min_connections,
        "Creating database connection pool"
    );

    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .min_connections(min_connections)
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect(&config.database.url)
        .await
        .map_err(|e| {
            AppError::internal(format!("Failed to create database pool: {}", e))
        })?;

    // Verify connection
    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| {
            AppError::internal(format!("Failed to verify database connection: {}", e))
        })?;

    tracing::info!("Database connection pool created successfully");

    Ok(pool)
}

/// Run database migrations
///
/// # Errors
///
/// Returns an error if migrations cannot be applied
pub async fn run_migrations(pool: &PgPool) -> AppResult<()> {
    tracing::info!("Running database migrations");

    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|e| {
            AppError::internal(format!("Failed to run migrations: {}", e))
        })?;

    tracing::info!("Database migrations completed successfully");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_config() {
        // Test configuration parsing
        let config = Config::from_env().expect("Failed to load config");
        assert!(!config.database.url.is_empty());
        assert!(config.database.max_connections > 0);
    }
}
