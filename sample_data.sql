-- StockMate sample data aligned with the current Go backend schema.
-- Backend reference: c:\Users\User\stockmate-api\main.go
--
-- Sample login credentials:
-- stockmatedata@gmail.com / admin123
-- maria@stockmate.com / cook123
-- john@stockmate.com / staff123
-- pending@example.com / pending123
--
-- Notes:
-- 1. The backend also auto-seeds stockmatedata@gmail.com / admin123.
-- 2. This file uses the current columns:
--    users.password
--    inventory.item, qty, threshold, unit, price, status
--    recipes + recipe_ingredients
--    meal_plans(date_from, date_to, status, plan_data)

BEGIN;

-- Optional reset for a clean demo run.
-- Uncomment if you want to replace previous sample/demo records.
-- DELETE FROM recipe_ingredients;
-- DELETE FROM recipes;
-- DELETE FROM meal_plans;
-- DELETE FROM inventory WHERE LOWER(item) IN (
--   'pork', 'chicken', 'carrots', 'potatoes', 'hotdog', 'rice',
--   'macaroni', 'milk', 'beef tapa', 'eggs', 'malunggay'
-- );
-- DELETE FROM users WHERE LOWER(email) IN (
--   'stockmatedata@gmail.com', 'maria@stockmate.com', 'john@stockmate.com', 'pending@example.com'
-- );

-- Users
INSERT INTO users (username, full_name, email, password, role, status, is_active, contact_number)
VALUES
  ('admin_demo', 'System Administrator', 'stockmatedata@gmail.com', '$2a$10$HeRbZOx6rNOwJkhwMPaA8.tsGgADVVsQJOlUjW6s7txSU31Iii8NO', 'admin', 'approved', true, '+1234567890'),
  ('cook1', 'Chef Maria Santos', 'maria@stockmate.com', '$2a$10$4M4oFGbfzbVSuPZhaEuGTOZEoPafDsbZ.MVIHXlv7oKsS/lF54VWe', 'cook', 'approved', true, '+1234567891'),
  ('staff1', 'John Doe', 'john@stockmate.com', '$2a$10$dXBPMgne.XWOG/TKBKK4jumX1vqD07WSA2fvFSnrgxItpJedZA4HG', 'staff', 'approved', true, '+1234567892'),
  ('pending_user', 'Pending Registration', 'pending@example.com', '$2a$10$PPZ3KomoXtZWCfPcRZTt2.dl7NJRWa7zVnk6Itx0ixsbtTThhU/zi', 'staff', 'pending', false, '+1234567893')
ON CONFLICT (email) DO UPDATE
SET username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active,
    contact_number = EXCLUDED.contact_number;

-- Inventory
INSERT INTO inventory (item, category, qty, threshold, unit, price, status)
VALUES
  ('Pork', 'Meat', 15.5, 10, 'kg', 380, 'In Stock'),
  ('Chicken', 'Meat', 12.0, 8, 'kg', 220, 'In Stock'),
  ('Carrots', 'Vegetable', 8.5, 5, 'kg', 35, 'In Stock'),
  ('Potatoes', 'Vegetable', 20.0, 10, 'kg', 45, 'In Stock'),
  ('Hotdog', 'Processed', 50, 20, 'pcs', 10, 'In Stock'),
  ('Rice', 'Grains', 25.0, 15, 'kg', 40, 'In Stock'),
  ('Macaroni', 'Pasta', 10.0, 5, 'kg', 110, 'In Stock'),
  ('Milk', 'Dairy', 8.0, 5, 'liters', 65, 'In Stock'),
  ('Beef Tapa', 'Meat', 6.0, 3, 'kg', 280, 'In Stock'),
  ('Eggs', 'Dairy', 100, 50, 'pcs', 8, 'In Stock'),
  ('Malunggay', 'Vegetable', 3.0, 2, 'kg', 25, 'In Stock')
ON CONFLICT (item) DO UPDATE
SET category = EXCLUDED.category,
    qty = EXCLUDED.qty,
    threshold = EXCLUDED.threshold,
    unit = EXCLUDED.unit,
    price = EXCLUDED.price,
    status = EXCLUDED.status;

-- Recipes
DELETE FROM recipe_ingredients
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE name IN (
    'Menudo', 'Afritada', 'Hotsilog', 'Sopas', 'Tapsilog', 'Chicken Tinola'
  )
);

