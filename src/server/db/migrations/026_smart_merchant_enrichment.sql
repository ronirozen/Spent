ALTER TABLE transactions ADD COLUMN original_description TEXT;
ALTER TABLE transactions ADD COLUMN merchant_domain TEXT;

UPDATE transactions SET original_description = description;
