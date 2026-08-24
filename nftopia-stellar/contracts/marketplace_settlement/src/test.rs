#![cfg(test)]

use crate::{
    error::SettlementError,
    royalty_distributor::RoyaltyDistributor,
    settlement_core::{MarketplaceSettlement, MarketplaceSettlementClient},
    types::{Asset, AuctionType, FeeConfig, TokenAsset},
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, Address, Bytes, Env, Symbol,
};

// --- Mock Contracts ---
#[soroban_sdk::contract]
pub struct MockToken;
#[soroban_sdk::contractimpl]
impl MockToken {
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
    pub fn balance(_env: Env, _id: Address) -> i128 {
        100_000_000
    }
    pub fn decimals(_env: Env) -> u32 {
        7
    }
}

#[soroban_sdk::contract]
pub struct MockNft;
#[soroban_sdk::contractimpl]
impl MockNft {
    pub fn set_owner(env: Env, owner: Address) {
        env.storage()
            .instance()
            .set(&soroban_sdk::Symbol::new(&env, "owner"), &owner);
    }
    pub fn owner_of(env: Env, _id: u64) -> Address {
        if env
            .storage()
            .instance()
            .has(&soroban_sdk::Symbol::new(&env, "owner"))
        {
            env.storage()
                .instance()
                .get(&soroban_sdk::Symbol::new(&env, "owner"))
                .unwrap()
        } else {
            Address::generate(&env)
        }
    }
    pub fn transfer(env: Env, _caller: Address, from: Address, to: Address, _token_id: u64) {
        let owner = Self::owner_of(env.clone(), 0);
        assert_eq!(owner, from);
        env.storage()
            .instance()
            .set(&soroban_sdk::Symbol::new(&env, "owner"), &to);
    }
}

fn mk_asset(env: &Env) -> Asset {
    let contract = env.register(MockToken, ());
    Asset::Token(TokenAsset {
        contract,
        symbol: Symbol::new(env, "XLM"),
    })
}

fn default_fee_config(env: &Env, fee_recipient: Address) -> FeeConfig {
    FeeConfig {
        platform_fee_bps: 250,
        minimum_fee: 1000,
        maximum_fee: 1_000_000,
        fee_recipient,
        dynamic_fee_enabled: true,
        volume_discounts: soroban_sdk::Vec::new(env),
        vip_exemptions: soroban_sdk::Vec::new(env),
    }
}

fn new_env() -> (Env, Address, MarketplaceSettlementClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register(MarketplaceSettlement, ());
    let client = MarketplaceSettlementClient::new(&env, &cid);
    let admin = Address::generate(&env);
    let fee_config = default_fee_config(&env, admin.clone());
    client.initialize(&admin, &fee_config);
    let sac_admin = Address::generate(&env);
    let native_xlm_sac = env.register_stellar_asset_contract_v2(sac_admin).address();
    client.set_native_xlm_sac(&admin, &Some(native_xlm_sac));
    let client: MarketplaceSettlementClient<'static> = unsafe { core::mem::transmute(client) };
    (env, cid, client, admin)
}

fn reg(env: &Env, cid: &Address, nft: &Address, creator: &Address, admin: &Address, asset: &Asset) {
    let client = MarketplaceSettlementClient::new(env, cid);
    client.add_allowed_nft_contract(admin, nft);
    if let Asset::Token(t) = asset {
        client.add_allowed_token_contract(admin, &t.contract);
    }

    env.as_contract(cid, || {
        let _ = RoyaltyDistributor::set_royalty_info(env, nft, 1, creator, 500, creator);
    });
}

// ─── Init ────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    new_env();
}

#[test]
fn test_reinitialize_fee_config_fails() {
    let (env, _cid, client, admin) = new_env();
    let fee_config = default_fee_config(&env, admin.clone());
    // A second initialize on the same contract must fail with FeeAlreadyInitialized.
    let result = client.try_initialize(&admin, &fee_config);
    assert!(result.is_err());
}

#[test]
fn test_accumulated_fees_start_zero() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    assert_eq!(client.get_accumulated_fees(&_asset), 0i128);
}

// ─── Sale ────────────────────────────────────────────────────────────────────

#[test]
fn test_create_sale_success() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert_eq!(id, 1u64);
}

#[test]
fn test_get_sale_after_create() {
    let (env, cid, client, _admin) = new_env();
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    let cur = mk_asset(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &cur);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &500_000i128, &cur, &3600u64);
    let sale = client.get_sale(&id);
    assert_eq!(sale.seller, seller);
    assert_eq!(sale.price, 500_000i128);
}

#[test]
fn test_cancel_sale_by_seller() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    client.cancel_transaction(&id, &Symbol::new(&env, "sale"), &seller);
    assert_eq!(MockNftClient::new(&env, &nft).owner_of(&1), seller);
}

