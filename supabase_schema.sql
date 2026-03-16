-- Run this in the Supabase SQL editor if the config table doesn't exist yet

create table if not exists config (
  key   text primary key,
  value text not null
);

-- Enable realtime for all tables (if not already enabled)
alter publication supabase_realtime add table competitors;
alter publication supabase_realtime add table research_jobs;
alter publication supabase_realtime add table research_outputs;
