use crate::error::SettlementError;
use soroban_sdk::Env;

/// Nominal ledger close interval in seconds.
///
/// Used only to project a *ledger sequence* from a duration in seconds. Real close
/// times vary on mainnet, which is exactly why the projection is paired with a
/// tolerance in ledgers rather than trusted on its own.
pub const EXPECTED_LEDGER_CLOSE_SECONDS: u64 = 5;

/// Get current timestamp from the environment
pub fn current_timestamp(env: &Env) -> u64 {
    env.ledger().timestamp()
}

/// Get the current ledger sequence number
pub fn current_ledger(env: &Env) -> u32 {
    env.ledger().sequence()
}

/// Seconds elapsed since a reference timestamp.
///
/// Saturates at 0 instead of erroring, so a ledger timestamp that moves backwards
/// (or a reference stamped by a later ledger) reads as "no time has passed" rather
/// than underflowing or aborting a settlement.
pub fn elapsed_since(reference: u64, env: &Env) -> u64 {
    current_timestamp(env).saturating_sub(reference)
}

/// Add a grace period to a deadline, rejecting configurations that would wrap.
pub fn deadline_with_grace(expires_at: u64, grace_period: u64) -> Result<u64, SettlementError> {
    expires_at
        .checked_add(grace_period)
        .ok_or(SettlementError::Overflow)
}

/// Whether the current ledger timestamp is past `expires_at` plus its grace period.
///
/// The grace period absorbs the delay between transaction submission and ledger
/// inclusion, so a swap submitted just inside its deadline is not falsely expired.
pub fn is_expired_with_grace(
    expires_at: u64,
    grace_period: u64,
    env: &Env,
) -> Result<bool, SettlementError> {
    Ok(current_timestamp(env) > deadline_with_grace(expires_at, grace_period)?)
}

/// How far past the effective deadline the current ledger is; 0 when not expired.
pub fn overdue_by(expires_at: u64, grace_period: u64, env: &Env) -> u64 {
    let deadline = expires_at.saturating_add(grace_period);
    current_timestamp(env).saturating_sub(deadline)
}

/// Convert a duration in seconds into an approximate number of ledgers.
pub fn ledgers_for_duration(duration_seconds: u64) -> u32 {
    let ledgers = duration_seconds / EXPECTED_LEDGER_CLOSE_SECONDS;
    if ledgers > u32::MAX as u64 {
        u32::MAX
    } else {
        ledgers as u32
    }
}

/// Project the ledger sequence at which a duration started at `created_ledger` ends.
pub fn projected_expiry_ledger(created_ledger: u32, duration_seconds: u64) -> u32 {
    created_ledger.saturating_add(ledgers_for_duration(duration_seconds))
}

/// Ledgers closed since a reference sequence; saturates at 0.
pub fn ledgers_elapsed(reference_ledger: u32, env: &Env) -> u32 {
    current_ledger(env).saturating_sub(reference_ledger)
}

/// Whether enough ledgers have closed past a projected expiry ledger.
///
/// Requiring `tolerance_blocks` consecutive ledgers past the projection means an
/// expiry cannot be claimed on the strength of one ledger's timestamp alone.
pub fn has_ledger_tolerance_passed(expiry_ledger: u32, tolerance_blocks: u32, env: &Env) -> bool {
    current_ledger(env) >= expiry_ledger.saturating_add(tolerance_blocks)
}

/// Validate a caller-supplied duration against a configured maximum.
pub fn validate_duration(duration_seconds: u64, max_duration: u64) -> Result<(), SettlementError> {
    if duration_seconds == 0 || duration_seconds > max_duration {
        return Err(SettlementError::InvalidSwapDuration);
    }
    Ok(())
}

/// Check if a timestamp has expired
pub fn is_expired(timestamp: u64, env: &Env) -> bool {
    current_timestamp(env) >= timestamp
}

/// Check if a timestamp is in the future
pub fn is_future(timestamp: u64, env: &Env) -> bool {
    timestamp > current_timestamp(env)
}

