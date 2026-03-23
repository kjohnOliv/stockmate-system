-- StockMate System Database Schema
-- Run these CREATE TABLE statements in your PostgreSQL database

-- Users table for authentication and roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cook', 'staff')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'active', 'inactive')),
    is_active BOOLEAN DEFAULT FALSE,
    contact_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal plans table
CREATE TABLE meal_plans (
    id SERIAL PRIMARY KEY,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'published', 'rejected', 'completed', 'draft')),
    plan_data JSONB NOT NULL,
    estimated_budget DECIMAL(10,2),
    created_by_id INTEGER REFERENCES users(id),
    created_by_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table for meal directory
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Breakfast', 'Lunch', 'Snack')),
    size INTEGER NOT NULL, -- serving size
    ingredients JSONB NOT NULL, -- array of {name, qty, unit, avgPrice}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL, -- kg, pcs, liters, etc.
    min_stock DECIMAL(10,2) DEFAULT 0,
    avg_price DECIMAL(10,2),
    supplier VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_meal_plans_status ON meal_plans(status);
CREATE INDEX idx_meal_plans_date_from ON meal_plans(date_from);
CREATE INDEX idx_meal_plans_date_to ON meal_plans(date_to);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_name ON inventory(name);