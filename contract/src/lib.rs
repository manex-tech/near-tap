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
            records: LookupMap::new(&b"presence"[..]),
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

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn set_context(account: &str, timestamp_ns: u64) {
        let context = VMContextBuilder::new()
            .predecessor_account_id(account.parse().unwrap())
            .block_timestamp(timestamp_ns)
            .build();
        testing_env!(context);
    }

    #[test]
    fn initializes_with_zero_records() {
        set_context("alice.near", 1);
        let contract = Contract::new();
        assert_eq!(contract.total_records(), 0);
        assert_eq!(contract.get_presence("missing-event".to_string()), None);
    }

    #[test]
    fn records_and_retrieves_presence_for_signing_account() {
        set_context("alice.near", 123_456);
        let mut contract = Contract::new();

        let saved = contract.record_presence("event-001".to_string());
        let fetched = contract.get_presence("event-001".to_string()).unwrap();

        assert_eq!(saved.event_id, "event-001");
        assert_eq!(saved.account_id, "alice.near".parse::<AccountId>().unwrap());
        assert_eq!(saved.timestamp_ns, 123_456);
        assert_eq!(fetched.event_id, saved.event_id);
        assert_eq!(fetched.account_id, saved.account_id);
        assert_eq!(contract.total_records(), 1);
    }

    #[test]
    fn records_are_attributed_to_the_transaction_predecessor() {
        set_context("bob.near", 987_654);
        let mut contract = Contract::new();

        let saved = contract.record_presence("event-002".to_string());

        assert_eq!(saved.account_id, "bob.near".parse::<AccountId>().unwrap());
    }

    #[test]
    #[should_panic(expected = "event_id has already been recorded")]
    fn rejects_duplicate_event_ids() {
        set_context("alice.near", 1);
        let mut contract = Contract::new();
        contract.record_presence("event-duplicate".to_string());
        contract.record_presence("event-duplicate".to_string());
    }

    #[test]
    #[should_panic(expected = "event_id must not be empty")]
    fn rejects_empty_event_ids() {
        set_context("alice.near", 1);
        let mut contract = Contract::new();
        contract.record_presence("   ".to_string());
    }

    #[test]
    #[should_panic(expected = "event_id is too long")]
    fn rejects_event_ids_longer_than_128_bytes() {
        set_context("alice.near", 1);
        let mut contract = Contract::new();
        contract.record_presence("a".repeat(129));
    }
}