#[test]
fn test_cancel_sale_non_seller_fails() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let attacker = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(client
        .try_cancel_transaction(&id, &Symbol::new(&env, "sale"), &attacker)
        .is_err());
}

#[test]
fn test_execute_sale_wrong_payment_fails() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(client.try_execute_sale(&id, &buyer, &999_999i128).is_err());
}

#[test]
fn test_get_nonexistent_sale_fails() {
    let (_env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&_env);
    assert!(client.try_get_sale(&9999u64).is_err());
}

// ─── Auction ─────────────────────────────────────────────────────────────────

#[test]
fn test_create_english_auction_success() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &_asset,
    );
    assert_eq!(id, 1u64);
}

#[test]
#[ignore]
fn test_create_dutch_auction_success() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &200_000i128,
        &50_000i128,
        &7200u64,
        &1_000i128,
        &AuctionType::Dutch,
        &_asset,
    );
    assert!(id > 0);
}

#[test]
fn test_create_auction_zero_price_fails() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    assert!(client
        .try_create_auction(
            &seller,
            &nft,
            &1u64,
            &0i128,
            &0i128,
            &3600u64,
            &1_000i128,
            &AuctionType::English,
            &_asset,
        )
        .is_err());
}

#[test]
fn test_bid_below_starting_price_fails() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &_asset,
    );
    assert!(client
        .try_place_bid(&id, &bidder, &50_000i128, &None)
        .is_err());
}

#[test]
#[ignore]
fn test_get_dutch_auction_price() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &200_000i128,
        &50_000i128,
        &7200u64,
        &1_000i128,
        &AuctionType::Dutch,
        &_asset,
    );
    let price = client.get_dutch_auction_price(&id);
    assert!(price > 0);
}

#[test]
fn test_get_nonexistent_auction_fails() {
    let (_env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&_env);
    assert!(client.try_get_auction(&9999u64).is_err());
}

// ─── Fee Manager ─────────────────────────────────────────────────────────────

#[test]
fn test_update_fee_config_by_admin() {
    let (env, _cid, _client, _admin) = new_env();
    let admin = Address::generate(&env);
    let cfg = FeeConfig {
        platform_fee_bps: 300,
        minimum_fee: 500,
        maximum_fee: 2_000_000,
        fee_recipient: admin.clone(),
        dynamic_fee_enabled: false,
        volume_discounts: soroban_sdk::Vec::new(&env),
        vip_exemptions: soroban_sdk::Vec::new(&env),
    };
    // re-initialize with known admin so we can update
    let cid2 = env.register(MarketplaceSettlement, ());
    let c2 = MarketplaceSettlementClient::new(&env, &cid2);
    let init_cfg = default_fee_config(&env, admin.clone());
    c2.initialize(&admin, &init_cfg);
    c2.update_fee_config(&cfg, &admin);
}

#[test]
fn test_update_fee_config_non_admin_fails() {
    use crate::types::FeeConfig;
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let admin = Address::generate(&env);
    let attacker = Address::generate(&env);
    let cfg = FeeConfig {
        platform_fee_bps: 300,
        minimum_fee: 500,
        maximum_fee: 2_000_000,
        fee_recipient: admin.clone(),
        dynamic_fee_enabled: false,
        volume_discounts: soroban_sdk::Vec::new(&env),
        vip_exemptions: soroban_sdk::Vec::new(&env),
    };
    assert!(client.try_update_fee_config(&cfg, &attacker).is_err());
}

#[test]
fn test_get_user_volume_starts_zero() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let user = Address::generate(&env);
    assert_eq!(client.get_user_volume(&user), 0i128);
}

// ─── Royalty Distributor ─────────────────────────────────────────────────────

