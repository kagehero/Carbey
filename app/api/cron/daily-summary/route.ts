import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { buildDashboardSummary, formatDailySummaryHtml } from '@/lib/dailySummary'
import { sendEmail, isSmtpConfigured } from '@/lib/sendEmail'

function verifyCron(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  return !!(secret && auth === `Bearer ${secret}`)
}

/**
 * Daily summary email (JST morning). Configure Vercel Cron + SMTP + DAILY_SUMMARY_TO.
 * GET with Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`
      : 'http://localhost:3000')

  if (!isSmtpConfigured()) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)',
    })
  }

  const recipients = (process.env.DAILY_SUMMARY_TO || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (recipients.length === 0) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'DAILY_SUMMARY_TO is empty',
    })
  }

  try {
    const supabase = createServiceRoleClient()
    const { data: inventories, error } = await supabase.from('inventories').select('*')

    if (error) throw error

    const summary = buildDashboardSummary((inventories || []) as any)
    const html = formatDailySummaryHtml(baseUrl, summary)
    const subject = `[Carbey] 日次サマリー — ${summary.dateLabel}`

    await sendEmail({
      to: recipients,
      subject,
      html,
    })

    return NextResponse.json({
      success: true,
      sent: true,
      recipients: recipients.length,
    })
  } catch (e: any) {
    console.error('daily-summary cron:', e)
    return NextResponse.json(
      { success: false, error: e?.message || 'send failed' },
      { status: 500 }
    )
  }
}
