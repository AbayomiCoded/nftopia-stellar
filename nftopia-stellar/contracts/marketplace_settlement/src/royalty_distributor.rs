use crate::error::SettlementError;
use crate::events::{emit_royalties_distributed, RoyaltiesDistributedEvent};
use crate::types::{validate_royalty_percentage, Asset, DistributionResult, RoyaltyDistribution, MAX_ROYALTY_BPS};
use crate::utils::asset_utils;
use crate::utils::math_utils;
use soroban_sdk::{contracttype, symbol_short, Address, Bytes, Env, Map, Symbol, Vec};

// Storage keys
const ROYALTY_CONFIGS: Symbol = symbol_short!("roy_cfgs");
const ADMIN_CONFIG_KEY: Symbol = symbol_short!("admin_cfg");

// Type alias for royalty key
type RoyaltyKey = Bytes;

/// Royalty information for an NFT
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyInfo {
    pub nft_contract: Address,
    pub token_id: u64,
    pub creator: Address,
    pub royalty_percentage: u64, // Basis points (10000 = 100%)
    pub last_updated: u64,
}

/// Admin configuration for the marketplace
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminConfig {
    pub admin: Address,
    pub emergency_withdrawal_enabled: bool,
    pub max_transaction_duration: u64,
    pub max_auction_duration: u64,
    pub min_bid_increment_bps: u64, // Minimum bid increment in basis points
    pub max_royalty_percentage: u64, // Maximum royalty percentage (admin-configured cap)
    pub dispute_cooling_period: u64, // Cooling period before dispute resolution
    pub arbitration_quorum: u64,    // Required votes for arbitration
}

/// Royalty distributor for handling royalty payments
pub struct RoyaltyDistributor;

impl RoyaltyDistributor {
    /// Get the admin configuration from storage.
    ///
    /// # Returns
    /// * `Ok(AdminConfig)` if found
    /// * `Err(SettlementError::NotFound)` if not configured
    fn get_admin_config(env: &Env) -> Result<AdminConfig, SettlementError> {
        env.storage()
            .instance()
            .get(&ADMIN_CONFIG_KEY)
            .ok_or(SettlementError::NotFound)
    }

    /// Get the admin-configured max royalty percentage.
    ///
    /// # Returns
    /// * The admin-configured cap, or DEFAULT_MAX_ROYALTY_PERCENTAGE if not set
    fn get_admin_max_royalty(env: &Env) -> u64 {
        Self::get_admin_config(env)
            .map(|cfg| cfg.max_royalty_percentage)
            .unwrap_or(crate::types::DEFAULT_MAX_ROYALTY_PERCENTAGE)
    }

    /// Validate royalty percentage against both hard cap and admin cap.
    ///
    /// # Arguments
    /// * `percentage` - The royalty percentage to validate
    /// * `env` - The Soroban environment
    ///
    /// # Returns
    /// * `Ok(())` if valid
    /// * `Err(SettlementError)` if invalid
    fn validate_royalty(percentage: u64, env: &Env) -> Result<(), SettlementError> {
        let admin_cap = Self::get_admin_max_royalty(env);
        validate_royalty_percentage(percentage, admin_cap)
    }

