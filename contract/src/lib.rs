use near_sdk::store::LookupMap;
use near_sdk::{env, near, AccountId, PanicOnDefault};

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct PresenceRecord {
    pub event_id: String,
    pub account_id: AccountId,
    pub timestamp_ns: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    records: LookupMap<String, PresenceRecord>,
    total_records: u64,
}

#[near]
impl Contract {
    #[init]
    pub fn new() -> Self {
        Self {
            records: LookupMap::new(b"presence"),
            total_records: 0,
        }
    }

    /// Store a unique presence event. The caller is the NEAR account signing the transaction.
    pub fn record_presence(&mut self, event_id: String) -> PresenceRecord {
        assert!(!event_id.trim().is_empty(), "event_id must not be empty");
        assert!(event_id.len() <= 128, "event_id is too long");
        assert!(
            self.records.get(&event_id).is_none(),
            "event_id has already been recorded"
        );

        let record = PresenceRecord {
            event_id: event_id.clone(),
            account_id: env::predecessor_account_id(),
            timestamp_ns: env::block_timestamp(),
        };

        self.records.insert(event_id, record.clone());
        self.total_records += 1;
        env::log_str("Presence event recorded");
        record
    }

    pub fn get_presence(&self, event_id: String) -> Option<PresenceRecord> {
        self.records.get(&event_id).cloned()
    }

    pub fn total_records(&self) -> u64 {
        self.total_records
    }
}
