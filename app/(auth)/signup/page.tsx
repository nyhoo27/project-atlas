import type { Metadata } from "next"
import Link from "next/link"
import { SignupForm } from "@/components/forms/signup-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Sign up — Atlas",
}

export default function SignupPage() {
  // Creating a workspace requires the invite code in SIGNUP_INVITE_CODE.
  // With no code configured, signup is closed and the form isn't shown —
  // the server action enforces the same rule regardless.
  const signupOpen = Boolean(process.env.SIGNUP_INVITE_CODE)

  if (!signupOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signups are closed</CardTitle>
          <CardDescription>
            New workspaces can&apos;t be created right now. If your business
            already uses Atlas, ask the workspace owner to add you as a member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" render={<Link href="/login" />}>
            Back to log in
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <SignupForm />
}
