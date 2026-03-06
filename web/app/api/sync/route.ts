import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST(request: NextRequest) {
  try {
    // Execute the Python sync command
    const process = exec(
      'python carbey.py sync',
      {
        cwd: 'D:\\Project\\Carbey',
      }
    )

    let output = ''
    let error = ''

    // Collect output
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
    }

    if (process.stderr) {
      process.stderr.on('data', (data) => {
        error += data.toString()
      })
    }

    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill()
        reject(new Error('Sync timeout (2 minutes)'))
      }, 120000) // 2 minutes

      process.on('exit', (code) => {
        clearTimeout(timeout)
        resolve(code || 0)
      })

      process.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    // Check if sync was successful
    if (exitCode === 0 && output.includes('✓ Success')) {
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
        error: error || output,
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({
      success: false,
      message: '同期エラーが発生しました',
      error: error.message,
    }, { status: 500 })
  }
}
