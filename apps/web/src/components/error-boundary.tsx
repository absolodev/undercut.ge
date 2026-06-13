"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught an uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] w-full p-6 bg-red-950/20 border border-red-500/20 rounded-lg text-center font-mono">
          <span className="text-2xl mb-2">⚠️</span>
          <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-2">
            Component Render Failed
          </h2>
          <p className="text-xs text-white/50 max-w-md break-words mb-4">
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-200 text-xs font-semibold rounded uppercase tracking-wider transition-colors duration-150"
          >
            Retry Render
          </button>
        </div>
      );
    }

    return this.props.children;
  }

  private get fallback() {
    return this.props.fallback;
  }
}
