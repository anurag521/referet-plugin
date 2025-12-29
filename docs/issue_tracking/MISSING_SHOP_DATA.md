# Issue: Missing Shop Name & Email in Database

## Symptom
The `shops` and `sessions` tables in the database are populated, but critical details like `shop_name`, `email`, `first_name`, and `last_name` are missing or `null`.

### Observed Data
**Sessions Table (`offline_` token):**
```json
{
  "idx": 0,
  "id": "offline_jindaal-2.myshopify.com",
  "shop": "jindaal-2.myshopify.com",
  "accessToken": "shpua_...",
  "firstName": null,
  "lastName": null,
  "email": null,
  "accountOwner": null
}
```
**Shops Table:**
```json
{
  "idx": 0,
  "shop_id": "jindaal-2.myshopify.com",
  "plan": "basic",
  "is_active": true
}
```

## Root Cause Analysis

### 1. Sessions Table (Null User Data)
- **Cause**: The app uses **Offline Access Tokens** (`access_mode: offline`).
- **Explanation**: Offline tokens are associated with the **Store** itself, not a specific User. Therefore, fields like `firstName`, `lastName`, and `email` (which belong to a logged-in user) are not available in the Session object.
- **Solution**: Do not rely on the `sessions` table for Merchant Name/Email. Use the `shops` table instead.

### 2. Shops Table (Missing Name/Email)
- **Cause**: The Backend Database Schema and `ShopsService` are incomplete.
    1.  **Database Schema**: The `shops` table likely does not have columns for `shop_name`, `email`, `shop_owner`.
    2.  **Backend Logic**: The `ShopsService.syncShop()` method in the backend receives the data from the frontend, but it currently only updates `access_token` and `is_active`. It ignores the `data` (Shopify Shop Resource) payload provided.

## Required Fixes

To fix this, we need to:

1.  **Update Database Schema**:
    ```sql
    ALTER TABLE shops ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE shops ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner TEXT;
    ```

2.  **Update Backend Code (`shops.service.ts`)**:
    Modify the `INSERT` and `UPDATE` queries to save `data.name`, `data.email`, etc.
