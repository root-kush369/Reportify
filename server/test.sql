CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  "user" VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL
);

INSERT INTO reports (date, category, amount, user, region) VALUES
('2025-06-01', 'Sales', 1000.00, 'Alice', 'North'),
('2025-06-02', 'HR', 500.00, 'Bob', 'South'),
('2025-06-03', 'Finance', 750.00, 'Charlie', 'East');