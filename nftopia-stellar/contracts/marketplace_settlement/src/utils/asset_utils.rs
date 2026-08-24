use crate::error::SettlementError;
use crate::storage::allowlist_store::AllowlistStore;
use crate::types::Asset;
use soroban_sdk::{symbol_short, Address, Bytes, Env, Error, IntoVal, Symbol, Vec};

// ─── Helpers for resolving the native XLM SAC address ──────────────────────────

/// Retrieve the native XLM Stellar Asset Contract (SAC) address from storage.
/// Returns `Err(NativeAssetTransferFailed)` until an admin configures it.
fn get_native_xlm_sac(env: &Env) -> Result<Address, SettlementError> {
    env.storage()
        .instance()
        .get(&symbol_short!("xlm_sac"))
        .ok_or(SettlementError::NativeAssetTransferFailed)
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/// Create a native XLM asset representation.
///
/// Previously this panicked. It now returns `Asset::NativeXLM` safely.
pub fn native_asset() -> Asset {
    Asset::NativeXLM
}

/// Validate that an asset is supported.
///
/// Native XLM is valid once its SAC address has been configured.
/// Token assets are checked against the on-chain allowlist.
pub fn validate_asset(
    asset: &Asset,
    _supported_assets: &Vec<Asset>,
    env: &Env,
) -> Result<(), SettlementError> {
    match asset {
        Asset::NativeXLM => get_native_xlm_sac(env).map(|_| ()),
        Asset::Token(t) => {
            if !AllowlistStore::is_token_allowed(env, &t.contract) {
                return Err(SettlementError::AssetNotSupported);
            }
            Ok(())
        }
    }
}

/// Check if two assets are the same.
pub fn assets_equal(a: &Asset, b: &Asset) -> bool {
    match (a, b) {
        (Asset::NativeXLM, Asset::NativeXLM) => true,
        (Asset::Token(ta), Asset::Token(tb)) => ta.contract == tb.contract,
        _ => false,
    }
}

/// Get asset symbol for display purposes.
pub fn get_asset_symbol(asset: &Asset, env: &Env) -> Symbol {
    match asset {
        Asset::NativeXLM => Symbol::new(env, "XLM"),
        Asset::Token(t) => t.symbol.clone(),
    }
}

/// Validate payment amount for an asset.
pub fn validate_payment_amount(amount: i128, min_amount: i128) -> Result<(), SettlementError> {
    if amount <= 0 {
        return Err(SettlementError::InvalidAmount);
    }

    if amount < min_amount {
        return Err(SettlementError::InsufficientPayment);
    }

    Ok(())
}

/// Calculate asset transfer amount after fees.
pub fn calculate_transfer_amount(
    total_amount: i128,
    fee_amount: i128,
    env: &Env,
) -> Result<i128, SettlementError> {
    use crate::utils::math_utils::safe_sub;
    safe_sub(total_amount, fee_amount, env)
}

/// Check if an address is a valid token contract.
pub fn is_valid_token_contract(address: &Address, env: &Env) -> bool {
    AllowlistStore::is_token_allowed(env, address)
}

/// Get token balance for an account.
///
/// Dispatches on `Asset::NativeXLM` vs `Asset::Token` so both paths are handled.
pub fn get_token_balance(
    asset: &Asset,
    account: &Address,
    env: &Env,
) -> Result<i128, SettlementError> {
    let (contract, failure) = match asset {
        Asset::NativeXLM => (
            get_native_xlm_sac(env).map_err(|_| SettlementError::NativeAssetBalanceFailed)?,
            SettlementError::NativeAssetBalanceFailed,
        ),
        Asset::Token(t) => (t.contract.clone(), SettlementError::PaymentFailed),
    };

    match env.try_invoke_contract::<i128, Error>(
        &contract,
        &symbol_short!("balance"),
        soroban_sdk::vec![env, account.into_val(env)],
    ) {
        Ok(Ok(balance)) => Ok(balance),
        _ => Err(failure),
    }
}

/// Transfer tokens between accounts.
///
/// For `Asset::NativeXLM`, uses the configured native XLM SAC address.
/// For `Asset::Token`, uses the token's contract address.
pub fn transfer_tokens(
    asset: &Asset,
    from: &Address,
    to: &Address,
    amount: i128,
    env: &Env,
) -> Result<(), SettlementError> {
    if amount < 0 {
        return Err(SettlementError::InvalidAmount);
    }

    let (contract, failure) = match asset {
        Asset::NativeXLM => (
            get_native_xlm_sac(env)?,
            SettlementError::NativeAssetTransferFailed,
        ),
        Asset::Token(t) => (t.contract.clone(), SettlementError::PaymentFailed),
    };

    match env.try_invoke_contract::<(), Error>(
        &contract,
        &symbol_short!("transfer"),
        soroban_sdk::vec![
            env,
            from.into_val(env),
            to.into_val(env),
            amount.into_val(env)
        ],
    ) {
        Ok(Ok(())) => Ok(()),
        _ => Err(failure),
    }
}

/// Approve token spending.
pub fn approve_token_spending(
    _token_contract: &Address,
    _owner: &Address,
    _spender: &Address,
    _amount: i128,
    _env: &Env,
) -> Result<(), SettlementError> {
    Ok(())
}

/// Check token allowance.
pub fn check_token_allowance(
    _token_contract: &Address,
    _owner: &Address,
    _spender: &Address,
    _env: &Env,
) -> Result<i128, SettlementError> {
    Ok(0) // Placeholder
}

/// Get token decimals.
///
/// Native XLM has 7 decimal places (same as the default for Stellar assets).
pub fn get_token_decimals(asset: &Asset, env: &Env) -> Result<u32, SettlementError> {
    match asset {
        Asset::NativeXLM => Ok(7),
        Asset::Token(t) => match env.try_invoke_contract::<u32, Error>(
            &t.contract,
            &symbol_short!("decimals"),
            Vec::new(env),
        ) {
            Ok(Ok(decimals)) => Ok(decimals),
            _ => Err(SettlementError::PaymentFailed),
        },
    }
}

/// Format amount with proper decimals.
pub fn format_amount_with_decimals(_amount: i128, _decimals: u64) -> Bytes {
    Bytes::new(&Env::default()) // Placeholder
}

/// Validate that an NFT contract supports the required interface.
pub fn validate_nft_contract(nft_contract: &Address, env: &Env) -> Result<(), SettlementError> {
    if !AllowlistStore::is_nft_allowed(env, nft_contract) {
        return Err(SettlementError::InvalidState);
    }
    Ok(())
}

/// Check NFT ownership.
pub fn check_nft_ownership(
    nft_contract: &Address,
    token_id: u64,
    owner: &Address,
    env: &Env,
) -> Result<bool, SettlementError> {
    let current_owner: Address = env.invoke_contract(
        nft_contract,
        &Symbol::new(env, "owner_of"),
        soroban_sdk::vec![env, token_id.into_val(env)],
    );
    Ok(current_owner == *owner)
}

/// Transfer NFT.
pub fn transfer_nft(
    nft_contract: &Address,
    from: &Address,
    to: &Address,
    token_id: u64,
    env: &Env,
) -> Result<(), SettlementError> {
    env.invoke_contract::<()>(
        nft_contract,
        &Symbol::new(env, "transfer"),
        soroban_sdk::vec![
            env,
            env.current_contract_address().into_val(env),
            from.into_val(env),
            to.into_val(env),
            token_id.into_val(env),
        ],
    );
    Ok(())
}

/// Get NFT metadata URI.
pub fn get_nft_metadata_uri(
    _nft_contract: &Address,
    _token_id: u64,
    env: &Env,
) -> Result<Bytes, SettlementError> {
    Ok(Bytes::new(env)) // Placeholder
}