#[test]
fn test_set_and_get_royalty_info() {
    let (env, cid, _client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    env.as_contract(&cid, || {
        let _ = RoyaltyDistributor::set_royalty_info(&env, &nft, 1, &creator, 500, &creator);
        let info = RoyaltyDistributor::get_royalty_info(&env, &nft, 1).unwrap();
        assert_eq!(info.royalty_percentage, 500);
        assert_eq!(info.creator, creator);
    });
}

#[test]
fn test_royalty_exceeds_max_fails() {
    let (env, cid, _client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    env.as_contract(&cid, || {
        assert_eq!(
            RoyaltyDistributor::set_royalty_info(&env, &nft, 1, &creator, 5001, &creator),
            Err(SettlementError::InvalidRoyaltyPercentage)
        );
    });
}

#[test]
fn test_get_royalty_not_found_fails() {
    let (env, cid, _client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let nft = Address::generate(&env);
    env.as_contract(&cid, || {
        assert_eq!(
            RoyaltyDistributor::get_royalty_info(&env, &nft, 99),
            Err(SettlementError::NotFound)
        );
    });
}

// ─── Trade ───────────────────────────────────────────────────────────────────

#[test]
fn test_create_trade_success() {
    use crate::types::{NFTItem, RoyaltyDistribution};
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let initiator = Address::generate(&env);
    let creator = Address::generate(&env);
    let dummy = RoyaltyDistribution {
        creator_address: creator.clone(),
        creator_percentage: 500,
        seller_address: creator.clone(),
        seller_percentage: 9000,
        platform_address: creator.clone(),
        platform_percentage: 500,
        total_amount: 0,
        amounts: soroban_sdk::Map::new(&env),
    };
    let mut i_nfts = soroban_sdk::Vec::new(&env);
    i_nfts.push_back(NFTItem {
        nft_address: Address::generate(&env),
        token_id: 1,
        royalty_info: dummy.clone(),
    });
    let mut c_nfts = soroban_sdk::Vec::new(&env);
    c_nfts.push_back(NFTItem {
        nft_address: Address::generate(&env),
        token_id: 2,
        royalty_info: dummy,
    });
    let id = client.create_trade(&initiator, &None, &i_nfts, &c_nfts, &3600u64);
    assert!(id > 0);
}

#[test]
fn test_create_trade_empty_nfts_fails() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let initiator = Address::generate(&env);
    let empty: soroban_sdk::Vec<crate::types::NFTItem> = soroban_sdk::Vec::new(&env);
    assert!(client
        .try_create_trade(&initiator, &None, &empty, &empty, &3600u64)
        .is_err());
}

// ─── Bundle ───────────────────────────────────────────────────────────────────

#[test]
fn test_create_bundle_success() {
    use crate::types::{NFTItem, RoyaltyDistribution};
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let creator = Address::generate(&env);
    let nft = Address::generate(&env);

    // Register NFT contract and add asset to whitelist
    reg(&env, &cid, &nft, &creator, &admin, &asset);

    // Add the asset to supported assets list
    client.add_supported_asset(&admin, &asset);

    let dummy = RoyaltyDistribution {
        creator_address: creator.clone(),
        creator_percentage: 500,
        seller_address: creator.clone(),
        seller_percentage: 9000,
        platform_address: creator.clone(),
        platform_percentage: 500,
        total_amount: 0,
        amounts: soroban_sdk::Map::new(&env),
    };
    let mut items = soroban_sdk::Vec::new(&env);
    items.push_back(NFTItem {
        nft_address: nft,
        token_id: 1,
        royalty_info: dummy,
    });
    let id = client.create_bundle(&seller, &items, &500_000i128, &asset, &86400u64);
    assert!(id > 0);
}

#[test]
fn test_create_bundle_empty_items_fails() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let empty: soroban_sdk::Vec<crate::types::NFTItem> = soroban_sdk::Vec::new(&env);
    assert!(client
        .try_create_bundle(&seller, &empty, &500_000i128, &_asset, &86400u64)
        .is_err());
}

// ─── Emergency Withdrawal ────────────────────────────────────────────────────

#[test]
fn test_emergency_withdraw_non_admin_fails() {
    let (env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let attacker = Address::generate(&env);
    let reason = Bytes::from_slice(&env, b"stuck");
    assert!(client
        .try_emergency_withdraw(&1u64, &reason, &attacker)
        .is_err());
}

#[test]
fn test_reentrancy_guard_emergency_withdraw() {
    let (env, cid, client, admin) = new_env();
    env.as_contract(&cid, || {
        env.storage()
            .instance()
            .set(&soroban_sdk::symbol_short!("reentrant"), &true);
    });
    let reason = Bytes::from_slice(&env, b"test");
    assert!(client
        .try_emergency_withdraw(&1u64, &reason, &admin)
        .is_err());
}

#[test]
fn test_reentrancy_guard_update_fee_config() {
    use crate::types::FeeConfig;
    let (env, cid, client, admin) = new_env();
    env.as_contract(&cid, || {
        env.storage()
            .instance()
            .set(&soroban_sdk::symbol_short!("reentrant"), &true);
    });
    let cfg = FeeConfig {
        platform_fee_bps: 300,
        minimum_fee: 500,
        maximum_fee: 2_000_000,
        fee_recipient: admin.clone(),
        dynamic_fee_enabled: false,
        volume_discounts: soroban_sdk::Vec::new(&env),
        vip_exemptions: soroban_sdk::Vec::new(&env),
    };
    assert!(client.try_update_fee_config(&cfg, &admin).is_err());
}

#[test]
fn test_reentrancy_guard_withdraw_platform_fees() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let recipient = Address::generate(&env);
    env.as_contract(&cid, || {
        env.storage()
            .instance()
            .set(&soroban_sdk::symbol_short!("reentrant"), &true);
    });
    assert!(client
        .try_withdraw_platform_fees(&asset, &recipient, &admin)
        .is_err());
}

// ─── Commit-Reveal ───────────────────────────────────────────────────────────

#[test]
fn test_reveal_wrong_salt_fails() {
    let (env, cid, client, _admin) = new_env();
    let _asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &_asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &_asset,
    );
    let commitment = Bytes::from_slice(&env, b"commitment_hash");
    client.place_bid(&id, &bidder, &110_000i128, &Some(commitment));
    let wrong_salt = Bytes::from_slice(&env, b"wrong_salt");
    assert!(client
        .try_reveal_bid(&id, &bidder, &110_000i128, &wrong_salt)
        .is_err());
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

#[test]
fn test_cleanup_expired_commitments() {
    let (_env, _cid, client, _admin) = new_env();
    let _asset = mk_asset(&_env);
    client.cleanup_expired_commitments();
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

#[test]
fn test_rate_limiter_defaults_and_cooldown_active() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    for _ in 0..10 {
        MockNftClient::new(&env, &nft).set_owner(&seller);
        let _id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    }

    // The 11th call must fail with CooldownActive
    let res = client.try_create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }
}