DELETE FROM recipes
WHERE name IN (
  'Menudo', 'Afritada', 'Hotsilog', 'Sopas', 'Tapsilog', 'Chicken Tinola'
);

INSERT INTO recipes (name, category, allergens, pax_size, price)
VALUES
  ('Menudo', 'Lunch', '', 50, 2035),
  ('Afritada', 'Lunch', '', 50, 1390),
  ('Hotsilog', 'Breakfast', '', 30, 380),
  ('Sopas', 'Snack', 'Milk', 70, 545),
  ('Tapsilog', 'Breakfast', 'Egg', 25, 1320),
  ('Chicken Tinola', 'Lunch', '', 45, 1125);

INSERT INTO recipe_ingredients (recipe_id, inventory_id, qty)
SELECT r.id, i.id, v.qty
FROM (
  VALUES
    ('Menudo', 'Pork', 5.0),
    ('Menudo', 'Potatoes', 3.0),
    ('Afritada', 'Chicken', 6.0),
    ('Afritada', 'Carrots', 2.0),
    ('Hotsilog', 'Hotdog', 30.0),
    ('Hotsilog', 'Rice', 2.0),
    ('Sopas', 'Macaroni', 2.0),
    ('Sopas', 'Milk', 5.0),
    ('Tapsilog', 'Beef Tapa', 4.0),
    ('Tapsilog', 'Eggs', 25.0),
    ('Chicken Tinola', 'Chicken', 5.0),
    ('Chicken Tinola', 'Malunggay', 1.0)
) AS v(recipe_name, inventory_name, qty)
JOIN recipes r ON r.name = v.recipe_name
JOIN inventory i ON i.item = v.inventory_name;

-- Meal plans
-- Current backend only stores: date_from, date_to, status, plan_data
DELETE FROM meal_plans
WHERE date_from IN ('2026-03-23', '2026-03-30');

INSERT INTO meal_plans (date_from, date_to, status, plan_data)
VALUES
(
  '2026-03-23',
  '2026-03-27',
  'published',
  '[
    {
      "date": "March 23, 2026",
      "dayName": "MONDAY",
      "isoDate": "2026-03-23",
      "isHoliday": false,
      "meals": {
        "Breakfast": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "breakfast-1",
              "name": "Hotsilog",
              "recipeId": 0,
              "pax": 30,
              "basePax": 30
            }
          ]
        },
        "Lunch": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "lunch-1",
              "name": "Menudo",
              "recipeId": 0,
              "pax": 50,
              "basePax": 50
            }
          ]
        },
        "Snack": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "snack-1",
              "name": "Sopas",
              "recipeId": 0,
              "pax": 70,
              "basePax": 70
            }
          ]
        }
      }
    },
    {
      "date": "March 24, 2026",
      "dayName": "TUESDAY",
      "isoDate": "2026-03-24",
      "isHoliday": false,
      "meals": {
        "Breakfast": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "breakfast-2",
              "name": "Tapsilog",
              "recipeId": 0,
              "pax": 25,
              "basePax": 25
            }
          ]
        },
        "Lunch": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "lunch-2",
              "name": "Afritada",
              "recipeId": 0,
              "pax": 50,
              "basePax": 50
            }
          ]
        },
        "Snack": {
          "status": "NOT YET STARTED",
          "items": []
        }
      }
    }
  ]'::jsonb
),
(
  '2026-03-30',
  '2026-04-03',
  'pending',
  '[
    {
      "date": "March 30, 2026",
      "dayName": "MONDAY",
      "isoDate": "2026-03-30",
      "isHoliday": false,
      "meals": {
        "Breakfast": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "breakfast-3",
              "name": "Hotsilog",
              "recipeId": 0,
              "pax": 30,
              "basePax": 30
            }
          ]
        },
        "Lunch": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "lunch-3",
              "name": "Chicken Tinola",
              "recipeId": 0,
              "pax": 45,
              "basePax": 45
            }
          ]
        },
        "Snack": {
          "status": "NOT YET STARTED",
          "items": [
            {
              "id": "snack-3",
              "name": "Sopas",
              "recipeId": 0,
              "pax": 70,
              "basePax": 70
            }
          ]
        }
      }
    }
  ]'::jsonb
);

COMMIT;
