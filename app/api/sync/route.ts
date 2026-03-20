import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    // Python scripts are now in web/python/
    const pythonDir = path.join(process.cwd(), 'python')
    
    console.log('Starting sync from:', pythonDir)
    
    // Execute the Python sync command with increased timeout
    const { stdout, stderr } = await execAsync(
      path.join(process.cwd(), '.venv', 'bin', 'python') + ' carbey.py sync',
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
