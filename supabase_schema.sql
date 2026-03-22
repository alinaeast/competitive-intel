-- Run this in the Supabase SQL editor if the config table doesn't exist yet

create table if not exists config (
  key   text primary key,
  value text not null
);

-- Add product_name column to competitors (run once — safe to re-run)
alter table competitors add column if not exists product_name text;

-- Enable realtime for all tables (if not already enabled)
alter publication supabase_realtime add table competitors;
alter publication supabase_realtime add table research_jobs;
alter publication supabase_realtime add table research_outputs;
