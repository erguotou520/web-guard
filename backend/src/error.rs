use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use serde_json::json;
use std::fmt;
use thiserror::Error;

/// Application error type
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Authorization error: {0}")]
    Authorization(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Task error: {0}")]
    Task(String),

    #[error("Monitoring error: {0}")]
    Monitoring(String),

    #[error("External service error: {0}")]
    External(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Internal server error: {0}")]
    Internal(String),
}

/// Type alias for Result with AppError
pub type AppResult<T> = Result<T, AppError>;

/// Error detail structure for API responses
#[derive(Debug)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
    pub details: Option<std::collections::HashMap<String, String>>,
}

impl fmt::Display for ErrorDetail {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_detail) = self.to_error_detail();

        let body = json!({
            "error": {
                "code": error_detail.code,
                "message": error_detail.message,
                "details": error_detail.details,
            }
        });

        (status, Json(body)).into_response()
    }
}

impl AppError {
    /// Convert AppError to ErrorDetail and StatusCode
    fn to_error_detail(self) -> (StatusCode, ErrorDetail) {
        match self {
            AppError::Database(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorDetail {
                    code: "DATABASE_ERROR".to_string(),
                    message: "A database error occurred".to_string(),
                    details: Some({
                        let mut map = std::collections::HashMap::new();
                        map.insert("error".to_string(), e.to_string());
                        map
                    }),
                },
            ),
            AppError::Auth(msg) => (
                StatusCode::UNAUTHORIZED,
                ErrorDetail {
                    code: "AUTHENTICATION_ERROR".to_string(),
                    message: msg,
                    details: None,
                },
            ),
            AppError::Authorization(msg) => (
                StatusCode::FORBIDDEN,
                ErrorDetail {
                    code: "AUTHORIZATION_ERROR".to_string(),
                    message: msg,
                    details: None,
                },
            ),
            AppError::Validation(msg) => (
                StatusCode::BAD_REQUEST,
                ErrorDetail {
                    code: "VALIDATION_ERROR".to_string(),
                    message: msg,
                    details: None,
                },
            ),
            AppError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                ErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: msg,
                    details: None,
                },
            ),
            AppError::Task(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorDetail {
                    code: "TASK_ERROR".to_string(),
                    message: msg,
                    details: None,
                },
            ),
            AppError::Monitoring(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorDetail {
                    code: "MONITORING_ERROR".to_string(),
                    message: msg,
                    details: None,
                },
            ),
            AppError::External(msg) => (
                StatusCode::SERVICE_UNAVAILABLE,
                ErrorDetail {
                    code: "EXTERNAL_SERVICE_ERROR".to_string(),
                    message: msg,
                    details: None,
                },
            ),
            AppError::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorDetail {
                    code: "INTERNAL_ERROR".to_string(),
                    message: "An internal error occurred".to_string(),
                    details: Some({
                        let mut map = std::collections::HashMap::new();
                        map.insert("error".to_string(), msg);
                        map
                    }),
                },
            ),
        }
    }

    /// Create a validation error
    #[must_use]
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    /// Create an authentication error
    #[must_use]
    pub fn auth(msg: impl Into<String>) -> Self {
        Self::Auth(msg.into())
    }

    /// Create an authorization error
    #[must_use]
    pub fn authorization(msg: impl Into<String>) -> Self {
        Self::Authorization(msg.into())
    }

    /// Create a not found error
    #[must_use]
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    /// Create a task error
    #[must_use]
    pub fn task(msg: impl Into<String>) -> Self {
        Self::Task(msg.into())
    }

    /// Create a monitoring error
    #[must_use]
    pub fn monitoring(msg: impl Into<String>) -> Self {
        Self::Monitoring(msg.into())
    }

    /// Create an external service error
    #[must_use]
    pub fn external(msg: impl Into<String>) -> Self {
        Self::External(msg.into())
    }

    /// Create an internal error
    #[must_use]
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

/// Helper to convert validator errors to AppError
impl From<validator::ValidationErrors> for AppError {
    fn from(errors: validator::ValidationErrors) -> Self {
        let details = errors
            .field_errors()
            .into_iter()
            .flat_map(|(field, errors)| {
                errors.iter().map(move |e| {
                    (
                        field.clone(),
                        e.message.as_ref().map(|m| m.to_string()).unwrap_or_else(|| {
                            "validation failed".to_string()
                        }),
                    )
                })
            })
            .collect::<std::collections::HashMap<_, _>>();

        let message = if details.is_empty() {
            "Validation failed".to_string()
        } else {
            details
                .values()
                .next()
                .cloned()
                .unwrap_or_else(|| "Validation failed".to_string())
        };

        Self::Validation(message)
    }
}

/// Convert JSON errors to AppError
impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        Self::Internal(format!("JSON error: {}", err))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = AppError::validation("Invalid input");
        assert_eq!(err.to_string(), "Validation error: Invalid input");
    }

    #[test]
    fn test_error_helpers() {
        let err = AppError::auth("Invalid token");
        assert!(matches!(err, AppError::Auth(_)));

        let err = AppError::not_found("User not found");
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
