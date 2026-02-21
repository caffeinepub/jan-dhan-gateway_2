# Jan-Dhan Gateway

## Current State

The application currently accepts Excel files (.xlsx, .xls) for bulk citizen data import. The ImportDataPage component:
- Uses the SheetJS (xlsx) library loaded from CDN
- Accepts only Excel file formats
- Parses Excel sheets and converts them to JSON
- Maps column data to citizen records with proper type conversions

## Requested Changes (Diff)

### Add
- CSV file format support for citizen data import
- CSV parsing logic to handle comma-separated values
- Support for standard CSV with headers matching the current Excel column structure

### Modify
- File input to accept `.csv` files in addition to Excel formats
- File validation to check for CSV format
- Import logic to detect file type (CSV vs Excel) and parse accordingly
- UI text and instructions to reflect CSV support

### Remove
- Excel-only file format restriction
- Excel-only messaging in the UI

## Implementation Plan

1. Update ImportDataPage component to accept CSV files
2. Add CSV parsing logic using native JavaScript (no external library needed)
3. Keep existing Excel parsing for backward compatibility
4. Update file input accept attribute to include `.csv`
5. Update UI text to mention CSV support
6. Add file type detection logic to route to appropriate parser

## UX Notes

- Users can now upload either CSV or Excel files
- CSV files should have the same column headers as Excel format
- CSV format will be simpler for users who don't have Excel
- Expected CSV columns: Citizen_ID, Name, DOB, Gender, Marital_Status, Account_Status, Aadhaar_Linked, Scheme_Eligibility, Scheme_Amount
- File validation will guide users if wrong format is uploaded
