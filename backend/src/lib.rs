//! Web-Guard - Website & Domain Security Monitoring Platform
//!
//! A production-grade, multi-tenant security monitoring platform.

pub mod api;
pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod monitors;

pub use auth::JwtService;
pub use config::Config;
pub use error::{AppError, AppResult};