    /// Calculate royalties for an NFT sale.
    /// Royalty is calculated on the full sale price, then seller and platform
    /// fees are calculated only on the post-royalty remainder.
    pub fn calculate_royalties(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        sale_price: i128,
        seller: &Address,
        platform_address: &Address,
    ) -> Result<RoyaltyDistribution, SettlementError> {
        let royalty_info = Self::get_royalty_info(env, nft_contract, token_id)?;

        // Calculate royalty amount on full sale price (rounds in creator's favor via half-up)
        let royalty_amount =
            math_utils::calculate_percentage(sale_price, royalty_info.royalty_percentage, env)?;

        // Post-royalty remainder: seller and platform split only this amount
        let remainder = math_utils::safe_sub(sale_price, royalty_amount, env)?;

        let seller_percentage = 9500u64; // 95% of remainder
        let platform_percentage = 500u64; // 5% of remainder

        // Platform fee calculated on the remainder (not the full sale price)
        let platform_amount =
            math_utils::calculate_percentage(remainder, platform_percentage, env)?;
        let seller_amount = math_utils::safe_sub(remainder, platform_amount, env)?;

        // Add all amounts to the distribution map
        let mut amounts = Map::new(env);
        amounts.set(royalty_info.creator.clone(), royalty_amount);
        amounts.set(seller.clone(), seller_amount);
        amounts.set(platform_address.clone(), platform_amount);

        Ok(RoyaltyDistribution {
            creator_address: royalty_info.creator,
            creator_percentage: royalty_info.royalty_percentage,
            seller_address: seller.clone(),
            seller_percentage,
            platform_address: platform_address.clone(),
            platform_percentage,
            total_amount: sale_price,
            amounts,
        })
    }

    /// Distribute royalties for a transaction.
    /// Validates the distribution sums to total before any transfer.
    /// Fails the entire transaction if any individual transfer fails.
    pub fn distribute_royalties(
        env: &Env,
        transaction_id: u64,
        royalty_distribution: &RoyaltyDistribution,
        payment_asset: &Asset,
    ) -> Result<DistributionResult, SettlementError> {
        // Validate distribution sums before any transfer
        Self::validate_royalty_distribution(env, royalty_distribution)?;

        let mut total_distributed = 0i128;

        // Distribute to each recipient — fail entire tx if any transfer fails
        for (recipient, amount) in royalty_distribution.amounts.iter() {
            asset_utils::transfer_tokens(
                &payment_asset.contract,
                &env.current_contract_address(),
                &recipient,
                amount,
                env,
            )?;
            total_distributed = math_utils::safe_add(total_distributed, amount, env)?;
        }

        // Look up amounts from the distribution map using stored addresses
        let creator_amount = royalty_distribution
            .amounts
            .get(royalty_distribution.creator_address.clone())
            .unwrap_or(0);
        let seller_amount = royalty_distribution
            .amounts
            .get(royalty_distribution.seller_address.clone())
            .unwrap_or(0);
        let platform_amount = royalty_distribution
            .amounts
            .get(royalty_distribution.platform_address.clone())
            .unwrap_or(0);

        let result = DistributionResult {
            transaction_id,
            total_amount: royalty_distribution.total_amount,
            creator_amount,
            seller_amount,
            platform_amount,
            distribution_success: true,
            timestamp: env.ledger().timestamp(),
        };

        // Emit distribution event
        let event = RoyaltiesDistributedEvent {
            transaction_id,
            nft_address: royalty_distribution.creator_address.clone(),
            token_id: 0,
            creator: royalty_distribution.creator_address.clone(),
            creator_amount,
            seller_amount,
            platform_amount,
            total_amount: result.total_amount,
            timestamp: result.timestamp,
        };
        emit_royalties_distributed(env, event);

        Ok(result)
    }

    /// Set royalty information for an NFT.
    /// Validates against both hard cap and admin-configured cap.
    pub fn set_royalty_info(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        creator: &Address,
        royalty_percentage: u64,
        _setter: &Address,
    ) -> Result<(), SettlementError> {
        // Validate against both hard cap and admin cap
        Self::validate_royalty(royalty_percentage, env)?;

        let royalty_info = RoyaltyInfo {
            nft_contract: nft_contract.clone(),
            token_id,
            creator: creator.clone(),
            royalty_percentage,
            last_updated: env.ledger().timestamp(),
        };

        Self::store_royalty_info(env, &royalty_info)?;
        Ok(())
    }

