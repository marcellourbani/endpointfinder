import { Disposable, ExtensionContext, commands } from "vscode"
import { find } from "./find"
import { registerCodeLens } from "./lens"
import { registerLinkProvider } from "./linkprovider"

export function activate(context: ExtensionContext) {
  console.log("endpointfinder is now active!")
  const pd = (d: Disposable) => context.subscriptions.push(d)

  pd(commands.registerCommand("endpointfinder.find", find))
  pd(registerCodeLens())
  pd(registerLinkProvider())
}