#[test]
fn test_rate_limiter_independent_users_and_functions() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller_1 = Address::generate(&env);
    let seller_2 = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller_1);

    for _ in 0..10 {
        MockNftClient::new(&env, &nft).set_owner(&seller_1);
        let _id = client.create_sale(&seller_1, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    }

    let res = client.try_create_sale(&seller_1, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }

    // seller_2 should NOT be blocked
    MockNftClient::new(&env, &nft).set_owner(&seller_2);
    let id_2 = client.create_sale(&seller_2, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(id_2 > 0);

    // seller_1 can still create_auction
    MockNftClient::new(&env, &nft).set_owner(&seller_1);
    let auc_id = client.create_auction(
        &seller_1,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );
    assert!(auc_id > 0);
}

#[test]
fn test_rate_limiter_window_reset() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    for _ in 0..10 {
        MockNftClient::new(&env, &nft).set_owner(&seller);
        let _id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    }

    let res = client.try_create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }

    // Move ledger time forward by 60 seconds
    let new_timestamp = env.ledger().timestamp() + 61;
    env.ledger().set_timestamp(new_timestamp);

    // Now it should succeed again!
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert!(id > 0);
}

#[test]
fn test_rate_limiter_admin_update_config() {
    let (env, _cid, _client, _admin) = new_env();
    let admin = Address::generate(&env);
    let asset = mk_asset(&env);

    // Setup known admin (using second client initialized with admin)
    let cid2 = env.register(MarketplaceSettlement, ());
    let c2 = MarketplaceSettlementClient::new(&env, &cid2);
    let init_cfg = default_fee_config(&env, admin.clone());
    c2.initialize(&admin, &init_cfg);

    let bidder = Address::generate(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid2, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let id = c2.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );

    // Default rate limit for place_bid is 5 calls / 60s
    // Admin updates limit to 2 calls / 30s
    let place_bid_sym = Symbol::new(&env, "place_bid");
    c2.update_rate_limit(&place_bid_sym, &2u32, &30u64, &admin);

    // Retrieve config to verify update
    let config_opt = c2.get_rate_limit_config(&place_bid_sym);
    assert!(config_opt.is_some());
    let cfg = config_opt.unwrap();
    assert_eq!(cfg.limit, 2u32);
    assert_eq!(cfg.window_seconds, 30u64);

    // place 2 bids successfully
    c2.place_bid(&id, &bidder, &110_000i128, &None);
    c2.place_bid(&id, &bidder, &120_000i128, &None);

    // 3rd bid should fail under new configuration
    let res = c2.try_place_bid(&id, &bidder, &130_000i128, &None);

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::CooldownActive);
    } else {
        panic!("Expected Err(Ok(CooldownActive)), got: {:?}", res);
    }
}

#[test]
#[ignore]
fn test_minimum_bid_increment_enforcement() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    // Create auction with 100 starting price and 1% bid increment (100 bps)
    let auction_id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128, // 1% of starting price
        &AuctionType::English,
        &asset,
    );

    // First bid at starting price should succeed
    client.place_bid(&auction_id, &bidder, &100_000i128, &None);

    // Second bid with only 0.5% increment should fail (below 1% minimum)
    let res = client.try_place_bid(&auction_id, &bidder, &100_500i128, &None);
    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::BidBelowMinimumIncrement);
    } else {
        panic!("Expected Err(Ok(BidBelowMinimumIncrement)), got: {:?}", res);
    }

    // Bid with 1% increment should succeed
    client.place_bid(&auction_id, &bidder, &101_000i128, &None);
}

