# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

```bash
npm run dev   # Start local Vercel dev server
```

No lint or test scripts are configured. TypeScript is compiled by Vercel at deploy time.

## Architecture

Serverless API backend for PimelStore e-commerce platform, deployed on Vercel with MongoDB Atlas.

Each file in `api/` is an independent serverless function exported as a default `(req: VercelRequest, res: VercelResponse) => void`. Routes and HTTP methods are mapped in `vercel.json`.

### Route Map

| Method | Path | Handler |
|--------|------|---------|
| POST | /register | `api/register/register.ts` |
| POST | /login | `api/auth/login.ts` |
| GET | /token | `api/auth/token.ts` |
| POST | /sales | `api/sales/createSale.ts` |
| GET | /sales | `api/sales/getSales.ts` |
| GET | /sales/:id | `api/sales/getSalesById.ts` |
| PUT | /sales/:id | `api/sales/updateSales.ts` |
| DELETE | /sales or /sales/:id | `api/sales/deleteSales.ts` |
| GET | /dashboard | `api/viewers/dashboard.ts` |

### Key Utilities

- `utils/mongo.ts` — MongoDB connection and collection accessors (db: `pimelstore`)
- `utils/jwt.ts` — Token generation/verification using `JWT_SECRET`
- `utils/requestSecurity.ts` — Auth middleware: reads `Authorization: Bearer <token>` header, returns `{ valid, data, statusCode }`; call this at the top of every protected endpoint
- `utils/apiResponse.ts` — `apiResponse(res, status, data)` wrapper used by all endpoints
- `utils/bcrypt.ts` — Password hashing (10 rounds) and comparison

### Data Model

**Multi-tenancy:** All records carry a `_company_id` field that scopes data per company.

**Sale.payment_method** accepted values: `credit_card | debit_card | pix | cash | other`

**Sales GET** supports `page`, `limit`, and date range query params.

### Environment Variables

- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Secret for JWT signing (tokens expire in 1 day)
