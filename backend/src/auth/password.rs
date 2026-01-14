use bcrypt::{hash, verify, DEFAULT_COST};
use crate::error::{AppError, AppResult};

/// Hash a password using bcrypt
///
/// # Errors
///
/// Returns an error if hashing fails
pub fn hash_password(password: &str, rounds: u32) -> AppResult<String> {
    let cost = if rounds == 0 {
        DEFAULT_COST
    } else {
        rounds
    };

    hash(password, cost).map_err(|e| AppError::internal(format!("Failed to hash password: {}", e)))
}

/// Verify a password against a hash
///
/// # Errors
///
/// Returns an error if verification fails
pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    verify(password, hash).map_err(|e| AppError::internal(format!("Failed to verify password: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let password = "test_password_123";
        let hash = hash_password(password, 12).expect("Failed to hash password");

        assert!(verify_password(password, &hash).expect("Failed to verify password"));
        assert!(!verify_password("wrong_password", &hash).expect("Failed to verify password"));
    }
}
