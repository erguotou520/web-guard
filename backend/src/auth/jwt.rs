use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use uuid::Uuid;
use chrono::{Utc, Duration as ChronoDuration};

use crate::error::{AppError, AppResult};

/// JWT claims structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Subject (user ID)
    pub sub: Uuid,
    /// Current organization ID
    pub org: Option<Uuid>,
    /// User role
    pub role: String,
    /// Issued at
    pub iat: i64,
    /// Expiration time
    pub exp: i64,
}

/// JWT service for token generation and validation
#[derive(Clone)]
pub struct JwtService {
    secret: String,
    pub access_token_duration: ChronoDuration,
    pub refresh_token_duration: ChronoDuration,
}

impl JwtService {
    /// Create a new JWT service
    ///
    /// # Panics
    ///
    /// Panics if the secret is invalid
    #[must_use]
    pub fn new(secret: &str, access_token_duration: Duration, refresh_token_duration: Duration) -> Self {
        Self {
            secret: secret.to_string(),
            access_token_duration: ChronoDuration::from_std(access_token_duration)
                .expect("Invalid access token duration"),
            refresh_token_duration: ChronoDuration::from_std(refresh_token_duration)
                .expect("Invalid refresh token duration"),
        }
    }

    /// Get the encoding key
    fn encoding_key(&self) -> EncodingKey {
        EncodingKey::from_secret(self.secret.as_bytes())
    }

    /// Get the decoding key
    fn decoding_key(&self) -> DecodingKey {
        DecodingKey::from_secret(self.secret.as_bytes())
    }

    /// Generate an access token
    ///
    /// # Errors
    ///
    /// Returns an error if token generation fails
    pub fn generate_access_token(
        &self,
        user_id: Uuid,
        org_id: Option<Uuid>,
        role: &str,
    ) -> AppResult<String> {
        let now = Utc::now();
        let exp = now + self.access_token_duration;

        let claims = Claims {
            sub: user_id,
            org: org_id,
            role: role.to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
        };

        encode(&Header::default(), &claims, &self.encoding_key())
            .map_err(|e| AppError::internal(format!("Failed to generate access token: {}", e)))
    }

    /// Generate a refresh token
    ///
    /// # Errors
    ///
    /// Returns an error if token generation fails
    pub fn generate_refresh_token(&self, user_id: Uuid) -> AppResult<String> {
        let now = Utc::now();
        let exp = now + self.refresh_token_duration;

        let claims = Claims {
            sub: user_id,
            org: None,
            role: "refresh".to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
        };

        encode(&Header::default(), &claims, &self.encoding_key())
            .map_err(|e| AppError::internal(format!("Failed to generate refresh token: {}", e)))
    }

    /// Validate and decode a token
    ///
    /// # Errors
    ///
    /// Returns an error if validation fails
    pub fn validate_token(&self, token: &str) -> AppResult<Claims> {
        decode::<Claims>(token, &self.decoding_key(), &Validation::default())
            .map(|data| data.claims)
            .map_err(|e| AppError::auth(format!("Invalid token: {}", e)))
    }

    /// Get user ID from token
    ///
    /// # Errors
    ///
    /// Returns an error if token is invalid
    pub fn get_user_id(&self, token: &str) -> AppResult<Uuid> {
        let claims = self.validate_token(token)?;
        Ok(claims.sub)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_validate_token() {
        let secret = "test_secret";
        let service = JwtService::new(
            secret,
            Duration::from_secs(900),   // 15 minutes
            Duration::from_secs(86400), // 1 day
        );

        let user_id = Uuid::new_v4();
        let token = service
            .generate_access_token(user_id, None, "user")
            .expect("Failed to generate token");

        let claims = service.validate_token(&token).expect("Failed to validate token");
        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.role, "user");
    }

    #[test]
    fn test_invalid_token() {
        let secret = "test_secret";
        let service = JwtService::new(
            secret,
            Duration::from_secs(900),
            Duration::from_secs(86400),
        );

        let result = service.validate_token("invalid_token");
        assert!(result.is_err());
    }
}
