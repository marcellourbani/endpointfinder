import { CancellationToken, CodeLens, CodeLensProvider, Event, Position, Range, TextDocument, languages } from "vscode"
import { findCalls } from "./logic"

interface Hit {
  pos: Position
  text: string
}

class JumpLensProvider implements CodeLensProvider {
  onDidChangeCodeLenses?: Event<void> | undefined
  async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
    const calls = findCalls(document.getText())
    return calls.map(c => {
      const pos = new Position(c.line + 1, 1)
      return new CodeLens(new Range(pos, pos), {
        title: "jump to handler",
        command: "endpointfinder.find",
        arguments: [c.method, c.path]
      })
    })
  }
}

export const registerCodeLens = () => {
  const docSelector = { language: "http", scheme: "file" }
  return languages.registerCodeLensProvider(docSelector, new JumpLensProvider())
}
