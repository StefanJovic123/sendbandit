import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import {
  corsMiddleware,
  loggerMiddleware,
  errorHandler,
  authMiddleware,
  orgContextMiddleware,
  defaultRateLimit,
  webhookCorsMiddleware,
  notFound,
} from '@sendbandit/middleware'
import { generateId, getPeriod } from '@sendbandit/shared/utils'
import { PLAN_LIMITS } from '@sendbandit/shared/constants'
import type { HonoEnv } from '@sendbandit/shared/types'

const app = new Hono<HonoEnv>()

// Helper to create Supabase client
function getSupabase(env: HonoEnv['Bindings']) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Stripe webhook (no auth)
app.post('/webhooks/stripe', webhookCorsMiddleware, async (c) => {
  const body = await c.req.text()
  const supabase = getSupabase(c.env)

  try {
    const event = JSON.parse(body)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', subscription.metadata?.organization_id)
          .single()

        if (org) {
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          const planId = subscription.items?.data?.[0]?.price?.metadata?.plan || 'starter'

          if (existing) {
            await supabase
              .from('subscriptions')
              .update({
                status: subscription.status === 'active' ? 'active' : 'past_due',
                plan: planId,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
          } else {
            await supabase.from('subscriptions').insert({
              id: generateId('subscription'),
              organization_id: org.id,
              stripe_customer_id: subscription.customer,
              stripe_subscription_id: subscription.id,
              plan: planId,
              status: 'active',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: false,
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('organization_id')
          .eq('stripe_customer_id', invoice.customer)
          .single()

        if (sub) {
          await supabase.from('invoices').insert({
            id: generateId('invoice'),
            organization_id: sub.organization_id,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single()

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('id', sub.id)
        }
        break
      }
    }

    return c.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return c.json({ error: 'Webhook processing failed' }, 500)
  }
})

// Health check (before auth)
app.get('/health', (c) => c.json({ status: 'ok', service: 'api-billing' }))

// Protected routes
app.use('*', loggerMiddleware)
app.use('*', corsMiddleware)
app.use('*', defaultRateLimit)
app.use('*', authMiddleware)
app.use('*', orgContextMiddleware)
app.onError(errorHandler)

// Get current subscription
app.get('/subscription', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', org.id)
    .single()

  if (!subscription) {
    return c.json({
      data: {
        plan: 'free',
        status: 'active',
        limits: PLAN_LIMITS.free,
      },
    })
  }

  const limits = PLAN_LIMITS[subscription.plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free

  return c.json({
    data: {
      ...subscription,
      limits,
    },
  })
})

// Get usage for current period
app.get('/usage', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const period = getPeriod()

  let { data: usage } = await supabase
    .from('usage_records')
    .select('*')
    .eq('organization_id', org.id)
    .eq('period', period)
    .single()

  if (!usage) {
    // Create new usage record
    const id = generateId('event')
    await supabase.from('usage_records').insert({
      id,
      organization_id: org.id,
      period,
      messages_count: 0,
      contacts_count: 0,
      campaigns_count: 0,
    })
    usage = {
      id,
      organization_id: org.id,
      period,
      messages_count: 0,
      contacts_count: 0,
      campaigns_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // Get subscription to determine limits
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('organization_id', org.id)
    .single()

  const plan = subscription?.plan || 'free'
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free

  return c.json({
    data: {
      period,
      usage: {
        messages: usage.messages_count,
        contacts: usage.contacts_count,
        campaigns: usage.campaigns_count,
      },
      limits: {
        messages: limits.messagesPerMonth,
        contacts: limits.contacts,
        campaigns: limits.campaigns,
      },
      percentages: {
        messages:
          limits.messagesPerMonth === -1
            ? 0
            : Math.round((usage.messages_count / limits.messagesPerMonth) * 100),
        contacts:
          limits.contacts === -1 ? 0 : Math.round((usage.contacts_count / limits.contacts) * 100),
        campaigns:
          limits.campaigns === -1
            ? 0
            : Math.round((usage.campaigns_count / limits.campaigns) * 100),
      },
    },
  })
})

// Get invoices
app.get('/invoices', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)

  const { data: invoicesList } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(24)

  return c.json({ data: invoicesList || [] })
})

// Create checkout session (for upgrading)
app.post('/checkout', async (c) => {
  const org = c.get('org')!
  const body = await c.req.json()
  const { plan } = body

  if (!plan || !['starter', 'professional', 'enterprise'].includes(plan)) {
    return c.json({ error: { code: 'INVALID_PLAN', message: 'Invalid plan' } }, 400)
  }

  return c.json({
    data: {
      url: `https://checkout.stripe.com/placeholder?plan=${plan}&org=${org.id}`,
    },
  })
})

// Create billing portal session
app.post('/portal', async (c) => {
  const org = c.get('org')!
  const supabase = getSupabase(c.env)
  const body = await c.req.json()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', org.id)
    .single()

  if (!subscription) {
    return c.json({ error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription' } }, 400)
  }

  return c.json({
    data: {
      url: `https://billing.stripe.com/placeholder?customer=${subscription.stripe_customer_id}`,
    },
  })
})

export default app
