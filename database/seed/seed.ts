/**
 * Dev seed script for Project Atlas.
 *
 * Auth users cannot be created with plain SQL, so this script uses the
 * Supabase Admin API (service role key) to create three dev users, a
 * workspace, memberships, seeded settings, and sample business data —
 * matching docs/product-requirements.md's V1 seed data spec.
 *
 * Usage: pnpm seed
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local (see .env.example). Safe to re-run — it skips seeding if
 * the "SLK Trading" workspace already exists.
 */

import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import path from "node:path"

config({ path: path.resolve(process.cwd(), ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  )
  process.exit(1)
}

const DEV_PASSWORD = "Password123!"

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** Creates a dev auth user, or looks up the existing one if already created. */
async function getOrCreateUser(email: string, fullName: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (!error) {
    return data.user.id
  }

  if (error.message.toLowerCase().includes("already been registered")) {
    const { data: existing, error: listError } = await admin.auth.admin.listUsers()
    if (listError) throw listError
    const found = existing.users.find((u) => u.email === email)
    if (!found) throw new Error(`Could not find existing user ${email}`)
    return found.id
  }

  throw error
}

async function main() {
  console.log("Seeding Project Atlas dev data...")

  const { data: existingWorkspace } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", "slk-trading")
    .maybeSingle()

  if (existingWorkspace) {
    console.log('Workspace "SLK Trading" already exists — skipping seed.')
    return
  }

  // 1. Dev users
  const ownerId = await getOrCreateUser("owner@slktrading.test", "Owner User")
  const managerId = await getOrCreateUser("manager@slktrading.test", "Manager User")
  const salespersonId = await getOrCreateUser(
    "salesperson@slktrading.test",
    "Salesperson User"
  )
  console.log("Created dev users (password: %s)", DEV_PASSWORD)

  // 2. Workspace
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({ name: "SLK Trading", slug: "slk-trading", created_by: ownerId })
    .select("id")
    .single()
  if (workspaceError) throw workspaceError
  const workspaceId = workspace.id
  console.log("Created workspace: SLK Trading")

  // 3. Memberships
  const { error: membersError } = await admin.from("workspace_members").insert([
    { workspace_id: workspaceId, user_id: ownerId, role: "owner" },
    { workspace_id: workspaceId, user_id: managerId, role: "manager" },
    { workspace_id: workspaceId, user_id: salespersonId, role: "salesperson" },
  ])
  if (membersError) throw membersError

  // 4. Default settings options (shared function used by signup flow too)
  const { error: seedSettingsError } = await admin.rpc(
    "seed_default_settings_options",
    { p_workspace_id: workspaceId }
  )
  if (seedSettingsError) throw seedSettingsError
  console.log("Seeded default settings options")

  // 5. Look up the option ids we need for sample records
  const { data: options, error: optionsError } = await admin
    .from("settings_options")
    .select("id, option_type, value")
    .eq("workspace_id", workspaceId)
  if (optionsError) throw optionsError

  const optionId = (optionType: string, value: string) => {
    const found = options.find(
      (o) => o.option_type === optionType && o.value === value
    )
    if (!found) throw new Error(`Missing seeded option ${optionType}/${value}`)
    return found.id
  }

  // 6. Customers
  const { data: customers, error: customersError } = await admin
    .from("customers")
    .insert([
      {
        workspace_id: workspaceId,
        name: "Ko Aung",
        phone: "09123456789",
        source_option_id: optionId("customer_source", "facebook"),
        notes: "Interested in high-value items",
        created_by: ownerId,
      },
      {
        workspace_id: workspaceId,
        name: "Ma Hnin",
        phone: "09987654321",
        source_option_id: optionId("customer_source", "referral"),
        notes: "Wants follow-up next week",
        created_by: ownerId,
      },
    ])
    .select("id, name")
  if (customersError) throw customersError
  const koAung = customers.find((c) => c.name === "Ko Aung")!
  const maHnin = customers.find((c) => c.name === "Ma Hnin")!
  console.log("Created customers: Ko Aung, Ma Hnin")

  // 7. Items
  const { data: items, error: itemsError } = await admin
    .from("items")
    .insert([
      {
        workspace_id: workspaceId,
        name: "Toyota Crown 2018",
        reference_code: "ITEM-001",
        category_option_id: optionId("item_category", "vehicle"),
        status_option_id: optionId("item_status", "available"),
        selling_price: 120000000,
        created_by: ownerId,
      },
      {
        workspace_id: workspaceId,
        name: "iPhone 15 Pro Max",
        reference_code: "ITEM-002",
        category_option_id: optionId("item_category", "phone"),
        status_option_id: optionId("item_status", "available"),
        selling_price: 4500000,
        created_by: ownerId,
      },
      {
        workspace_id: workspaceId,
        name: "Office Sofa Set",
        reference_code: "ITEM-003",
        category_option_id: optionId("item_category", "furniture"),
        status_option_id: optionId("item_status", "reserved"),
        selling_price: 1800000,
        created_by: ownerId,
      },
    ])
    .select("id, name")
  if (itemsError) throw itemsError
  const crown = items.find((i) => i.name === "Toyota Crown 2018")!
  const iphone = items.find((i) => i.name === "iPhone 15 Pro Max")!
  console.log("Created items: Toyota Crown 2018, iPhone 15 Pro Max, Office Sofa Set")

  // 8. Interactions
  const { data: interactions, error: interactionsError } = await admin
    .from("interactions")
    .insert([
      {
        workspace_id: workspaceId,
        customer_id: koAung.id,
        item_id: crown.id,
        interaction_type_option_id: optionId("interaction_type", "facebook_message"),
        direction: "inbound",
        summary: "Facebook Message with Ko Aung about Toyota Crown 2018",
        created_by: ownerId,
      },
      {
        workspace_id: workspaceId,
        customer_id: maHnin.id,
        item_id: iphone.id,
        interaction_type_option_id: optionId("interaction_type", "phone_call"),
        direction: "outbound",
        summary: "Phone Call with Ma Hnin about iPhone 15 Pro Max",
        created_by: ownerId,
      },
    ])
    .select("id, customer_id")
  if (interactionsError) throw interactionsError
  console.log("Created sample interactions")

  const koAungInteraction = interactions.find((i) => i.customer_id === koAung.id)!
  const maHninInteraction = interactions.find((i) => i.customer_id === maHnin.id)!

  // 9. Tasks
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const { error: tasksError } = await admin.from("tasks").insert([
    {
      workspace_id: workspaceId,
      title: "Follow up with Ko Aung",
      description: "Created from interaction: Facebook Message with Ko Aung about Toyota Crown 2018",
      customer_id: koAung.id,
      item_id: crown.id,
      interaction_id: koAungInteraction.id,
      assigned_to: ownerId,
      due_at: tomorrow.toISOString(),
      status_option_id: optionId("task_status", "to_do"),
      priority_option_id: optionId("task_priority", "medium"),
      created_by: ownerId,
    },
    {
      workspace_id: workspaceId,
      title: "Send details to Ma Hnin",
      description: "Created from interaction: Phone Call with Ma Hnin about iPhone 15 Pro Max",
      customer_id: maHnin.id,
      item_id: iphone.id,
      interaction_id: maHninInteraction.id,
      assigned_to: salespersonId,
      status_option_id: optionId("task_status", "to_do"),
      priority_option_id: optionId("task_priority", "medium"),
      created_by: ownerId,
    },
  ])
  if (tasksError) throw tasksError
  console.log("Created sample tasks")

  // 10. Tags
  const { error: tagsError } = await admin.from("tags").insert([
    { workspace_id: workspaceId, name: "VIP" },
    { workspace_id: workspaceId, name: "Hot Lead" },
    { workspace_id: workspaceId, name: "Referral" },
    { workspace_id: workspaceId, name: "Finance" },
    { workspace_id: workspaceId, name: "Urgent" },
  ])
  if (tagsError) throw tagsError
  console.log("Created sample tags")

  console.log("\nSeed complete. Dev logins (password: %s):", DEV_PASSWORD)
  console.log("  Owner:       owner@slktrading.test")
  console.log("  Manager:     manager@slktrading.test")
  console.log("  Salesperson: salesperson@slktrading.test")
}

main().catch((error) => {
  console.error("Seed failed:", error)
  process.exit(1)
})
