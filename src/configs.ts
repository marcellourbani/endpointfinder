import { MetadataGenerator } from "@tsoa/cli/dist/metadataGeneration/metadataGenerator"
import { Config } from "@tsoa/runtime"
import { join } from "path"
import { FileSystemWatcher, Uri, workspace } from "vscode"
import { Implementer, convertController, extractPaths, matchPath } from "./logic"
import { CompilerOptions } from "typescript"
const loadMetadata = (c: Config, path: string) => {
  const { entryFile, ignore, controllerPathGlobs, spec, compilerOptions = {} } = c
  if (!entryFile) throw new Error(`No entryfile provided in tsoa.json`)
  const prevdir = process.cwd()
  try {
    process.chdir(path)
    const gen = new MetadataGenerator(
      entryFile,
      compilerOptions as CompilerOptions | undefined,
      ignore,
      controllerPathGlobs || ["**/*Controller.ts"],
      spec?.rootSecurity || []
    )
    return gen.Generate()
  } finally {
    console.log("cleanup")
    process.chdir(prevdir)
  }
}

const lazy =
  <T>(x: T) =>
  () =>
    x

const exists = (u: Uri) => workspace.fs.stat(u).then(lazy(true), lazy(false))
export class Searchable {
  dispose(): void {
    this.watchers.forEach(w => w.dispose())
  }
  private watchers: FileSystemWatcher[] = []
  private implementers: Implementer[] = []
  getImplementers() {
    return this.implementers
  }
  constructor(readonly root: Uri, readonly name: string) {}
  public async load() {
    const conf = this.root.with({ path: join(this.root.path, "tsoa.json") })
    const hasconf = await exists(conf)
    this.watchers.forEach(d => d.dispose())
    this.watchers = []
    const refresh = () => this.load()
    if (hasconf) {
      const raw = await workspace.fs.readFile(conf)
      const config: Config = JSON.parse(raw.toString())
      const meta = loadMetadata(config, this.root.fsPath)
      const base = config.spec.basePath || ""
      this.implementers = meta.controllers.flatMap(c => extractPaths(this.name, base, convertController(c)))
      config.controllerPathGlobs?.forEach(p => {
        const w = workspace.createFileSystemWatcher(p)
        this.watchers.push(w)
      })
    }
    this.watchers.push(workspace.createFileSystemWatcher(conf.toString()))
    this.watchers.forEach(w => {
      w.onDidChange(refresh)
      w.onDidCreate(refresh)
      w.onDidDelete(refresh)
    })
    return hasconf
  }
}

export class Main {
  private constructor() {}
  private static instance: Main | undefined
  private configs = new Map<string, Searchable>()
  private implementers() {
    return [...this.configs.values()].flatMap(c => c.getImplementers())
  }
  httpMethods() {
    return [...new Set(this.implementers().map(i => i.httpMethod))]
  }

  paths(method: string) {
    const implementers = this.implementers().filter(i => i.httpMethod === method)
    return implementers.map(i => i.path.join("/"))
  }

  find(method: string, path: string) {
    const implementers = this.implementers()
    return implementers.filter(i => i.httpMethod === method && matchPath(path, i.path))
  }

  implementerRoot(i: Implementer) {
    const config = this.configs.get(i.workspace)
    if (!config) throw new Error(`Workspace ${i.workspace} not found`)
    return config.root
  }

  public static async get(): Promise<Main> {
    if (!Main.instance) {
      Main.instance = new Main()
      await Main.instance.initialize()
    }
    return Main.instance
  }
  public static async clear() {
    if (Main.instance) [...Main.instance.configs.values()].forEach(i => i.dispose())
    Main.instance = undefined
  }
  private async initialize() {
    for (const w of workspace.workspaceFolders || []) {
      const s = new Searchable(w.uri, w.name)
      if (await s.load()) this.configs.set(w.name, s)
    }
  }
}
