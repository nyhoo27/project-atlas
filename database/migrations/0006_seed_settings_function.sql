-- Project Atlas V1 — default settings_options seeding
--
-- Single shared function so the signup flow and the dev seed script never
-- drift out of sync on what "default settings" means. SECURITY DEFINER so
-- it can insert rows even when called immediately after workspace
-- creation, before the caller necessarily has a workspace_members row yet.
--
-- Safe to call more than once for the same workspace: it relies on the
-- unique (workspace_id, option_type, value) constraint and does nothing
-- on conflict.

create or replace function public.seed_default_settings_options(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into settings_options (workspace_id, option_type, label, value, sort_order, is_default)
  values
    -- item_category
    (p_workspace_id, 'item_category', 'Vehicle',   'vehicle',   10, false),
    (p_workspace_id, 'item_category', 'Phone',     'phone',     20, false),
    (p_workspace_id, 'item_category', 'Property',  'property',  30, false),
    (p_workspace_id, 'item_category', 'Furniture', 'furniture', 40, false),
    (p_workspace_id, 'item_category', 'Equipment', 'equipment', 50, false),
    (p_workspace_id, 'item_category', 'Watch',     'watch',     60, false),
    (p_workspace_id, 'item_category', 'Machinery', 'machinery', 70, false),
    (p_workspace_id, 'item_category', 'Other',     'other',     80, false),

    -- item_status
    (p_workspace_id, 'item_status', 'Available',   'available',   10, true),
    (p_workspace_id, 'item_status', 'Reserved',    'reserved',    20, false),
    (p_workspace_id, 'item_status', 'Sold',        'sold',        30, false),
    (p_workspace_id, 'item_status', 'Unavailable', 'unavailable', 40, false),
    (p_workspace_id, 'item_status', 'Archived',    'archived',    50, false),

    -- customer_source
    (p_workspace_id, 'customer_source', 'Facebook',    'facebook',    10, false),
    (p_workspace_id, 'customer_source', 'TikTok',      'tiktok',      20, false),
    (p_workspace_id, 'customer_source', 'Walk-in',     'walk_in',     30, false),
    (p_workspace_id, 'customer_source', 'Referral',    'referral',    40, false),
    (p_workspace_id, 'customer_source', 'Website',     'website',     50, false),
    (p_workspace_id, 'customer_source', 'Phone Call',  'phone_call',  60, false),
    (p_workspace_id, 'customer_source', 'WhatsApp',    'whatsapp',    70, false),
    (p_workspace_id, 'customer_source', 'Other',       'other',       80, false),

    -- interaction_type
    (p_workspace_id, 'interaction_type', 'Phone Call',          'phone_call',          10, false),
    (p_workspace_id, 'interaction_type', 'WhatsApp Message',    'whatsapp_message',    20, false),
    (p_workspace_id, 'interaction_type', 'Facebook Message',    'facebook_message',    30, false),
    (p_workspace_id, 'interaction_type', 'Email',               'email',               40, false),
    (p_workspace_id, 'interaction_type', 'Walk-in',             'walk_in',             50, false),
    (p_workspace_id, 'interaction_type', 'Meeting',             'meeting',             60, false),
    (p_workspace_id, 'interaction_type', 'Demo / Inspection',   'demo_inspection',     70, false),
    (p_workspace_id, 'interaction_type', 'Negotiation',         'negotiation',         80, false),
    (p_workspace_id, 'interaction_type', 'Complaint',           'complaint',           90, false),
    (p_workspace_id, 'interaction_type', 'Follow-up',           'follow_up',          100, false),
    (p_workspace_id, 'interaction_type', 'Other',               'other',              110, false),

    -- task_status
    (p_workspace_id, 'task_status', 'To Do',       'to_do',       10, true),
    (p_workspace_id, 'task_status', 'In Progress', 'in_progress', 20, false),
    (p_workspace_id, 'task_status', 'Done',        'done',        30, false),
    (p_workspace_id, 'task_status', 'Cancelled',   'cancelled',   40, false),

    -- task_priority
    (p_workspace_id, 'task_priority', 'Low',    'low',    10, false),
    (p_workspace_id, 'task_priority', 'Medium', 'medium', 20, true),
    (p_workspace_id, 'task_priority', 'High',   'high',   30, false),
    (p_workspace_id, 'task_priority', 'Urgent', 'urgent', 40, false)
  on conflict (workspace_id, option_type, value) do nothing;
end;
$$;

comment on function public.seed_default_settings_options(uuid) is 'Inserts the default settings_options rows for a newly created workspace. Called by the signup flow and by database/seed/seed.ts. Idempotent.';
