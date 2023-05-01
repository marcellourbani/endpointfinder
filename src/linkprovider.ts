import { TerminalLink, TerminalLinkContext, TerminalLinkProvider, window } from "vscode"
import { SplitResult, splitCall } from "./logic"
import { findPath, loadEndpointsIfNeeded } from "./find"

class JumpLink extends TerminalLink {
  readonly method: string
  readonly path: string
  constructor(link: SplitResult) {
    super(link.col, link.length, "Jump to implementation")
    this.method = link.method
    this.path = link.path
  }
}

class JumpLinkProvider implements TerminalLinkProvider<JumpLink> {
  provideTerminalLinks(context: TerminalLinkContext) {
    const link = splitCall(context.line, true)
    if (link) {
      return [new JumpLink(link)]
    }
    return []
  }
  async handleTerminalLink(link: JumpLink) {
    try {
      const main = await loadEndpointsIfNeeded()
      await findPath(link.method, link.path, main)
    } catch (error) {
      window.showErrorMessage(`${error}`)
    }
  }
}

export const registerLinkProvider = () => window.registerTerminalLinkProvider(new JumpLinkProvider())