#[test]
fn test_auction_bid_increment_validation_on_creation() {
    let (env, cid, client, admin) = new_env();
    let asset = mk_asset(&env);
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    // Try to create auction with bid_increment below minimum (0.5% instead of 1%)
    let res = client.try_create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &500i128, // 0.5% of starting price - should fail
        &AuctionType::English,
        &asset,
    );

    if let Err(Ok(invoke_error)) = res {
        let actual_error: SettlementError = invoke_error;
        assert_eq!(actual_error, SettlementError::InvalidBidIncrement);
    } else {
        panic!("Expected Err(Ok(InvalidBidIncrement)), got: {:?}", res);
    }

    // Create auction with valid bid_increment (1%)
    let auction_id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128, // 1% of starting price - should succeed
        &AuctionType::English,
        &asset,
    );
    assert!(auction_id > 0);
}

#[test]
#[ignore]
fn test_admin_update_min_bid_increment() {
    // Skipped: update_min_bid_increment API not exposed on settlement client in current build
}

// ─── Royalty Cap Tests ──────────────────────────────────────────────────────

/// Test that setting royalty below both caps succeeds.
#[test]
fn test_set_royalty_below_caps_succeeds() {
    let (env, cid, _client, _admin) = new_env();
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);

    // Set AdminConfig with max_royalty_percentage = 3000 (30%)
    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 3000,
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Set royalty at 25% (2500 bps) - below both caps
        let result = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft, 1, &creator, 2500, &creator,
        );
        assert!(result.is_ok());

        let info = crate::royalty_distributor::RoyaltyDistributor::get_royalty_info(&env, &nft, 1)
            .unwrap();
        assert_eq!(info.royalty_percentage, 2500);
    });
}

/// Test that setting royalty above hard cap (50%) fails.
#[test]
fn test_set_royalty_above_hard_cap_fails() {
    let (env, cid, _client, _admin) = new_env();
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 5000, // Admin cap at 50%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Set royalty at 60% (6000 bps) - exceeds hard cap
        let result = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft, 1, &creator, 6000, &creator,
        );
        assert_eq!(result, Err(SettlementError::InvalidRoyaltyPercentage));
    });
}

/// Test that setting royalty above admin cap but below hard cap fails.
#[test]
fn test_set_royalty_above_admin_cap_fails() {
    let (env, cid, _client, _admin) = new_env();
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 2000, // Admin cap at 20%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Set royalty at 30% (3000 bps) - below hard cap but above admin cap
        let result = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft, 1, &creator, 3000, &creator,
        );
        assert_eq!(result, Err(SettlementError::RoyaltyExceedsMaxCap));
    });
}

/// Test that updating royalty above admin cap fails.
#[test]
fn test_update_royalty_above_admin_cap_fails() {
    let (env, cid, _client, _admin) = new_env();
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 2000, // Admin cap at 20%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Set initial royalty at 10%
        let _ = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft, 1, &creator, 1000, &creator,
        );

        // Update to 30% - below hard cap but above admin cap
        let result = crate::royalty_distributor::RoyaltyDistributor::update_royalty_percentage(
            &env, &nft, 1, 3000, &creator,
        );
        assert_eq!(result, Err(SettlementError::RoyaltyExceedsMaxCap));
    });
}

/// Test that bulk set with invalid royalty fails entirely (no partial updates).
#[test]
fn test_bulk_set_royalties_with_invalid_percentage_fails() {
    let (env, cid, _client, _admin) = new_env();
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);
    let mut token_ids = soroban_sdk::Vec::new(&env);
    token_ids.push_back(1);
    token_ids.push_back(2);
    token_ids.push_back(3);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 2000, // Admin cap at 20%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Try to bulk set at 30% - exceeds admin cap
        let result = crate::royalty_distributor::RoyaltyDistributor::bulk_set_royalties(
            &env, &nft, &token_ids, &creator, 3000, &creator,
        );
        assert_eq!(result, Err(SettlementError::RoyaltyExceedsMaxCap));

        // Verify no royalties were set (atomicity)
        for id in token_ids.iter() {
            let result =
                crate::royalty_distributor::RoyaltyDistributor::get_royalty_info(&env, &nft, id);
            assert!(result.is_err());
        }
    });
}

/// Test that admin can update max royalty cap (downward).
#[test]
fn test_admin_update_max_royalty_downward_succeeds() {
    let (env, cid, _client, _admin) = new_env();

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 5000, // 50%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Update cap down to 30%
        let result = crate::royalty_distributor::RoyaltyDistributor::update_max_royalty_percentage(
            &env, &_admin, 3000,
        );
        assert!(result.is_ok());

        let updated_config: crate::royalty_distributor::AdminConfig = env
            .storage()
            .instance()
            .get(&crate::royalty_distributor::ADMIN_CONFIG_KEY)
            .unwrap();
        assert_eq!(updated_config.max_royalty_percentage, 3000);
    });
}