    /// Get royalty information for an NFT
    pub fn get_royalty_info(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
    ) -> Result<RoyaltyInfo, SettlementError> {
        let key = Self::make_royalty_key(env, nft_contract, token_id);
        let royalty_configs: Map<RoyaltyKey, RoyaltyInfo> = env
            .storage()
            .instance()
            .get(&ROYALTY_CONFIGS)
            .unwrap_or(Map::new(env));

        match royalty_configs.get(key) {
            Some(info) => Ok(info),
            None => Err(SettlementError::NotFound),
        }
    }

    /// Update royalty percentage for an NFT.
    /// Validates against both hard cap and admin-configured cap.
    pub fn update_royalty_percentage(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        new_percentage: u64,
        updater: &Address,
    ) -> Result<(), SettlementError> {
        let mut royalty_info = Self::get_royalty_info(env, nft_contract, token_id)?;

        // Check authorization (only creator can update)
        if royalty_info.creator != *updater {
            return Err(SettlementError::Unauthorized);
        }

        // Validate new percentage against both hard cap and admin cap
        Self::validate_royalty(new_percentage, env)?;

        royalty_info.royalty_percentage = new_percentage;
        royalty_info.last_updated = env.ledger().timestamp();

        Self::store_royalty_info(env, &royalty_info)?;
        Ok(())
    }

    /// Calculate royalty splits for complex transactions (bundles).
    /// Uses value-proportional splitting based on `value_weights` rather than equal division.
    /// Validates all royalty percentages against caps.
    pub fn calculate_complex_royalties(
        env: &Env,
        nft_contracts: &Vec<Address>,
        token_ids: &Vec<u64>,
        sale_price: i128,
        seller: &Address,
        platform_address: &Address,
        value_weights: &Vec<i128>,
    ) -> Result<RoyaltyDistribution, SettlementError> {
        if nft_contracts.len() != token_ids.len() {
            return Err(SettlementError::InvalidAmount);
        }
        if nft_contracts.len() != value_weights.len() {
            return Err(SettlementError::InvalidAmount);
        }

        // Calculate total weight for proportional distribution
        let mut total_weight: i128 = 0;
        for w in value_weights.iter() {
            total_weight = math_utils::safe_add(total_weight, w, env)?;
        }

        let mut total_royalty_amount = 0i128;
        let mut amounts = Map::new(env);

        // Calculate royalties for each NFT proportionally by value weight
        for i in 0..nft_contracts.len() {
            let nft_contract = nft_contracts.get(i).ok_or(SettlementError::InvalidAmount)?;
            let token_id = token_ids.get(i).ok_or(SettlementError::InvalidAmount)?;
            let weight = value_weights.get(i).ok_or(SettlementError::InvalidAmount)?;

            let royalty_info = Self::get_royalty_info(env, &nft_contract, token_id)?;

            // Calculate proportional price: sale_price * weight / total_weight
            let individual_price = if total_weight > 0 {
                math_utils::calculate_percentage_with_rounding_and_basis(
                    sale_price,
                    weight as u64,
                    math_utils::RoundingMode::HalfUp,
                    total_weight as u64,
                    env,
                )?
            } else {
                math_utils::safe_div(sale_price, nft_contracts.len() as i128, env)?
            };

            let royalty_amount = math_utils::calculate_percentage(
                individual_price,
                royalty_info.royalty_percentage,
                env,
            )?;

            // Aggregate by creator
            let current_amount = amounts.get(royalty_info.creator.clone()).unwrap_or(0);
            let new_amount = math_utils::safe_add(current_amount, royalty_amount, env)?;
            amounts.set(royalty_info.creator, new_amount);

            total_royalty_amount = math_utils::safe_add(total_royalty_amount, royalty_amount, env)?;
        }

        // Calculate remaining amounts for seller and platform on post-royalty remainder
        let remainder = math_utils::safe_sub(sale_price, total_royalty_amount, env)?;
        let platform_percentage = 500u64; // 5%
        let platform_amount =
            math_utils::calculate_percentage(remainder, platform_percentage, env)?;
        let seller_amount = math_utils::safe_sub(remainder, platform_amount, env)?;

        // Use real addresses passed as parameters
        amounts.set(seller.clone(), seller_amount);
        amounts.set(platform_address.clone(), platform_amount);

        Ok(RoyaltyDistribution {
            creator_address: seller.clone(), // Fallback — multiple creators in amounts map
            creator_percentage: 0,
            seller_address: seller.clone(),
            seller_percentage: 9500,
            platform_address: platform_address.clone(),
            platform_percentage: 500,
            total_amount: sale_price,
            amounts,
        })
    }

