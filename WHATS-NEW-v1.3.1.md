# What's New – v1.3.1

Date: November 13, 2025

## Highlights
- Multi-line partner welcome banner (Company, Management Company, Units)
- Expanded bulk import: CSV or Excel with automatic user creation
- Quick Create panel (Company + Login Account in one step)
- Full ticket & service record history visible in company profile
- Fixed Top Colour palette (Ice Blue, Classic Blue, Ducati Red, Yellow, Custom)
- Added phone meta field & display
- Theme color inheritance enforced (Customizer only)
- Runtime Excel (.xlsx) parsing (SheetJS) for import

## Bulk Import Format (19 Columns)
`user_login,user_pass,number,display_name,top_colour,company_name,management_company,units,street_address,city,state,zip,country,lock,master_code,sub_master_code,lock_part,key,phone`

## Upgrade Notes
No database schema changes. All new meta fields are simple post/user meta.

## Next Suggestions
- Add HubSpot enrichment for phone + management company on import
- Add pagination controls for extremely large ticket histories (optional)
- Provide export (CSV/Excel) for partners

— Built for seamless Support onboarding without wp-admin access.