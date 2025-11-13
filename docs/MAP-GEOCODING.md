## Partner Map Geocoding

The portal automatically converts partner address information into geographic coordinates (latitude & longitude) so markers appear on the map without manual entry.

### How It Works
1. When a Partner is saved (created or updated) and latitude/longitude fields are empty, the plugin assembles a full address from these meta fields:
   - Street Address (`psp_street_address`)
   - City (`psp_city`)
   - State/Province (`psp_state`)
   - ZIP/Postal (`psp_zip`)
   - Country (`psp_country`)
2. It calls the internal geocoder (OpenStreetMap Nominatim) to resolve the address.
3. On success it stores:
   - `psp_latitude`
   - `psp_longitude`
4. The front-end map consumes the REST endpoint that already includes the stored coordinates.

### Batch Geocoding Existing Partners
Use the admin menu: **PoolSafe Portal → Tools → Geocode from Address**.

Each run:
* Processes up to 25 partners missing coordinates.
* Pauses ~1 second between successful lookups (friendly rate usage).
* Redirects back with a processed count parameter.

Re-run until no more partners are processed.

### Requirements for Good Matches
Provide as many of these as possible:
* Street number & street name.
* City and state.
* ZIP/postal code.
* Country (full name, e.g. "United States" or ISO code if consistent).

### Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| No coordinates after save | Missing or ambiguous address components | Verify city/state/zip/country spelling |
| Batch tool skips partner | Address fields incomplete | Fill missing fields then re-run |
| Wrong marker location | Geocoder chose a different place with similar name | Add ZIP & country, resave |
| Rate limited / very slow | Too many consecutive requests | Wait a minute, resume batches |

### Respecting Nominatim Usage Policy
We intentionally: 
* Only geocode when coordinates are missing.
* Batch small chunks (25) with delay.
* Cache results permanently.

Do **not** mass-edit all partners just to trigger re-geocoding unless you changed addresses.

### Manual Override
If a coordinate is wrong, you may:
1. Edit the partner and manually set `psp_latitude` / `psp_longitude` meta (via a custom field plugin or quick edit tooling) OR
2. Adjust the address and re-save (auto geocode will run if lat/lng are blank).

### Planned Enhancements (Optional)
* Visual badge in Partner list indicating missing coordinates.
* Filter view: "Partners Without Coordinates".
* Logged timestamp of last successful geocode.

### Frequently Asked Questions
**Do I need an API key?** No. Nominatim is public, but be courteous.

**Will old partners map automatically now?** Only after you run the batch geocode tool or re-save them.

**Can I force re-geocode even if coordinates exist?** Not currently; you would clear the lat/lng fields first (advanced use).

**What if the address is international?** Provide country and postal code; state can be optional in some countries.

### Admin Checklist
1. Create/verify Partner records with address completed.
2. Run batch geocoding tool until processed count stops increasing.
3. Open map page to confirm markers.
4. Spot-check a few markers for accuracy.

---
Last updated: 2025-11-12