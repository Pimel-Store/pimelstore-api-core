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

The Vercel Hobby plan caps a deployment at 12 serverless functions, so `sales` and `expenses` each consolidate their full CRUD into a single handler file that routes internally on `req.method` (and `req.query.id` for by-id GET/PUT/DELETE) — do not split them back into one-file-per-verb.

### Route Map

| Method | Path | Handler |
|--------|------|---------|
| POST | /register | `api/register/register.ts` |
| POST | /login | `api/auth/login.ts` |
| GET | /token | `api/auth/token.ts` |
| POST, GET, PUT, DELETE | /sales, /sales/:id | `api/sales/sales.ts` |
| POST, GET, PUT, DELETE | /expenses, /expenses/:id | `api/expenses/expenses.ts` |
| POST, GET, PUT, DELETE | /categories, /categories/:id | `api/categories/categories.ts` |
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

**Category** is company-defined (`title` + hex `color`), created/managed via `/categories`. `Expense.category_id` references a `Category._id` — deleting a category does not cascade to existing expenses.

**Expense.payment_method** accepted values: `credit_card | debit_card | pix | cash | other`

**Sales GET / Expenses GET** support `page`, `limit`, and date range query params.

### Environment Variables

- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Secret for JWT signing (tokens expire in 1 day)
