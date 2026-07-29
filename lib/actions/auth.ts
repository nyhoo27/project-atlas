"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loginSchema, signupSchema } from "@/lib/validators/auth"
import { slugify } from "@/lib/utils/slugify"

type ActionError = { error: string }

export async function login(input: unknown): Promise<ActionError | void> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Please check the form and try again." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: "Invalid email or password." }
  }

  redirect("/app/dashboard")
}

/**
 * Signup creates everything a new business needs in one server-side flow:
 *
 *   1. Auth user (profiles row is created by the handle_new_user trigger)
 *   2. Workspace
 *   3. Owner membership
 *   4. Default settings options (shared seeding function)
 *   5. Log the user in and send them to the dashboard
 *
 * Steps 2–4 need the service-role client: the brand-new user has no
 * workspace membership yet, so RLS would block these inserts. If any step
 * fails, everything created so far is rolled back — signup never leaves a
 * half-created workspace behind.
 */
export async function signup(input: unknown): Promise<ActionError | void> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Please check the form and try again." }
  }
  const { fullName, email, password, workspaceName, inviteCode } = parsed.data

  // Gate before anything is created. No configured code means signup is
  // closed entirely — failing shut is the safe default here.
  const expectedCode = process.env.SIGNUP_INVITE_CODE
  if (!expectedCode) {
    return {
      error: "Signups are currently closed. Ask the workspace owner to add you.",
    }
  }
  if (inviteCode !== expectedCode) {
    return { error: "That invite code is not valid." }
  }

  const admin = createAdminClient()

  // 1. Auth user. email_confirm skips the confirmation email — fine for an
  // internal business tool where the owner is creating their own account.
  const { data: created, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

  if (createUserError) {
    if (/already/i.test(createUserError.message)) {
      return {
        error: "An account with this email already exists. Try logging in instead.",
      }
    }
    console.error("Signup: user creation failed:", createUserError)
    return { error: "Account could not be created. Please try again." }
  }

  const userId = created.user.id
  let workspaceId: string | null = null

  try {
    // 2. Workspace. Random suffix keeps slugs unique without a retry loop.
    const slug = `${slugify(workspaceName)}-${crypto.randomUUID().slice(0, 8)}`
    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .insert({ name: workspaceName, slug, created_by: userId })
      .select("id")
      .single()
    if (workspaceError) throw workspaceError
    workspaceId = workspace.id

    // 3. Owner membership
    const { error: memberError } = await admin.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
    })
    if (memberError) throw memberError

    // 4. Default settings options
    const { error: seedError } = await admin.rpc(
      "seed_default_settings_options",
      { p_workspace_id: workspaceId }
    )
    if (seedError) throw seedError
  } catch (error) {
    // Roll back everything this flow created so the user can simply retry.
    console.error("Signup: workspace setup failed, rolling back:", error)
    if (workspaceId) {
      await admin.from("workspaces").delete().eq("id", workspaceId)
    }
    await admin.auth.admin.deleteUser(userId)
    return { error: "Workspace could not be created. Please try again." }
  }

  // 5. Log in (sets the session cookies on this response)
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) {
    console.error("Signup: auto-login failed:", signInError)
    return {
      error: "Your account was created, but automatic login failed. Please log in.",
    }
  }

  redirect("/app/dashboard")
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
