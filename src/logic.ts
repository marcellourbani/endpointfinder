import { Tsoa } from "@tsoa/runtime"
import { join } from "path"

interface ControllerMethod {
  httpMethod: string
  methodName: string
  path: string
}

export interface Controller {
  location: string
  className: string
  path: string
  methods: ControllerMethod[]
}

export interface Implementer {
  path: string[]
  file: string
  httpMethod: string
  className: string
  methodName: string
}

export const convertController = (controller: Tsoa.Controller): Controller => {
  const { location, name, path } = controller
  const methods = controller.methods.map((m) => {
    const { path, name: methodName, method: httpMethod } = m
    return { path, methodName, httpMethod }
  })
  return { location, className: name, path, methods }
}

export const convert = (metadata: Tsoa.Metadata) => {
  metadata.controllers.map(convertController)
}

export const extractPaths = (base: string, controller: Controller): Implementer[] => {
  return controller.methods.flatMap((met) => ({
    path: join(base, controller.path, met.path).replace(/^\//, "").split("/"),
    httpMethod: met.httpMethod,
    className: controller.className,
    methodName: met.methodName,
    file: controller.location
  }))
}

export const findInCode = (source: string, className: string, methodName: string) => {
  const findMethod = new RegExp(`^\\s*(?:public|private|protected)?\\s+${methodName}\\s*\\(`, "gm")
  const methodhits = [...source.matchAll(findMethod)]
  if (!methodhits?.length) return
  if (methodhits.length === 1) return methodhits[0].index
  const findClass = new RegExp(`^\\s*(?:export)?\\s+class\\s+${className}\\s*{`, "m")
  const classHit = source.match(findClass)?.index || 0
  const met = methodhits.find((m) => (m.index || 0) > classHit) || methodhits[0]
  return met.index
}

export const matchPath = (path: string, template: string[]) => {
  path = path.replace(/^\w+:\/\/[^\/]*/i, "").replace(/^\//, "")
  const parts = path.split("/")
  const addFirst = parts.length && parts.length === template.length - 1
  const relevantparts = addFirst ? [template[0], ...parts] : parts
  if (relevantparts.length === 0 || relevantparts.length !== template.length) return false
  for (let i = 0; i < template.length; i++) if (template[i] !== relevantparts[i] && !template[i].match(/^{\w+}$/)) return false
  return true
}
