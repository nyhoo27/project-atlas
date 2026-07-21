"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import {
  addMember,
  updateMemberRole,
  setMemberStatus,
  removeMember,
} from "@/lib/actions/members"
import {
  MEMBER_ROLES,
  ROLE_LABELS,
  type MemberRole,
} from "@/lib/validators/members"
import type { ManagedMember } from "@/lib/queries/members"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { NativeSelect } from "@/components/ui/native-select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Owner-only teammate management: add a member (creates their login +
 * membership), change roles, suspend/reactivate, and remove.
 */
export function MembersManager({
  members,
  currentUserId,
}: {
  members: ManagedMember[]
  currentUserId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<ManagedMember | null>(null)

  // Add-member form state.
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("salesperson")
  const [password, setPassword] = useState("")

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await addMember({ fullName, email, role, password })
    setBusy(false)
    if (result.ok) {
      toast.success(result.message ?? "Member added.")
      setFullName("")
      setEmail("")
      setRole("salesperson")
      setPassword("")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRoleChange(member: ManagedMember, newRole: MemberRole) {
    setBusy(true)
    const result = await updateMemberRole(member.userId, { role: newRole })
    setBusy(false)
    if (result.ok) {
      toast.success(`${member.fullName} is now ${ROLE_LABELS[newRole]}.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleStatus(member: ManagedMember, active: boolean) {
    setBusy(true)
    const result = await setMemberStatus(member.userId, active)
    setBusy(false)
    if (result.ok) {
      toast.success(`${member.fullName} ${active ? "reactivated" : "suspended"}.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRemove() {
    if (!removing) return
    setBusy(true)
    const result = await removeMember(removing.userId)
    setBusy(false)
    setRemoving(null)
    if (result.ok) {
      toast.success(`${removing.fullName} removed from the workspace.`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Add member */}
      <form
        onSubmit={handleAdd}
        className="max-w-xl space-y-4 rounded-md border p-4"
      >
        <div>
          <p className="text-sm font-medium">Add a teammate</p>
          <p className="text-sm text-muted-foreground">
            Creates their login. Share the email and initial password with
            them — they can change the password after logging in.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="member-name">Full name</Label>
            <Input
              id="member-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Mg Mg"
              disabled={busy}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@business.com"
              disabled={busy}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-role">Role</Label>
            <NativeSelect
              id="member-role"
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
              disabled={busy}
            >
              {MEMBER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="member-password">Initial password</Label>
            <Input
              id="member-password"
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              disabled={busy}
            />
          </div>
        </div>
        <Button type="submit" disabled={busy}>
          <Plus className="size-4" />
          Add Member
        </Button>
      </form>

      {/* Member list */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId
              return (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">
                    {member.fullName}
                    {isSelf && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      value={member.role}
                      className="h-8 w-36"
                      disabled={busy || isSelf}
                      onChange={(event) =>
                        handleRoleChange(member, event.target.value as MemberRole)
                      }
                    >
                      {MEMBER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    {member.status === "active" ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Suspended</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isSelf && (
                      <div className="flex items-center justify-end gap-1">
                        {member.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => handleStatus(member, false)}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => handleStatus(member, true)}
                          >
                            Reactivate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          disabled={busy}
                          onClick={() => setRemoving(member)}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Remove {member.fullName}</span>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              &ldquo;{removing?.fullName}&rdquo; will lose access to this
              workspace. Their login account and any other workspaces are not
              affected. You can add them again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoving(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={busy}>
              {busy ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
