import Link from 'next/link'
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              SendBandit
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm font-medium hover:underline">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Multi-Channel Marketing
              <br />
              <span className="text-primary">Automation Platform</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Engage your customers across WhatsApp, Telegram, Facebook, Instagram, Slack, and
              Discord with automated campaigns and flows.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Start Free Trial
                  </button>
                </SignUpButton>
                <Link
                  href="#features"
                  className="rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
                >
                  Learn More
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-muted/50 py-24">
          <div className="container">
            <h2 className="text-center text-3xl font-bold">Features</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Multi-Channel Messaging</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Send messages across WhatsApp, Telegram, Facebook Messenger, Instagram DM, Slack,
                  and Discord from a single platform.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Visual Flow Builder</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create automated marketing campaigns with our drag-and-drop flow builder. Set
                  triggers, conditions, and delays.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Analytics & Insights</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Track message delivery, read rates, and campaign performance with real-time
                  analytics dashboards.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Contact Management</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Import, segment, and manage your contacts. Tag contacts and create dynamic segments
                  for targeted campaigns.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Template Library</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create reusable message templates with variables. Support for text, images, videos,
                  and interactive buttons.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold">Team Collaboration</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Invite team members with role-based access control. Collaborate on campaigns with
                  your marketing team.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} SendBandit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
