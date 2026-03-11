import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Running migration: add image columns...')

    // Add columns
    const { error: alterError } = await (supabase as any)
      .from('inventories')
      .select('main_image_url')
      .limit(1)

    // If column doesn't exist, we need to add it via SQL
    // Since Supabase client doesn't support ALTER TABLE directly,
    // we'll use the SQL editor or manual approach

    // For now, let's just verify the columns exist
    const { data, error } = await supabase
      .from('inventories')
      .select('id, main_image_url, image_urls, images_scraped_at')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'Columns do not exist yet. Please run the SQL migration manually in Supabase Dashboard.',
        sql: `
-- Copy and paste this into Supabase SQL Editor:

alter table public.inventories 
add column if not exists main_image_url text,
add column if not exists image_urls text[],
add column if not exists images_scraped_at timestamptz;

create index if not exists idx_inventories_main_image on public.inventories(main_image_url);
        `,
        error: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Image columns already exist!',
      data
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
