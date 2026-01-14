use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use std::time::{Duration, Instant};
use thiserror::Error;

use crate::error::{AppError, AppResult};

/// Uptime check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UptimeCheckResult {
    pub domain: String,
    pub url: String,
    pub is_up: bool,
    pub status_code: Option<u16>,
    pub response_time_ms: u64,
    pub error_message: Option<String>,
    pub checked_at: DateTime<Utc>,
}

/// Uptime check error
#[derive(Debug, Error)]
pub enum UptimeError {
    #[error("Request failed: {0}")]
    RequestFailed(String),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

/// Check if a domain is up and responding
pub async fn check_uptime(domain: &str, path: Option<&str>) -> AppResult<UptimeCheckResult> {
    let domain = domain.trim().trim_start_matches("https://").trim_start_matches("http://");

    let path = path.unwrap_or("/");
    let url = format!("https://{}{}", domain, path);

    let start = Instant::now();

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(3))
        .user_agent("WebGuard-Monitor/1.0")
        .build()
        .map_err(|e| AppError::internal(format!("Failed to create HTTP client: {}", e)))?;

    let response = match client.get(&url).send().await {
        Ok(resp) => resp,
        Err(e) => {
            // Try HTTP if HTTPS fails
            let http_url = format!("http://{}{}", domain, path);
            match client.get(&http_url).send().await {
                Ok(resp) => resp,
                Err(http_e) => {
                    return Ok(UptimeCheckResult {
                        domain: domain.to_string(),
                        url,
                        is_up: false,
                        status_code: None,
                        response_time_ms: start.elapsed().as_millis() as u64,
                        error_message: Some(format!("HTTPS and HTTP failed: {}", http_e)),
                        checked_at: Utc::now(),
                    });
                }
            }
        }
    };

    let response_time_ms = start.elapsed().as_millis() as u64;
    let status_code = response.status().as_u16();
    let is_up = status_code < 500; // Consider server errors as down

    Ok(UptimeCheckResult {
        domain: domain.to_string(),
        url,
        is_up,
        status_code: Some(status_code),
        response_time_ms,
        error_message: None,
        checked_at: Utc::now(),
    })
}

/// Check multiple endpoints for a domain
pub async fn check_multiple_endpoints(
    domain: &str,
    paths: &[&str],
) -> AppResult<Vec<UptimeCheckResult>> {
    let mut results = Vec::new();

    for path in paths {
        match check_uptime(domain, Some(path)).await {
            Ok(result) => results.push(result),
            Err(e) => {
                results.push(UptimeCheckResult {
                    domain: domain.to_string(),
                    url: format!("https://{}{}", domain, path),
                    is_up: false,
                    status_code: None,
                    response_time_ms: 0,
                    error_message: Some(e.to_string()),
                    checked_at: Utc::now(),
                });
            }
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_check_uptime() {
        let result = check_uptime("google.com", None).await;
        assert!(result.is_ok());
        let uptime = result.unwrap();
        assert!(uptime.is_up);
    }
}
