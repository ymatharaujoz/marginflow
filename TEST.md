# Mercado Livre Sync Test Guide

This file explains how to create Mercado Livre test users, publish test products, run MarginFlow synchronization, and verify whether the imported data reaches the product review flow and the dashboard.

## Quick Start: Dashboard with Mock Data

To view the dashboard without setting up Mercado Livre sync, you can use the built-in mock data mode:

### Enable Mock Data Mode

1. Ensure your `apps/web/.env.local` contains:
   ```
   NEXT_PUBLIC_USE_MOCK_DATA=true
   ```

2. Restart the dev server:
   ```bash
   pnpm dev:web
   ```

3. Access `/app` - the dashboard will display with realistic test data including:
   - 30 days of sales history with daily metrics
   - Revenue trends and profit analysis
   - Product profitability rankings
   - Marketplace channel breakdown (Mercado Livre/Shopee)
   - AI-powered insights

### Mock Data Features

The mock data simulates:
- **Faturamento**: ~R$100k over 30 days
- **Lucro líquido**: ~25% margin
- **Produtos**: 5 sample products with varying margins
- **Canais**: 85% Mercado Livre, 15% Shopee
- **Período**: Last 30 days with realistic patterns (weekends lower, weekdays higher)

### Disable Mock Data

To switch to real data:
1. Remove `NEXT_PUBLIC_USE_MOCK_DATA=true` from `.env.local`
2. Restart the dev server
3. Connect Mercado Livre and run sync to populate real data

---

## Goal

Validate the full Mercado Livre path in this repo:

1. Connect a Mercado Livre account in `/app/integrations`
2. Create test listings in Mercado Livre with a test seller
3. Run sync in MarginFlow
4. Confirm the synced products appear in `/app/products`
5. Import or link at least one synced product
6. Confirm finance data appears in `/app`

## Official Mercado Livre notes

According to Mercado Livre developer documentation:

- there is no separate sandbox environment for marketplace tests
- tests are done in production using test users
- test users can simulate seller and buyer actions without affecting real-user reputation
- listings can be created through the normal listing APIs such as `POST https://api.mercadolibre.com/items`

Useful documentation:

