export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Atlas</h1>
          <p className="text-sm text-muted-foreground">
            Flexible sales logging for growing businesses
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
