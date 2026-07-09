-- 0007: Atomic interaction logging.
--
-- Creating an interaction, its activity log, and (optionally) the
-- auto follow-up task with its activity log must succeed or fail as
-- one unit — an interaction must never save while its follow-up task
-- silently fails. A plpgsql function runs in a single transaction,
-- which multiple PostgREST calls from the server cannot guarantee.
--
-- SECURITY INVOKER: the function runs as the calling user, so all
-- RLS policies (workspace isolation) still apply to every statement.
--
-- Optional parameters default to null so the generated TypeScript
-- types mark them optional.

drop function if exists public.create_interaction_with_follow_up(
  uuid, uuid, uuid, uuid, text, timestamptz, text, text, timestamptz, uuid, text
);

create or replace function public.create_interaction_with_follow_up(
  p_workspace_id uuid,
  p_interaction_at timestamptz,
  p_summary text,
  p_actor_name text,
  p_customer_id uuid default null,
  p_item_id uuid default null,
  p_type_option_id uuid default null,
  p_direction text default null,
  p_notes text default null,
  p_next_follow_up_at timestamptz default null,
  p_follow_up_assigned_to uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_interaction_id uuid;
  v_task_id uuid;
  v_customer_name text;
  v_type_label text;
  v_status_option_id uuid;
  v_priority_option_id uuid;
begin
  -- Look up display names for readable activity descriptions.
  if p_customer_id is not null then
    select name into v_customer_name from customers where id = p_customer_id;
  end if;
  if p_type_option_id is not null then
    select label into v_type_label from settings_options where id = p_type_option_id;
  end if;

  -- 1. The interaction itself.
  insert into interactions (
    workspace_id, customer_id, item_id, interaction_type_option_id,
    direction, interaction_at, summary, notes, next_follow_up_at, created_by
  ) values (
    p_workspace_id, p_customer_id, p_item_id, p_type_option_id,
    p_direction, p_interaction_at, p_summary, p_notes, p_next_follow_up_at, auth.uid()
  )
  returning id into v_interaction_id;

  -- 2. Activity log for the interaction.
  insert into activity_logs (workspace_id, actor_id, action, record_type, record_id, description)
  values (
    p_workspace_id, auth.uid(), 'interaction.created', 'interaction', v_interaction_id,
    p_actor_name || ' logged ' ||
      coalesce('a ' || v_type_label, 'an interaction') ||
      coalesce(' with ' || v_customer_name, '')
  );

  -- 3. Auto follow-up task, in the same transaction.
  if p_next_follow_up_at is not null then
    -- Workspace defaults: To Do status, Medium priority.
    select id into v_status_option_id from settings_options
      where workspace_id = p_workspace_id and option_type = 'task_status'
        and is_default = true and is_active = true
      limit 1;
    select id into v_priority_option_id from settings_options
      where workspace_id = p_workspace_id and option_type = 'task_priority'
        and is_default = true and is_active = true
      limit 1;

    insert into tasks (
      workspace_id, title, description, assigned_to, due_at,
      status_option_id, priority_option_id,
      customer_id, item_id, interaction_id, created_by
    ) values (
      p_workspace_id,
      'Follow up with ' || coalesce(v_customer_name, 'customer'),
      'Created from interaction: ' || p_summary,
      coalesce(p_follow_up_assigned_to, auth.uid()),
      p_next_follow_up_at,
      v_status_option_id,
      v_priority_option_id,
      p_customer_id, p_item_id, v_interaction_id, auth.uid()
    )
    returning id into v_task_id;

    -- 4. Activity log for the task.
    insert into activity_logs (workspace_id, actor_id, action, record_type, record_id, description)
    values (
      p_workspace_id, auth.uid(), 'task.created', 'task', v_task_id,
      'A follow-up task was created' || coalesce(' for ' || v_customer_name, '')
    );
  end if;

  return jsonb_build_object('interaction_id', v_interaction_id, 'task_id', v_task_id);
end;
$$;
