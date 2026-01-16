use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio_rustls::{TlsConnector, rustls::{ClientConfig, RootCertStore}};
use x509_parser::prelude::*;

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
    // Install default crypto provider (ring) for rustls 0.23
    let _ = rustls::crypto::ring::default_provider().install_default();

    let domain = domain.trim().trim_start_matches("https://").trim_start_matches("http://").trim_end_matches('/');

    // Extract hostname and port
    let (host, port) = if let Some(pos) = domain.find(':') {
        let (h, p) = domain.split_at(pos);
        (h, p[1..].parse::<u16>().unwrap_or(443))
    } else {
        (domain, 443)
    };

    tracing::debug!("Checking SSL certificate for {}:{}", host, port);

    // Create TLS configuration with system root certificates
    let mut root_store = RootCertStore::empty();
    root_store.extend(
        webpki_roots::TLS_SERVER_ROOTS
            .iter()
            .map(|ta| ta.to_owned())
    );

    let config = ClientConfig::builder()
        .with_root_certificates(root_store)
        .with_no_client_auth();

    let connector = TlsConnector::from(Arc::new(config));

    // Connect to the server
    let addr = format!("{}:{}", host, port);
    let stream = TcpStream::connect(&addr).await.map_err(|e| {
        tracing::warn!("Failed to connect to {}: {}", addr, e);
        AppError::external(format!("Failed to connect to {}: {}", addr, e))
    })?;

    // Perform TLS handshake
    let server_name = rustls::pki_types::ServerName::try_from(host.to_string())
        .map_err(|e| AppError::external(format!("Invalid domain name: {}", e)))?;

    let tls_stream = connector.connect(server_name, stream).await.map_err(|e| {
        tracing::warn!("TLS handshake failed for {}: {}", host, e);
        AppError::external(format!("TLS handshake failed: {}", e))
    })?;

    // Extract peer certificates
    let (_, session) = tls_stream.into_inner();
    let peer_certs = session.peer_certificates().ok_or_else(|| {
        AppError::external("No peer certificates found".to_string())
    })?;

    if peer_certs.is_empty() {
        return Err(AppError::external("No certificates in chain".to_string()));
    }

    // Parse the first certificate (leaf certificate)
    let cert_der = &peer_certs[0];
    let (_, cert) = X509Certificate::from_der(cert_der.as_ref()).map_err(|e| {
        AppError::external(format!("Failed to parse certificate: {}", e))
    })?;

    // Extract certificate information
    let issuer = cert.issuer().to_string();
    let subject = cert.subject().to_string();
    let serial_number = cert.serial.to_str_radix(16);
    let signature_algorithm = cert.signature_algorithm.algorithm.to_id_string();

    // Extract validity period
    let valid_from = cert.validity().not_before.timestamp();
    let valid_until = cert.validity().not_after.timestamp();

    let valid_from_dt = DateTime::from_timestamp(valid_from, 0)
        .ok_or_else(|| AppError::external("Invalid valid_from timestamp".to_string()))?;
    let valid_until_dt = DateTime::from_timestamp(valid_until, 0)
        .ok_or_else(|| AppError::external("Invalid valid_until timestamp".to_string()))?;

    let now = Utc::now();
    let is_expired = now > valid_until_dt;
    let days_until_expiry = (valid_until_dt - now).num_days();

    // Check if self-signed (issuer == subject)
    let is_self_signed = cert.issuer() == cert.subject();

    // Determine if certificate is valid
    let is_valid = !is_expired && !is_self_signed;

    Ok(SslCertInfo {
        domain: domain.to_string(),
        is_valid,
        issuer,
        subject,
        valid_from: valid_from_dt,
        valid_until: valid_until_dt,
        is_expired,
        days_until_expiry,
        is_self_signed,
        signature_algorithm,
        serial_number,
    })
}

/// Check if SSL certificate is expiring soon
pub fn is_cert_expiring_soon(days_threshold: i64, cert_info: &SslCertInfo) -> bool {
    cert_info.days_until_expiry <= days_threshold && cert_info.days_until_expiry > 0
}
