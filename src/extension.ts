import * as vscode from "vscode"
import { find } from "./find"

export function activate(context: vscode.ExtensionContext) {
  console.log("endpointfinder is now active!")
  const pd = (d: vscode.Disposable) => context.subscriptions.push(d)

  pd(vscode.commands.registerCommand("endpointfinder.find", find))
}

// This method is called when your extension is deactivated
export function deactivate() {}