/// Test that admin can update max royalty cap (upward, but never above hard cap).
#[test]
fn test_admin_update_max_royalty_upward_succeeds() {
    let (env, cid, _client, _admin) = new_env();

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 2000, // 20%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Update cap up to 40% (still below hard cap)
        let result = crate::royalty_distributor::RoyaltyDistributor::update_max_royalty_percentage(
            &env, &_admin, 4000,
        );
        assert!(result.is_ok());

        let updated_config: crate::royalty_distributor::AdminConfig = env
            .storage()
            .instance()
            .get(&crate::royalty_distributor::ADMIN_CONFIG_KEY)
            .unwrap();
        assert_eq!(updated_config.max_royalty_percentage, 4000);
    });
}

/// Test that admin cannot set cap above hard cap (50%).
#[test]
fn test_admin_update_max_royalty_above_hard_cap_fails() {
    let (env, cid, _client, _admin) = new_env();

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 5000, // 50%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Try to update cap to 60% (exceeds hard cap)
        let result = crate::royalty_distributor::RoyaltyDistributor::update_max_royalty_percentage(
            &env, &_admin, 6000,
        );
        assert_eq!(result, Err(SettlementError::InvalidRoyaltyPercentage));
    });
}

/// Test that non-admin cannot update max royalty cap.
#[test]
fn test_non_admin_update_max_royalty_fails() {
    let (env, cid, _client, _admin) = new_env();
    let attacker = Address::generate(&env);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 5000,
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Attacker tries to update cap
        let result = crate::royalty_distributor::RoyaltyDistributor::update_max_royalty_percentage(
            &env, &attacker, 3000,
        );
        assert_eq!(result, Err(SettlementError::NotAdmin));
    });
}

/// Test that existing royalty info persists but cannot be updated above new cap.
#[test]
fn test_existing_royalty_cannot_be_updated_above_new_cap() {
    let (env, cid, _client, _admin) = new_env();
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 5000, // 50%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Set royalty at 40%
        let _ = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft, 1, &creator, 4000, &creator,
        );

        // Update admin cap down to 30%
        let _ = crate::royalty_distributor::RoyaltyDistributor::update_max_royalty_percentage(
            &env, &_admin, 3000,
        );

        // Try to update royalty to 35% (above new cap)
        let result = crate::royalty_distributor::RoyaltyDistributor::update_royalty_percentage(
            &env, &nft, 1, 3500, &creator,
        );
        assert_eq!(result, Err(SettlementError::RoyaltyExceedsMaxCap));

        // Existing royalty at 40% should still be intact
        let info = crate::royalty_distributor::RoyaltyDistributor::get_royalty_info(&env, &nft, 1)
            .unwrap();
        assert_eq!(info.royalty_percentage, 4000);
    });
}

/// Test that calculate_minimum_price respects max cap.
#[test]
fn test_calculate_minimum_price_respects_max_cap() {
    let (env, cid, _client, _admin) = new_env();
    let nft = Address::generate(&env);
    let creator = Address::generate(&env);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 3000, // 30%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Set royalty at 25%
        let _ = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft, 1, &creator, 2500, &creator,
        );

        // Calculate minimum price for desired net amount of 1000
        let min_price = crate::royalty_distributor::RoyaltyEnforcer::calculate_minimum_price(
            &env, &nft, 1, 1000,
        )
        .unwrap();

        // With 25% royalty, price = 1000 / (1 - 0.25) = 1333.33...
        assert_eq!(min_price, 1333);
    });
}