- [Mercado Livre Developers](https://developers.mercadolivre.com.br/pt_br)
- [Realizacao de testes](https://developers.mercadolivre.com.br/pt_br/realizacao-de-testes)
- [Publicacao de produtos](https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos)
- [Atributos](https://developers.mercadolivre.com.br/pt_br/atributos)
- [Trabalhar com imagens](https://developers.mercadolivre.com.br/pt_br/trabalhar-com-imagens)

## Important repo context

This checkout already supports the Mercado Livre connection and sync flow:

- connect flow: `/app/integrations`
- Mercado Livre callback: `GET /integrations/mercadolivre/callback`
- sync actions: `GET /sync/status`, `GET /sync/history`, `POST /sync/run`
- synced-product review flow: `/app/products`
- dashboard: `/app`

If you are testing locally, the intended default setup is:

- web: `http://localhost:3000`
- api: `http://localhost:4000`

For Mercado Livre OAuth, use the callback-only ngrok workflow already documented in `apps/api/README.md` when you need a public callback URL.

## Prerequisites

Before creating test products, make sure all of this is ready:

- Mercado Livre app credentials are configured in the root `.env`
- `MERCADOLIVRE_CLIENT_ID` is set
- `MERCADOLIVRE_CLIENT_SECRET` is set
- `BETTER_AUTH_URL` points to your local API, usually `http://localhost:4000`
- `WEB_APP_ORIGIN` points to your local web app, usually `http://localhost:3000`
- if using ngrok, `MERCADOLIVRE_REDIRECT_URI` matches the exact callback URL registered in Mercado Livre
- the API is running
- the web app is running
- you have an active entitlement so `/app/integrations` is accessible

Recommended local commands:

```bash
corepack pnpm dev:api
corepack pnpm dev:web
```

If you need a public callback URL for local OAuth:

```bash
corepack pnpm ngrok:mercadolivre:callback
corepack pnpm ngrok:mercadolivre:callback:url
```

## Step 1. Create Mercado Livre test users

Mercado Livre's documented testing model is based on test users instead of a sandbox.

Create at least:

- 1 test seller user
- 1 test buyer user

In practice, the easiest way to think about this is:

- create one test user that you will use as the seller account
- create another test user that you will keep as the buyer account

Recommended usage in this repo:

- connect MarginFlow with the test seller account
- use the test buyer only if later you want to simulate orders or post-listing activity

### 1.1 What you need before calling `/users/test_user`

The official Mercado Livre testing endpoint is:

- `POST https://api.mercadolibre.com/users/test_user`

The official docs also say this call requires:

- a valid `Authorization: Bearer $ACCESS_TOKEN`
- a `site_id` in the JSON body

For Brazil, use:

- `site_id=MLB`

### 1.2 Important note about the access token

The official docs I pulled for this guide clearly show:

- the test-user creation endpoint requires a valid access token
- the token-exchange examples they expose use `POST /oauth/token` with `grant_type=authorization_code`

So the safest documented guidance is:

1. use your Mercado Livre app credentials
2. complete the normal OAuth authorization flow for your app
3. exchange the returned `code` for an access token
4. use that access token in the test-user creation call below

If you already have a valid Mercado Livre access token for your app, you can skip directly to the test-user creation calls.

### 1.3 Exchange an authorization code for an access token

Official token exchange example:

```bash
curl -X POST ^
  -H "accept: application/json" ^
  -H "content-type: application/x-www-form-urlencoded" ^
  "https://api.mercadolibre.com/oauth/token" ^
  -d "grant_type=authorization_code" ^
  -d "client_id=YOUR_APP_ID" ^
  -d "client_secret=YOUR_APP_SECRET" ^
  -d "code=YOUR_AUTHORIZATION_CODE" ^
  -d "redirect_uri=YOUR_REDIRECT_URI"
```

Expected response shape:

```json
{
  "access_token": "APP_OR_USER_ACCESS_TOKEN",
  "token_type": "bearer",
  "expires_in": 21600,
  "scope": "offline_access ...",
  "user_id": 123456789,
  "refresh_token": "REFRESH_TOKEN"
}
```

Save:

- `access_token`
- `refresh_token`
- `user_id`

### 1.4 Create the test seller user

Official test-user creation example adapted for Brazil:

```bash
curl -X POST ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"site_id\":\"MLB\"}" ^
  "https://api.mercadolibre.com/users/test_user"
```

Example response shape from the docs:

```json
{
  "id": 120506781,
  "nickname": "TEST0548",
  "password": "qatest328",
  "site_status": "active"
}
```

Save these seller credentials immediately:

- `id`
- `nickname`
- `password`

### 1.5 Create the test buyer user

Run the same endpoint a second time:

```bash
curl -X POST ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"site_id\":\"MLB\"}" ^
  "https://api.mercadolibre.com/users/test_user"
```

Save these buyer credentials too:

- `id`
- `nickname`
- `password`

### 1.6 Suggested local record format

Keep a temporary note like this while testing:

```txt
SELLER_TEST_USER_ID=...
SELLER_TEST_USER_NICKNAME=...
SELLER_TEST_USER_PASSWORD=...

BUYER_TEST_USER_ID=...
BUYER_TEST_USER_NICKNAME=...
BUYER_TEST_USER_PASSWORD=...
```

You will use the seller user for:

- logging into the OAuth flow
- publishing test listings
- connecting the account to MarginFlow

## Step 2. Connect the test seller in MarginFlow

1. Open `http://localhost:3000/app/integrations`
2. Click the Mercado Livre connect action
3. Complete the OAuth flow using the test seller account
4. Return to `/app/integrations`
5. Confirm the provider card shows the account as connected

If this fails:

- verify the callback URL registered in Mercado Livre
- verify `MERCADOLIVRE_REDIRECT_URI`
- verify ngrok is exposing the callback path when testing locally

## Step 3. Prepare a category and required attributes

Before publishing a listing, inspect the category rules in Mercado Livre documentation because some categories require specific attributes.

For a quick first test:

- choose a simple category
- use a short clear title that marks the item as test data
- keep quantity and price simple
- include required attributes for the chosen category

Mercado Livre docs show that attributes can be required by category, so do not assume a generic payload works for every category.

### 3.1 Practical recommendation for the first test

Keep the first listing simple:

- use `site_id=MLB`
- use `currency_id=BRL`
- use a category that accepts a basic item structure
- start with one picture
- add only the attributes required by that category

If you do not know the right category yet, pick one first in the Mercado Livre UI and mirror that same category ID in your API call.

## Step 4. Upload at least one picture

Mercado Livre documents image upload through:

- `POST https://api.mercadolibre.com/pictures/items/upload`

Example:

```bash
curl -X POST ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -H "content-type: multipart/form-data" ^
  -F "file=@C:\\path\\to\\product.jpg" ^
  "https://api.mercadolibre.com/pictures/items/upload"
```

Save the returned picture data for the item payload.

Prefer saving:

- `id`
- `secure_url`

If your publication payload uses remote image URLs, `source` can point directly to the image URL. If you want to follow the upload flow more closely, upload the image first and then reuse the resulting image reference.

## Step 5. Create test product listings with cURL

Mercado Livre documents normal item publication through:

- `POST https://api.mercadolibre.com/items`

Use the seller access token for the account that will own the listing.

### 5.1 Minimum example using a remote picture URL

This is the easiest first test if you already have a public image URL:

```bash
curl -X POST ^
  -H "Authorization: Bearer SELLER_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{
    \"site_id\": \"MLB\",
    \"title\": \"Produto de teste MarginFlow - nao comprar\",
    \"category_id\": \"YOUR_CATEGORY_ID\",
    \"price\": 99.9,
    \"currency_id\": \"BRL\",
    \"buying_mode\": \"buy_it_now\",
    \"listing_type_id\": \"gold_special\",
    \"condition\": \"new\",
    \"available_quantity\": 5,
    \"pictures\": [
      {
        \"source\": \"https://YOUR_PUBLIC_IMAGE_URL\"
      }
    ],
    \"attributes\": [
      {
        \"id\": \"BRAND\",
        \"value_name\": \"Marca Teste\"
      }
    ]
  }" ^
  "https://api.mercadolibre.com/items"
```

### 5.2 Example closer to the official docs

Mercado Livre docs also show item creation in this shape:

```bash
curl -X POST ^
  -H "Authorization: Bearer SELLER_ACCESS_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{
    \"site_id\": \"MLB\",
    \"title\": \"Produto de teste MarginFlow - nao comprar\",
    \"category_id\": \"YOUR_CATEGORY_ID\",
    \"price\": 99.9,
    \"currency_id\": \"BRL\",
    \"buying_mode\": \"buy_it_now\",
    \"listing_type_id\": \"gold_special\",
    \"condition\": \"new\",
    \"available_quantity\": 5,
    \"pictures\": [
      {
        \"source\": \"https://http2.mlstatic.com/example.jpg\"
      }
    ],
    \"sale_terms\": [
      {
        \"id\": \"MANUFACTURING_TIME\",
        \"value_name\": \"20 dias\"
      }
    ],
    \"attributes\": [
      {
        \"id\": \"BRAND\",
        \"value_name\": \"Marca Teste\"
      }
    ]
  }" ^
  "https://api.mercadolibre.com/items"
```

### 5.3 Example response fields to save

After the item is created successfully, save at least:

- `id`
- `seller_id`
- `title`
- `permalink`
- `category_id`

These fields make sync validation easier later.

### 5.4 Create 3 products, not just 1

For MarginFlow testing, I recommend creating 3 different test listings:

1. one item that you plan to import into `/app/products`
2. one item that you plan to leave as review-only
3. one item that you may later ignore or use for linking tests

Suggested titles:

- `Produto de teste MarginFlow A - nao comprar`
- `Produto de teste MarginFlow B - nao comprar`
- `Produto de teste MarginFlow C - nao comprar`

### 5.5 Common payload caveats

Keep these constraints in mind:

- `site_id`, `currency_id`, `category_id`, `listing_type_id`, and attribute requirements must match the marketplace and category you are using
- if Mercado Livre rejects the payload, adjust it based on the category-specific requirements from their docs
- use obvious test titles such as `Produto de teste` or `Nao comprar`
- some categories require extra `attributes`
- some categories require specific `sale_terms`
- some categories are much easier for quick testing than others

Create at least 2 or 3 test listings so the sync result is easier to validate.

## Step 6. Run sync in MarginFlow

After the test listings exist in Mercado Livre:

1. Go back to `http://localhost:3000/app/integrations`
2. Check whether the sync action is available in the current Sao Paulo time window
3. Trigger sync
4. Wait for the run to complete
5. Confirm the provider history shows a completed run

This repo enforces the M11 manual-window rules:

- morning
- afternoon
- evening

By default, the same window cannot be reused after a successful sync.

For local-only testing, there is a guard-relaxing env flag documented in `apps/api/README.md`:

```env
SYNC_RELAX_GUARDS=true
```

Use that only when you explicitly want to bypass the normal sync-window restrictions during development.

## Step 7. Review synced products

After a successful sync:

1. Open `http://localhost:3000/app/products`
2. Look for the synced-product review section
3. Confirm the Mercado Livre listings appeared there

Expected behavior in this repo:

- synced marketplace items stay read-only at first
- they do not become internal editable products automatically
- you must explicitly import, link, or ignore them

## Step 8. Import or link at least one product

To make the dashboard more meaningful:

1. import one synced product as an internal product, or
2. link one synced product to an existing internal product

Then make sure the linked or imported product has usable finance inputs, especially:

- product cost
- ad cost if relevant
- any extra manual expense data you want reflected later

Without cost data, the dashboard may still load but can remain incomplete or show low-signal states.

## Step 9. Verify the dashboard

Open:

- `http://localhost:3000/app`

Confirm at least these points:

- the recent sync panel reflects the Mercado Livre run
- the dashboard no longer looks like a first-run no-sync state
- imported or linked products contribute to the financial read model
- charts and KPI cards load without API errors

If the product appears in `/app/products` but not meaningfully in `/app`, verify whether:

- the product was only synced but not imported or linked
- the product is missing cost data
- there are no orders or financial rows yet for that item

## Suggested minimum test scenario

Use this small scenario first:

1. connect 1 Mercado Livre test seller
2. create 3 test listings
3. run 1 sync
4. confirm the 3 items appear in `/app/products`
5. import or link 1 item
6. add cost data to that item if needed
7. refresh `/app`
8. confirm recent sync and dashboard data changed

## Troubleshooting

### OAuth callback fails

Check:

- the exact registered callback URL
- `MERCADOLIVRE_REDIRECT_URI`
- ngrok is active
- the API is reachable from the public callback URL

### Sync button is blocked

Check:

- whether the current Sao Paulo window was already used
- `GET /sync/status`
- whether `SYNC_RELAX_GUARDS=true` is needed for repeated local tests

### Products do not appear after sync

Check:

- the Mercado Livre account was connected with the same seller that created the listings
- the sync run completed successfully
- `GET /sync/history`
- `/app/products` instead of checking only the dashboard

### Products appear in `/app/products` but not in the dashboard

Check:

- import or link status
- cost data completeness
- whether the financial model has enough signal to leave the empty state

## What counts as success for this test

Consider this flow validated when all of the following are true:

- the Mercado Livre test seller connects successfully
- a sync run completes successfully
- the created test listings appear in `/app/products`
- at least one synced listing is imported or linked
- `/app` reflects the recent sync and shows non-empty financial data consistent with the imported test product
