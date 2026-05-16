import { Component, createRef } from 'react'

import type { ErrorInfo, ReactNode } from 'react'

import i18n from '../i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  private reloadRef = createRef<HTMLButtonElement>()

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack)
  }

  componentDidUpdate(_: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.reloadRef.current?.focus()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
          <h1 className="text-2xl font-semibold">{i18n.t('error.somethingWentWrong')}</h1>
          <p className="text-muted-foreground">{i18n.t('error.unexpectedError')}</p>
          <button
            ref={this.reloadRef}
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {i18n.t('error.reload')}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export class EditorErrorBoundary extends Component<Props, State> {
  private retryRef = createRef<HTMLButtonElement>()

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Editor error:', error, info.componentStack)
  }

  componentDidUpdate(_: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.retryRef.current?.focus()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
          <p className="text-lg font-medium">{i18n.t('error.editorCrashed')}</p>
          <button
            ref={this.retryRef}
            onClick={() => this.setState({ hasError: false })}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {i18n.t('error.retry')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
