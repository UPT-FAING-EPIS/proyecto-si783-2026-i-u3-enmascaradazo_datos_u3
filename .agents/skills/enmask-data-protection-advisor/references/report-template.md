# Enmask evidence report template

Use this structure when the user asks for documentation, a GitHub README section, or presentation notes.

## 1. Objective
Describe the target database, engine, connection type, and why data protection is required.

## 2. Scope
List protected objects and fields/properties. Mention excluded objects.

## 3. Sensitive data classification
Include a table with object, field/property, detected category, and risk.

## 4. Rules configured
Include algorithm, protection mode, and reason for each rule.

## 5. Dry-run evidence
Summarize preview results without exposing real secrets. Use masked examples only.

## 6. Apply execution
State whether the system used `masked_column`, `static_mask`, `symmetric_encryption`, or virtual mode.

## 7. Restoration and safety
Mention vault/backup, restore procedure, and whether the original data was preserved.

## 8. Screenshots to capture
- connection created/tested
- schema or objects loaded
- selected sensitive fields
- dry-run preview
- job completed
- restored/validated output if applicable
