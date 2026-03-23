# StockMate Database Setup

## Prerequisites
- PostgreSQL database server running
- Database user with CREATE privileges
- Connection to your database (update connection string in backend)

## Setup Instructions

### 1. Create Database Schema
Run the `database_schema.sql` file in your PostgreSQL database:

```bash
psql -U your_username -d your_database -f database_schema.sql
```

Or copy and paste the contents into your PostgreSQL admin tool (pgAdmin, DBeaver, etc.).

### 2. Insert Sample Data
Run the `sample_data.sql` file to populate with test data:

```bash
psql -U your_username -d your_database -f sample_data.sql
```

## Tables Created

### users
- Stores user accounts with roles (admin, cook, staff)
- Includes authentication fields and contact info
- Sample: admin, cook1, staff1, pending_user

### meal_plans
- Stores weekly meal planning data
- JSONB plan_data contains detailed meal schedules
- Status: pending, approved, published, rejected, completed, draft
- Sample: One published plan, one pending plan

### recipes
- Meal directory with ingredients and serving sizes
- Categories: Breakfast, Lunch, Snack
- Sample: Menudo, Afritada, Hotsilog, Sopas, etc.

### inventory
- Current stock levels and supplier information
- Tracks minimum stock levels for alerts
- Sample: Various meats, vegetables, processed foods

## Sample Login Credentials

After running sample data, you can login with:

- **Admin**: username: `admin`, password: (set in backend)
- **Cook**: username: `cook1`, password: (set in backend)
- **Staff**: username: `staff1`, password: (set in backend)

## What You'll See

With sample data loaded:
- **Dashboard**: Shows inventory stats, pending meal plans
- **Accounts**: Shows 1 pending user registration
- **Meal Directory**: 6 recipes available for planning
- **Inventory**: 11 items with various stock levels
- **Meal Planner**: 1 published plan, 1 pending plan
- **Notifications**: Bell icon shows alerts for pending items

## Notes

- Password hashes are placeholders - implement proper hashing in your backend
- Dates are set to February 2026 for testing
- All sample data follows the frontend component expectations
- Run these scripts in order: schema first, then data