import { MetadataGenerator } from "@tsoa/cli/dist/metadataGeneration/metadataGenerator"
import { Config } from "@tsoa/runtime"
import { join } from "path"
import { Uri, workspace } from "vscode"

const loadMetadata = (c: Config, path: string) => {
  const { entryFile, ignore, controllerPathGlobs, spec, compilerOptions = {} } = c
  const prevdir = process.cwd()
  try {
    process.chdir(path)
    return new MetadataGenerator(
      entryFile,
      compilerOptions as Record<string, string>,
      ignore,
      controllerPathGlobs,
      spec.rootSecurity
    ).Generate()
  } finally {
    console.log("cleanup")
    process.chdir(prevdir)
  }
}
const id = (x: unknown) => x
export class Searchable {
  constructor(private root: Uri) {}
  public async load() {
    const conf = this.root.with({ path: join(this.root.path, "tsoa.json") })
    const cs = await workspace.fs.stat(conf)
    const raw = await workspace.fs.readFile(conf)
    const config = JSON.parse(raw.toString())
    const meta = loadMetadata(config, this.root.fsPath)
  }
}

export class Main {
  private constructor() {}
  private static instance: Main
  private configs = new Map<string, Searchable>()
  public static async get(): Promise<Main> {
    if (!this.instance) {
      this.instance = new Main()
      await this.instance.initialize()
    }
    return this.instance
  }
  private async initialize() {
    for (const w of workspace.workspaceFolders || []) {
      try {
        const s = new Searchable(w.uri)
        await s.load()
        this.configs.set(w.name, s)
      } catch (error) {}
    }
  }
}
