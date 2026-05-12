# API Routes Summary

## Authentication Routes (`/api/auth`)
- `POST /login` - Login with email/password, returns JWT token
- `POST /refresh` - Refresh access token
- `GET /me` - Get current authenticated user info

## Calculations Routes (`/api/calculations`)
- `POST /` - Create new calculation (managers, analysts)
- `GET /` - List calculations (with role-based filtering)
- `GET /{calculation_id}` - Get specific calculation
- `PUT /{calculation_id}` - Update calculation (with audit logging)
- `POST /{calculation_id}/submit` - Submit for approval
- `POST /{calculation_id}/approve` - Approve calculation (checkers, directors)
- `POST /{calculation_id}/reject` - Reject calculation with reason

## Tariffs Routes (`/api/tariffs`)
- `POST /` - Create new tariff (admin_nsi only)
- `GET /` - List tariffs with filtering (region, category, date)
- `GET /{tariff_id}` - Get specific tariff
- `GET /{tariff_id}/history` - Get tariff version history
- `PUT /{tariff_id}` - Update tariff (creates new version)
- `POST /bulk-import` - Bulk import tariffs from CSV/JSON

## Trains Routes (`/api/trains`)
- `POST /` - Create new train
- `GET /` - List all trains
- `GET /{train_id}` - Get train by ID
- `GET /number/{train_number}` - Get train by number
- `PUT /{train_id}` - Update train info

## Audit Logs Routes (`/api/audit-logs`)
- `GET /` - List audit logs with filtering
  - Filter by entity_type, entity_id
  - Pagination support (limit, offset)
  - Role-based access control (checker, admin_nsi, director)