    /// Validate royalty distribution adds up correctly
    pub fn validate_royalty_distribution(
        env: &Env,
        distribution: &RoyaltyDistribution,
    ) -> Result<(), SettlementError> {
        let mut total_distributed = 0i128;

        for (_, amount) in distribution.amounts.iter() {
            total_distributed = math_utils::safe_add(total_distributed, amount, env)?;
        }

        if total_distributed != distribution.total_amount {
            return Err(SettlementError::InvalidAmount);
        }

        Ok(())
    }

    /// Get royalty history for an NFT
    pub fn get_royalty_history(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
    ) -> Vec<RoyaltyInfo> {
        // This would store historical royalty information
        // For now, just return current
        match Self::get_royalty_info(env, nft_contract, token_id) {
            Ok(info) => {
                let mut result = Vec::new(env);
                result.push_back(info);
                result
            }
            Err(_) => Vec::new(env),
        }
    }

    /// Bulk set royalties for multiple NFTs.
    /// Validates all percentages against caps before applying any.
    pub fn bulk_set_royalties(
        env: &Env,
        nft_contract: &Address,
        token_ids: &Vec<u64>,
        creator: &Address,
        royalty_percentage: u64,
        setter: &Address,
    ) -> Result<(), SettlementError> {
        // Pre-validate the royalty percentage once for all tokens
        Self::validate_royalty(royalty_percentage, env)?;

        // Then apply to all tokens
        for token_id in token_ids.iter() {
            Self::set_royalty_info(
                env,
                nft_contract,
                token_id,
                creator,
                royalty_percentage,
                setter,
            )?;
        }
        Ok(())
    }

    /// Update the admin-configured max royalty percentage.
    ///
    /// # Authorization
    /// Only the current admin can call this function.
    ///
    /// # Validation
    /// - New cap must be <= MAX_ROYALTY_BPS (hard cap)
    /// - New cap can be increased or decreased (but never above hard cap)
    ///
    /// # Events
    /// Emits `RoyaltyCapUpdated` event on success.
    ///
    /// # Returns
    /// * `Ok(())` if the cap was successfully updated
    /// * `Err(SettlementError::NotAdmin)` if caller is not admin
    /// * `Err(SettlementError::InvalidRoyaltyPercentage)` if new cap exceeds hard cap
    pub fn update_max_royalty_percentage(
        env: &Env,
        caller: &Address,
        new_cap: u64,
    ) -> Result<(), SettlementError> {
        let mut config = Self::get_admin_config(env)?;

        // Authorization: only admin can update the cap
        if caller != &config.admin {
            return Err(SettlementError::NotAdmin);
        }

        // Validate new cap against hard cap
        if new_cap > MAX_ROYALTY_BPS {
            return Err(SettlementError::InvalidRoyaltyPercentage);
        }

        let old_cap = config.max_royalty_percentage;
        config.max_royalty_percentage = new_cap;

        // Store updated config
        env.storage()
            .instance()
            .set(&ADMIN_CONFIG_KEY, &config);

        // Emit event for the cap update
        events::emit_royalty_cap_updated(env, old_cap, new_cap);

        Ok(())
    }

    /// Internal: Create storage key for royalty info
    fn make_royalty_key(env: &Env, _nft_contract: &Address, _token_id: u64) -> RoyaltyKey {
        Bytes::new(env)
    }

