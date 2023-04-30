import { Position, Selection, window } from "vscode"
import { workspace } from "vscode"
import { Config } from "@tsoa/runtime"
import { join } from "path"
import { MetadataGenerator } from "@tsoa/cli/dist/metadataGeneration/metadataGenerator"
const loadconfig = async (): Promise<Config> => {
  const root = workspace.workspaceFolders?.[0].uri
  if (!root) throw new Error("no config")

  const conf = root.with({ path: join(root.path, "tsoa.json") }) // TODO: parametrise
  const raw = await workspace.fs.readFile(conf)
  return JSON.parse(raw.toString()) // just trusting the file to be the right format
}

export const find = async (param: string) => {
  try {
    console.log(`finding ${param}`)
    const config = await loadconfig()
    const root = workspace.workspaceFolders?.[0].uri
    process.chdir(root!.fsPath)
    const generator = new MetadataGenerator(
      config.entryFile,
      (config.compilerOptions as Record<string, string>) || {},
      config.ignore,
      config.controllerPathGlobs,
      config.spec.rootSecurity
    )
    const md = generator.Generate()
    console.log(md)
    const path = join(root!.path, "/src/controllers/projectController.ts")
    //   const path = "/src/controllers/projectController.ts"
    const uri = root!.with({ path })
    const doc = await workspace.openTextDocument(uri)
    const pos = new Position(82, 0)
    const selection = new Selection(pos, pos)
    window.showTextDocument(doc, { selection })
  } catch (error) {
    window.showErrorMessage(`${error}`)
  }
}
