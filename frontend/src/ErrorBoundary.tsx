import React, { Component } from 'react'

export class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  override render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600 }}>
          <h2 style={{ color: '#b91c1c' }}>页面加载出错</h2>
          <pre style={{ background: '#fef2f2', padding: 12, overflow: 'auto', fontSize: 12 }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: '#666', fontSize: 14 }}>
            请打开开发者工具 (F12) 查看 Console 获取完整错误。
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
