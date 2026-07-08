import type { Metadata } from "next"
import { SignupForm } from "@/components/forms/signup-form"

export const metadata: Metadata = {
  title: "Sign up — Atlas",
}

export default function SignupPage() {
  return <SignupForm />
}
