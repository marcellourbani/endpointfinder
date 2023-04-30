import { Tsoa } from "@tsoa/runtime"
import { convertController, extractPaths, findInCode, matchPath } from "./logic"

const baseMethod: Tsoa.Method = {
  parameters: [],
  extensions: [],
  responses: [],
  security: [],
  type: {
    dataType: "string"
  },
  isHidden: false,
  method: "get",
  name: "",
  path: ""
}

test("simple controller", () => {
  const controller: Tsoa.Controller = {
    location: "src/controllers/fooController.ts",
    name: "FooController",
    path: "",
    methods: [
      {
        ...baseMethod,
        method: "get",
        name: "getFoo",
        path: "foo"
      }
    ]
  }
  const result = convertController(controller)
  expect(result).toStrictEqual({
    location: "src/controllers/fooController.ts",
    className: "FooController",
    path: "",
    methods: [
      {
        httpMethod: "get",
        methodName: "getFoo",
        path: "foo"
      }
    ]
  })
})

test("path extraction", () => {
  const controller = {
    location: "src/controllers/fooController.ts",
    className: "FooController",
    path: "",
    methods: [
      {
        httpMethod: "get",
        methodName: "getFoo",
        path: "foo"
      }
    ]
  }
  const extracted = extractPaths("/api", controller)
  expect(extracted).toStrictEqual([
    {
      path: ["api", "foo"],
      className: "FooController",
      httpMethod: "get",
      file: "src/controllers/fooController.ts",
      methodName: "getFoo"
    }
  ])
})

test("find in file", () => {
  const source = `function
  baz(){}
  class Foo { aa = {
      bar: 2
    }
    private bar() {}
    baz() {}
  }
  class Bar {
  baz() {}
}`
  expect(findInCode(source, "Foo", "bar")).toBe(59)
  expect(findInCode(source, "Foo", "baz")).toBe(80)
  expect(findInCode(source, "Bar", "baz")).toBe(111)
})

test("match path empty", () => {
  expect(matchPath("", [])).toBe(false)
  expect(matchPath("/api/foo", [])).toBe(false)
})

test("match path simple", () => {
  const template = ["api", "foo", "bar"]
  expect(matchPath("/api/foo", template)).toBe(false)
  expect(matchPath("/foo", template)).toBe(false)
  expect(matchPath("/bar", template)).toBe(false)
  expect(matchPath("bar", template)).toBe(false)
  expect(matchPath("/api/foo/bar", template)).toBe(true)
  expect(matchPath("/foo/bar", template)).toBe(true)
  expect(matchPath("api/foo/bar", template)).toBe(true)
  expect(matchPath("foo/bar", template)).toBe(true)
})

test("match path variables", () => {
  const template = ["api", "foo", "{bar}"]
  expect(matchPath("/api/foo", template)).toBe(false)
  expect(matchPath("/api/foo/bar", template)).toBe(true)
  expect(matchPath("/api/foo/baz", template)).toBe(true)
  expect(matchPath("/api/foo/baz/foo", template)).toBe(false)
  expect(matchPath("foo/foo", template)).toBe(true)
})

test("match multiple path variables", () => {
  const template = ["api", "foo", "{bar}", "items", "{id}"]
  expect(matchPath("", template)).toBe(false)
  expect(matchPath("/api/foo", template)).toBe(false)
  expect(matchPath("/api/foo/baz/items/id1", template)).toBe(true)
  expect(matchPath("foo/foo/items/id2", template)).toBe(true)
  expect(matchPath("foo/baz/items/id1/a", template)).toBe(false)
})