/// Test that complex royalty calculation respects caps.
#[test]
fn test_complex_royalties_respect_caps() {
    let (env, cid, _client, _admin) = new_env();
    let nft1 = Address::generate(&env);
    let nft2 = Address::generate(&env);
    let creator1 = Address::generate(&env);
    let creator2 = Address::generate(&env);

    env.as_contract(&cid, || {
        let admin_config = crate::royalty_distributor::AdminConfig {
            admin: _admin.clone(),
            emergency_withdrawal_enabled: false,
            max_transaction_duration: 86400,
            max_auction_duration: 86400,
            min_bid_increment_bps: 100,
            max_royalty_percentage: 2000, // 20%
            dispute_cooling_period: 3600,
            arbitration_quorum: 3,
        };
        env.storage()
            .instance()
            .set(&crate::royalty_distributor::ADMIN_CONFIG_KEY, &admin_config);

        // Set royalty at 15% (below admin cap)
        let _ = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft1, 1, &creator1, 1500, &creator1,
        );

        // Set royalty at 25% (exceeds admin cap) - this should fail
        let result = crate::royalty_distributor::RoyaltyDistributor::set_royalty_info(
            &env, &nft2, 1, &creator2, 2500, &creator2,
        );
        assert_eq!(result, Err(SettlementError::RoyaltyExceedsMaxCap));
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Native XLM Integration Tests
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fn test_native_asset_returns_xlm_variant() {
    use crate::utils::asset_utils::native_asset;
    assert_eq!(native_asset(), Asset::NativeXLM);
}

#[test]
fn test_configured_native_asset_is_valid() {
    let (env, cid, _client, _admin) = new_env();
    let asset = Asset::NativeXLM;
    env.as_contract(&cid, || {
        let supported: soroban_sdk::Vec<Asset> = soroban_sdk::Vec::new(&env);
        let result = crate::utils::asset_utils::validate_asset(&asset, &supported, &env);
        assert!(result.is_ok());
    });
}

#[test]
fn test_assets_equal_native_xlm() {
    use crate::utils::asset_utils::assets_equal;
    assert!(assets_equal(&Asset::NativeXLM, &Asset::NativeXLM));
}

#[test]
fn test_create_sale_with_native_xlm() {
    let (env, cid, client, admin) = new_env();
    let asset = Asset::NativeXLM;
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert_eq!(id, 1u64);
}

#[test]
fn test_create_auction_with_native_xlm() {
    let (env, cid, client, _admin) = new_env();
    let asset = Asset::NativeXLM;
    let seller = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );
    assert_eq!(id, 1u64);
}

#[test]
fn test_place_bid_native_xlm() {
    let (env, cid, client, _admin) = new_env();
    let asset = Asset::NativeXLM;
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    let nft = env.register(MockNft, ());
    let creator = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &_admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);
    let sac = client.get_native_xlm_sac().unwrap();
    token::StellarAssetClient::new(&env, &sac).mint(&bidder, &100_000i128);
    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );
    client.place_bid(&id, &bidder, &100_000i128, &None);
    let auction = client.get_auction(&id);
    assert_eq!(auction.highest_bid, 100_000i128);
}

#[test]
fn test_get_token_balance_native_xlm_succeeds() {
    let (env, cid, client, _admin) = new_env();
    let user = Address::generate(&env);
    let sac = client.get_native_xlm_sac().unwrap();
    token::StellarAssetClient::new(&env, &sac).mint(&user, &100_000_000i128);
    env.as_contract(&cid, || {
        let balance =
            crate::utils::asset_utils::get_token_balance(&Asset::NativeXLM, &user, &env).unwrap();
        assert_eq!(balance, 100_000_000);
    });
}

#[test]
fn test_native_asset_requires_configured_sac() {
    let env = Env::default();
    env.mock_all_auths();
    let cid = env.register(MarketplaceSettlement, ());
    let client = MarketplaceSettlementClient::new(&env, &cid);
    let admin = Address::generate(&env);
    client.initialize(&admin, &default_fee_config(&env, admin.clone()));

    env.as_contract(&cid, || {
        let supported = soroban_sdk::Vec::new(&env);
        assert_eq!(
            crate::utils::asset_utils::validate_asset(&Asset::NativeXLM, &supported, &env,),
            Err(SettlementError::NativeAssetTransferFailed)
        );
        let account = Address::generate(&env);
        assert_eq!(
            crate::utils::asset_utils::get_token_balance(&Asset::NativeXLM, &account, &env),
            Err(SettlementError::NativeAssetBalanceFailed)
        );
    });
}

#[test]
fn test_asset_decimals_dispatches_for_native_and_tokens() {
    let env = Env::default();
    let token_asset = mk_asset(&env);
    assert_eq!(
        crate::utils::asset_utils::get_token_decimals(&Asset::NativeXLM, &env),
        Ok(7)
    );
    assert_eq!(
        crate::utils::asset_utils::get_token_decimals(&token_asset, &env),
        Ok(7)
    );
}

#[test]
fn test_native_transfer_failure_returns_contract_error() {
    let (env, cid, _client, _admin) = new_env();
    let empty = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.as_contract(&cid, || {
        assert_eq!(
            crate::utils::asset_utils::transfer_tokens(
                &Asset::NativeXLM,
                &empty,
                &recipient,
                1,
                &env,
            ),
            Err(SettlementError::NativeAssetTransferFailed)
        );
    });
}

