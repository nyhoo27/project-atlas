-- Project Atlas V1 — indexes
-- Every business table is filtered by workspace_id on nearly every query,
-- so it always gets its own index. The rest support the specific list/
-- filter/search patterns used by the app (see docs/database-design.md).

-- customers
create index customers_workspace_id_idx on customers (workspace_id);
create index customers_workspace_id_name_idx on customers (workspace_id, name);
create index customers_workspace_id_phone_idx on customers (workspace_id, phone);
create index customers_workspace_id_archived_at_idx on customers (workspace_id, archived_at);

-- items
create index items_workspace_id_idx on items (workspace_id);
create index items_workspace_id_name_idx on items (workspace_id, name);
create index items_workspace_id_reference_code_idx on items (workspace_id, reference_code);
create index items_workspace_id_archived_at_idx on items (workspace_id, archived_at);

-- interactions
create index interactions_workspace_id_idx on interactions (workspace_id);
create index interactions_workspace_id_customer_id_idx on interactions (workspace_id, customer_id);
create index interactions_workspace_id_item_id_idx on interactions (workspace_id, item_id);
create index interactions_workspace_id_interaction_at_idx on interactions (workspace_id, interaction_at);

-- tasks
create index tasks_workspace_id_idx on tasks (workspace_id);
create index tasks_workspace_id_assigned_to_idx on tasks (workspace_id, assigned_to);
create index tasks_workspace_id_due_at_idx on tasks (workspace_id, due_at);
create index tasks_workspace_id_status_option_id_idx on tasks (workspace_id, status_option_id);

-- activity_logs
create index activity_logs_workspace_id_created_at_idx on activity_logs (workspace_id, created_at desc);

-- settings_options
create index settings_options_workspace_id_option_type_idx on settings_options (workspace_id, option_type);

-- tags
create index tags_workspace_id_idx on tags (workspace_id);

-- workspace_members (looked up on every request via is_workspace_member())
create index workspace_members_user_id_idx on workspace_members (user_id);
create index workspace_members_workspace_id_idx on workspace_members (workspace_id);

-- record_tags (looked up per-record to render tag badges)
create index record_tags_record_idx on record_tags (workspace_id, record_type, record_id);