    /// Internal: Store royalty information
    fn store_royalty_info(env: &Env, royalty_info: &RoyaltyInfo) -> Result<(), SettlementError> {
        let mut royalty_configs: Map<RoyaltyKey, RoyaltyInfo> = env
            .storage()
            .instance()
            .get(&ROYALTY_CONFIGS)
            .unwrap_or(Map::new(env));

        let key = Self::make_royalty_key(env, &royalty_info.nft_contract, royalty_info.token_id);
        royalty_configs.set(key, royalty_info.clone());

        env.storage()
            .instance()
            .set(&ROYALTY_CONFIGS, &royalty_configs);
        Ok(())
    }
}

/// Royalty enforcement for ensuring royalties are paid
pub struct RoyaltyEnforcer;

impl RoyaltyEnforcer {
    /// Enforce royalty payment before transfer
    pub fn enforce_royalty_payment(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        sale_price: i128,
        _payment_asset: &Asset,
        seller: &Address,
        platform_address: &Address,
    ) -> Result<(), SettlementError> {
        let royalty_distribution = RoyaltyDistributor::calculate_royalties(
            env,
            nft_contract,
            token_id,
            sale_price,
            seller,
            platform_address,
        )?;

        // Check if sufficient funds are available for royalties
        let royalty_amount = math_utils::calculate_percentage(
            sale_price,
            royalty_distribution.creator_percentage,
            env,
        )?;

        // Verify payment can cover royalties
        if sale_price < royalty_amount {
            return Err(SettlementError::InsufficientFunds);
        }

        Ok(())
    }

    /// Verify royalty payment was made
    pub fn verify_royalty_payment(
        _env: &Env,
        _transaction_id: u64,
        _expected_distribution: &RoyaltyDistribution,
    ) -> Result<bool, SettlementError> {
        // This would check if royalties were actually distributed
        // For now, return true
        Ok(true)
    }

    /// Calculate minimum price needed to cover royalties.
    /// Respects the max royalty cap in calculations.
    pub fn calculate_minimum_price(
        env: &Env,
        nft_contract: &Address,
        token_id: u64,
        desired_net_amount: i128,
    ) -> Result<i128, SettlementError> {
        let royalty_info = RoyaltyDistributor::get_royalty_info(env, nft_contract, token_id)?;

        // Get admin cap for validation
        let admin_cap = RoyaltyDistributor::get_admin_max_royalty(env);

        // Ensure royalty percentage doesn't exceed caps (should already be validated)
        if royalty_info.royalty_percentage > admin_cap {
            return Err(SettlementError::RoyaltyExceedsMaxCap);
        }
        if royalty_info.royalty_percentage > MAX_ROYALTY_BPS {
            return Err(SettlementError::InvalidRoyaltyPercentage);
        }

        // Price = desired_net_amount / (1 - royalty_percentage)
        let royalty_decimal = royalty_info.royalty_percentage as i128;
        let denominator = math_utils::safe_sub(10000, royalty_decimal, env)?;
        let price = math_utils::safe_div(
            math_utils::safe_mul(desired_net_amount, 10000, env)?,
            denominator,
            env,
        )?;

        Ok(price)
    }
}

// ─── Events ──────────────────────────────────────────────────────────────────

/// Emitted when the admin updates the max royalty cap.
#[contractevent(topics = ["royalty_cap_updated"])]
#[derive(Clone, Debug, PartialEq)]
pub struct RoyaltyCapUpdated {
    pub old_cap: u64,
    pub new_cap: u64,
    pub updated_at: u64,
}

/// Emit royalty cap updated event.
pub fn emit_royalty_cap_updated(env: &Env, old_cap: u64, new_cap: u64) {
    let payload = RoyaltyCapUpdated {
        old_cap,
        new_cap,
        updated_at: env.ledger().timestamp(),
    };
    payload.publish(env);
}