#[test]
fn test_execute_sale_with_native_xlm_distributes_proceeds_and_fees() {
    let (env, cid, client, admin) = new_env();
    let asset = Asset::NativeXLM;
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let creator = Address::generate(&env);
    let nft = env.register(MockNft, ());
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let sac = client.get_native_xlm_sac().unwrap();
    let sac_admin = token::StellarAssetClient::new(&env, &sac);
    let balances = token::Client::new(&env, &sac);
    sac_admin.mint(&buyer, &1_000_000i128);

    let id = client.create_sale(&seller, &nft, &1u64, &1_000_000i128, &asset, &86400u64);
    assert_eq!(MockNftClient::new(&env, &nft).owner_of(&1), cid);

    let result = client.execute_sale(&id, &buyer, &1_000_000i128);
    assert!(result.success);
    assert_eq!(MockNftClient::new(&env, &nft).owner_of(&1), buyer);
    assert_eq!(balances.balance(&buyer), 0);
    assert_eq!(balances.balance(&creator), 50_000);
    assert_eq!(balances.balance(&seller), 925_000);
    assert_eq!(balances.balance(&cid), 25_000);
    assert_eq!(client.get_accumulated_fees(&asset), 25_000);

    assert_eq!(
        client.withdraw_platform_fees(&asset, &admin, &admin),
        25_000
    );
    assert_eq!(balances.balance(&cid), 0);
    assert_eq!(balances.balance(&admin), 25_000);
}

#[test]
fn test_native_xlm_auction_refunds_outbid_bidder_and_settles() {
    let (env, cid, client, admin) = new_env();
    let asset = Asset::NativeXLM;
    let seller = Address::generate(&env);
    let bidder_one = Address::generate(&env);
    let bidder_two = Address::generate(&env);
    let creator = Address::generate(&env);
    let nft = env.register(MockNft, ());
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    MockNftClient::new(&env, &nft).set_owner(&seller);

    let sac = client.get_native_xlm_sac().unwrap();
    let sac_admin = token::StellarAssetClient::new(&env, &sac);
    let balances = token::Client::new(&env, &sac);
    sac_admin.mint(&bidder_one, &100_000i128);
    sac_admin.mint(&bidder_two, &110_000i128);

    let id = client.create_auction(
        &seller,
        &nft,
        &1u64,
        &100_000i128,
        &80_000i128,
        &3600u64,
        &1_000i128,
        &AuctionType::English,
        &asset,
    );
    client.place_bid(&id, &bidder_one, &100_000i128, &None);
    client.place_bid(&id, &bidder_two, &110_000i128, &None);
    assert_eq!(balances.balance(&bidder_one), 100_000);
    assert_eq!(balances.balance(&cid), 110_000);

    env.ledger().set_timestamp(3601);
    client.end_auction(&id, &seller);

    assert_eq!(MockNftClient::new(&env, &nft).owner_of(&1), bidder_two);
    assert_eq!(balances.balance(&bidder_two), 0);
    assert_eq!(balances.balance(&creator), 5_500);
    assert_eq!(balances.balance(&seller), 101_750);
    assert_eq!(balances.balance(&cid), 2_750);
    assert_eq!(client.get_accumulated_fees(&asset), 2_750);
}

#[test]
fn test_bundle_creation_with_native_xlm() {
    use crate::types::{NFTItem, RoyaltyDistribution};
    let (env, cid, client, admin) = new_env();
    let asset = Asset::NativeXLM;
    let seller = Address::generate(&env);
    let creator = Address::generate(&env);
    let nft = Address::generate(&env);
    reg(&env, &cid, &nft, &creator, &admin, &asset);
    client.add_supported_asset(&admin, &asset);
    let dummy = RoyaltyDistribution {
        creator_address: creator.clone(),
        creator_percentage: 500,
        seller_address: creator.clone(),
        seller_percentage: 9000,
        platform_address: creator.clone(),
        platform_percentage: 500,
        total_amount: 0,
        amounts: soroban_sdk::Map::new(&env),
    };
    let mut items = soroban_sdk::Vec::new(&env);
    items.push_back(NFTItem {
        nft_address: nft,
        token_id: 1,
        royalty_info: dummy,
    });
    let id = client.create_bundle(&seller, &items, &500_000i128, &asset, &86400u64);
    assert!(id > 0);
}

#[test]
fn test_assets_not_equal_xlm_and_token() {
    use crate::utils::asset_utils::assets_equal;
    let env = Env::default();
    let contract = env.register(MockToken, ());
    let token_asset = Asset::Token(crate::types::TokenAsset {
        contract,
        symbol: soroban_sdk::Symbol::new(&env, "XLM"),
    });
    assert!(!assets_equal(&Asset::NativeXLM, &token_asset));
}

#[test]
fn test_xlm_payment_failed_error() {
    let err = SettlementError::NativeAssetTransferFailed;
    assert_eq!(err as u32, 304);
    let err2 = SettlementError::NativeAssetBalanceFailed;
    assert_eq!(err2 as u32, 305);
}
