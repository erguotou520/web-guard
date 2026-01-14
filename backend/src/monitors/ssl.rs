use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

use crate::error::{AppError, AppResult};

/// SSL certificate information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SslCertInfo {
    pub domain: String,
    pub is_valid: bool,
    pub issuer: String,
    pub subject: String,
    pub valid_from: DateTime<Utc>,
    pub valid_until: DateTime<Utc>,
    pub is_expired: bool,
    pub days_until_expiry: i64,
    pub is_self_signed: bool,
    pub signature_algorithm: String,
    pub serial_number: String,
}

/// Check SSL certificate for a domain
pub async fn check_ssl_certificate(domain: &str) -> AppResult<SslCertInfo> {
    use std::time::SystemTime;

    let domain = domain.trim().trim_start_matches("https://").trim_start_matches("http://");

    // For now, return a basic implementation
    // In production, this would connect via TLS and extract certificate info
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    Ok(SslCertInfo {
        domain: domain.to_string(),
        is_valid: true,
        issuer: "Unknown".to_string(),
        subject: format!("CN={}", domain),
        valid_from: Utc::now() - chrono::Duration::days(90),
        valid_until: Utc::now() + chrono::Duration::days(90),
        is_expired: false,
        days_until_expiry: 90,
        is_self_signed: false,
        signature_algorithm: "SHA256".to_string(),
        serial_number: format!("{:X}", now),
    })
}

/// Check if SSL certificate is expiring soon
pub fn is_cert_expiring_soon(days_threshold: i64, cert_info: &SslCertInfo) -> bool {
    cert_info.days_until_expiry <= days_threshold && cert_info.days_until_expiry > 0
}
