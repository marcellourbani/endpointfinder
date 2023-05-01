import { Position, ProgressLocation, QuickPickItem, Selection, window } from "vscode"
import { workspace } from "vscode"
import { Config } from "@tsoa/runtime"
import { join } from "path"
import { MetadataGenerator } from "@tsoa/cli/dist/metadataGeneration/metadataGenerator"
import { Main } from "./configs"
import { Implementer, findInCode } from "./logic"
const loadconfig = async (): Promise<Config> => {
  const root = workspace.workspaceFolders?.[0].uri
  if (!root) throw new Error("no config")

  const conf = root.with({ path: join(root.path, "tsoa.json") }) // TODO: parametrise
  const raw = await workspace.fs.readFile(conf)
  return JSON.parse(raw.toString()) // just trusting the file to be the right format
}

const pickMethod = async (main: Main): Promise<string | undefined> => {
  const methods = main.httpMethods()
  return window.showQuickPick(methods, { placeHolder: "HTTP method" })
}

const pickUrl = async (main: Main, method: string): Promise<string | undefined> => {
  const paths = main.paths(method)
  const manual = "Enter manually"
  const selected = await window.showQuickPick([manual, ...paths], { placeHolder: "endpoint" })
  if (selected === manual) return window.showInputBox({ placeHolder: "endpoint" })
  return selected
}
const pickImplementer = async (matches: Implementer[]) => {
  if (matches.length === 1) return matches[0]
  const items = matches.map(m => ({
    label: `${m.httpMethod} ${m.path.join("/")}`,
    detail: `${m.className} ${m.methodName} in ${m.file.replace(/.*\//, "")}`,
    payload: m
  }))
  const picked = await window.showQuickPick(items)
  return picked?.payload
}

const openMatch = async (main: Main, implementer: Implementer) => {
  const root = main.implementerRoot(implementer)
  const path = join(root!.path, implementer.file)
  const uri = root!.with({ path })
  const doc = await workspace.openTextDocument(uri)
  const source = doc.getText()
  const offset = findInCode(source, implementer.className, implementer.methodName)
  const pos = doc.positionAt(offset || 0)
  const selection = new Selection(pos, pos)
  window.showTextDocument(doc, { selection })
}

export const loadEndpointsIfNeeded = () =>
  window.withProgress({ location: ProgressLocation.Window, title: "initializing endpoint list" }, () => Main.get())

export const findPath = async (method: string, path: string, main: Main) => {
  console.log(`jumping to ${method} ${path}`)
  const matches = main.find(method, path)
  if (!matches.length) {
    window.showInformationMessage(`Endpoint ${method} ${path} not found`)
  } else {
    const implementer = await pickImplementer(matches)
    if (implementer) openMatch(main, implementer)
  }
}

export const find = async (method?: string, path?: string) => {
  try {
    const main = await loadEndpointsIfNeeded()
    method = method || (await pickMethod(main))
    if (!method) return
    path = path || (await pickUrl(main, method))
    if (!path) return
    findPath(method, path, main)
  } catch (error) {
    window.showErrorMessage(`${error}`)
  }
}
export const reload = () => {
  Main.clear()
  window.withProgress({ location: ProgressLocation.Window, title: "initializing endpoint list" }, () => Main.get())
}
