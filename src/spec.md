# Jan-Dhan Gateway

## Current State

The system currently:
- Accepts citizen data via CSV/Excel import
- Sets ALL imported citizens to `aadhaarStatus = #unlinked` by default (hardcoded in backend)
- Does NOT read the `Aadhaar_Linked` column from the dataset
- User's dataset has `Aadhaar_Linked=TRUE` for all citizens, but this is being ignored

## Requested Changes (Diff)

### Add
- Support for reading `Aadhaar_Linked` column during CSV/Excel import
- Logic to convert TRUE/FALSE from dataset to linked/unlinked status

### Modify
- Backend `InputCitizen` type to include `aadhaarStatus` field
- Backend `addCitizen` and `addCitizens` functions to accept and use aadhaarStatus from input
- Frontend import logic to parse `Aadhaar_Linked` column and map to AadhaarStatus enum
- Frontend to send correct aadhaarStatus when importing citizens

### Remove
- Hardcoded `aadhaarStatus = #unlinked` default in backend

## Implementation Plan

1. **Update backend Motoko code**:
   - Add `aadhaarStatus` to `InputCitizen` type
   - Update `addCitizen` and `addCitizens` to use the provided aadhaarStatus instead of hardcoding #unlinked
   - Add `accountStatus` to `InputCitizen` as well for consistency

2. **Update frontend import logic**:
   - Parse `Aadhaar_Linked` column (TRUE/FALSE)
   - Parse `Account_Status` column (Active/Inactive)
   - Map to correct enum values (linked/unlinked, active/inactive)
   - Send correct status values when calling addCitizens

3. **Validate**:
   - Test import with user's dataset
   - Verify Aadhaar status displays correctly after import
   - Verify validation gates work correctly

## UX Notes

- When users import data with `Aadhaar_Linked=TRUE`, those citizens should show "Linked" status
- When users import data with `Account_Status=Active`, those citizens should show "Active" status
- The three-gate validation should work correctly based on imported statuses
