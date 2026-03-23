import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

async function runSync(): Promise<NextResponse> {
  try {
    // Python scripts are now in web/python/
    const pythonDir = path.join(process.cwd(), 'python')
    
    console.log('Starting sync from:', pythonDir)
    
    // Use PYTHON_PATH env if set (avoids Turbopack resolving .venv symlink at build)
    const pythonCmd = process.env.PYTHON_PATH || path.join(process.cwd(), '.venv', 'bin', 'python')
    const { stdout, stderr } = await execAsync(
      pythonCmd + ' carbey.py sync',
      {
        cwd: pythonDir,
        timeout: 180000, // 3 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          PYTHONPATH: pythonDir,
        }
      }
    )

    const output = stdout + stderr
    console.log('Sync output:', output)

    // Check if sync was successful
    if (output.includes('✓ Success') || output.includes('vehicles synced')) {
      const vehicleCount = output.match(/(\d+) vehicles synced/)?.[1] || '0'
      
      return NextResponse.json({
        success: true,
        message: `同期完了: ${vehicleCount}台`,
        vehicleCount: parseInt(vehicleCount),
        output: output,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: '同期に失敗しました',
        error: output,
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Sync error:', error)
    
    // Handle timeout
    if (error.killed && error.signal === 'SIGTERM') {
      return NextResponse.json({
        success: false,
        message: '同期がタイムアウトしました（3分以上かかりました）',
        error: error.message,
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: false,
      message: '同期エラーが発生しました',
      error: error.message,
      stderr: error.stderr,
      stdout: error.stdout,
    }, { status: 500 })
  }
}

export async function POST(_request: NextRequest) {
  return runSync()
}

/** Vercel Cron用：9時・18時(JST)に1日2回実行。CRON_SECRETを設定必須 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSync()
}
