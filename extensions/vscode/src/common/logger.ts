import * as vscode from 'vscode';

/**
 * Thin wrapper around VS Code's LogOutputChannel.
 * Provides structured logging for the extension.
 */
export class Logger implements vscode.Disposable {
  private readonly channel: vscode.LogOutputChannel | undefined;

  constructor(name = 'CodeQL MCP') {
    // createOutputChannel with { log: true } returns a LogOutputChannel.
    // Wrap in try-catch for resilience in test environments.
    try {
      this.channel = vscode.window.createOutputChannel(name, { log: true }) as vscode.LogOutputChannel;
    } catch {
      // May fail in test environments
    }
  }

  info(message: string): void {
    this.channel?.info(message);
  }

  warn(message: string): void {
    this.channel?.warn(message);
  }

  error(message: string): void {
    this.channel?.error(message);
  }

  debug(message: string): void {
    this.channel?.debug(message);
  }

  show(): void {
    this.channel?.show();
  }

  dispose(): void {
    this.channel?.dispose();
  }
}
