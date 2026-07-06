# Enmask masking playbook

## Data categories and suggested rules

| Category | Examples | Recommended algorithms | Recommended modes |
|---|---|---|---|
| Identity | dni, ruc, passport, document_number, national_id | redaction, fpe, substitution | masked_column, static_mask |
| Contact | email, phone, address | substitution, redaction, hashing | masked_column, static_mask |
| Financial | card_number, account_number, iban, payment_token | redaction, hashing, symmetric_encryption | masked_column, symmetric_encryption |
| Credentials | password, secret, api_key, token | hashing, nullification, symmetric_encryption | static_mask, symmetric_encryption |
| Names | first_name, last_name, full_name, customer_name | substitution | masked_column, static_mask |
| Dates | birth_date, created_at when sensitive | perturbation, redaction | masked_column, static_mask |
| Numeric business values | salary, income, balance, score | perturbation, redaction | masked_column, static_mask |
| Free text | comments, notes, description | redaction, nullification | masked_column, static_mask |

## Algorithm selection

- Use `substitution` when data must remain realistic but fictitious.
- Use `redaction` when the user wants to hide most of a value while preserving a small visible suffix/prefix.
- Use `hashing` when deterministic matching is needed but the original should not be readable.
- Use `nullification` when the field is not needed after protection.
- Use `fpe` when the output should preserve the approximate format.
- Use `perturbation` for numeric/date values where analytics should remain approximately useful.
- Use `symmetric_encryption` only when reversible recovery is required and the key is protected.

## Default recommendations

- DNI/RUC: `redaction` or `fpe`, mode `masked_column` for demo.
- Email: `substitution`, mode `masked_column`.
- Phone: `redaction`, mode `masked_column`.
- Address: `substitution` or `redaction`, mode `masked_column`.
- Card/account numbers: `redaction` or `symmetric_encryption`, mode `masked_column` or `symmetric_encryption`.
- Passwords/tokens: never display; use `hashing`, `nullification`, or `symmetric_encryption` depending on requirements.