/// Calculate time difference in seconds
pub fn time_diff_seconds(future: u64, past: u64) -> Result<u64, SettlementError> {
    if future < past {
        return Err(SettlementError::InvalidAmount);
    }
    Ok(future - past)
}

/// Check if current time is within a time window
pub fn is_within_time_window(start: u64, end: u64, env: &Env) -> bool {
    let now = current_timestamp(env);
    now >= start && now <= end
}

/// Calculate expiration timestamp from duration
pub fn calculate_expiration(
    start_time: u64,
    duration_seconds: u64,
) -> Result<u64, SettlementError> {
    start_time
        .checked_add(duration_seconds)
        .ok_or(SettlementError::Overflow)
}

/// Extend a deadline by additional seconds
pub fn extend_deadline(
    current_deadline: u64,
    extension_seconds: u64,
) -> Result<u64, SettlementError> {
    current_deadline
        .checked_add(extension_seconds)
        .ok_or(SettlementError::Overflow)
}

/// Check if enough time has passed since a reference timestamp
pub fn has_time_elapsed(reference: u64, required_seconds: u64, env: &Env) -> bool {
    let elapsed = time_diff_seconds(current_timestamp(env), reference).unwrap_or(0);
    elapsed >= required_seconds
}

/// Calculate remaining time until expiration; 0 once the deadline has passed.
pub fn remaining_time(expires_at: u64, env: &Env) -> u64 {
    let now = current_timestamp(env);
    expires_at.saturating_sub(now)
}

/// Remaining time until expiration including the grace period; 0 once past it.
pub fn remaining_time_with_grace(expires_at: u64, grace_period: u64, env: &Env) -> u64 {
    expires_at
        .saturating_add(grace_period)
        .saturating_sub(current_timestamp(env))
}

/// Validate auction timing parameters
pub fn validate_auction_timing(
    start_time: u64,
    end_time: u64,
    extension_window: u64,
    env: &Env,
) -> Result<(), SettlementError> {
    let now = current_timestamp(env);

    // Start time must be in the future or now
    if start_time < now {
        return Err(SettlementError::InvalidAmount);
    }

    // End time must be after start time
    if end_time <= start_time {
        return Err(SettlementError::InvalidAmount);
    }

    // Extension window should be reasonable (not too long)
    if extension_window > 86400 * 7 {
        // Max 7 days extension
        return Err(SettlementError::InvalidAmount);
    }

    Ok(())
}

/// Validate transaction timing parameters
pub fn validate_transaction_timing(
    created_at: u64,
    expires_at: u64,
    max_duration: u64,
    env: &Env,
) -> Result<(), SettlementError> {
    let now = current_timestamp(env);

    // Creation time should be now or in the past
    if created_at > now {
        return Err(SettlementError::InvalidAmount);
    }

    // Expiration should be in the future
    if expires_at <= now {
        return Err(SettlementError::Expired);
    }

    // Duration should not exceed maximum
    let duration = time_diff_seconds(expires_at, created_at)?;
    if duration > max_duration {
        return Err(SettlementError::InvalidAmount);
    }

    Ok(())
}

/// Check if auction should be extended due to last-minute bidding
pub fn should_extend_auction(
    end_time: u64,
    last_bid_time: u64,
    extension_window: u64,
    env: &Env,
) -> bool {
    let now = current_timestamp(env);
    let time_since_last_bid = now.saturating_sub(last_bid_time);

    // If bid was placed within extension window of end time, extend
    if end_time > now {
        let time_to_end = end_time.saturating_sub(now);
        time_to_end <= extension_window
    } else {
        // Auction already ended, check if last bid was very recent
        time_since_last_bid <= extension_window
    }
}

/// Calculate new end time with extension
pub fn calculate_extended_end_time(current_end_time: u64, extension_window: u64, env: &Env) -> u64 {
    let now = current_timestamp(env);
    let proposed_end = now.saturating_add(extension_window);

    // Don't shorten the auction, only extend it
    if proposed_end > current_end_time {
        proposed_end
    } else {
        current_end_time
    }
}
