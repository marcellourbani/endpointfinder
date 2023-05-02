import { Tsoa } from "@tsoa/runtime"
import { convertController, extractPaths, findCalls, findInCode, matchPath, splitCall } from "./logic"

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
  const extracted = extractPaths("ws1", "/api", controller)
  expect(extracted).toStrictEqual([
    {
      path: ["api", "foo"],
      workspace: "ws1",
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
  public async baz() {}
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
  expect(matchPath("/api/foo/bar/", template)).toBe(true)
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

test("simple split", () => {
  expect(splitCall("/")).toStrictEqual({
    method: "get",
    path: "",
    col: 0,
    length: 1
  })
  expect(splitCall("/foo/bar")).toStrictEqual({
    method: "get",
    path: "/foo/bar",
    col: 0,
    length: 8
  })
  expect(splitCall("POST /foo/bar")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 13
  })
  expect(splitCall("post /foo/bar?a=1 http 1.1")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 13
  })
})

test("slast at end", () => {
  expect(splitCall("http://foo/")).toStrictEqual({
    method: "get",
    path: "",
    col: 0,
    length: 11
  })
  expect(splitCall("http://foo.com/foo/bar/")).toStrictEqual({
    method: "get",
    path: "/foo/bar",
    col: 0,
    length: 23
  })
  expect(splitCall("POST http://foo.com/foo/bar/")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 28
  })
  expect(splitCall("post http://foo.com/foo/bar/?a=1 http 1.1")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 28
  })
})

test("protocol", () => {
  expect(splitCall("http://foo/")).toStrictEqual({
    method: "get",
    path: "",
    col: 0,
    length: 11
  })
  expect(splitCall("http://foo.com/foo/bar")).toStrictEqual({
    method: "get",
    path: "/foo/bar",
    col: 0,
    length: 22
  })
  expect(splitCall("POST http://foo.com/foo/bar")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 27
  })
  expect(splitCall("post http://foo.com/foo/bar?a=1 http 1.1")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 27
  })
})

test("variable", () => {
  expect(splitCall("{{whatever}}/")).toStrictEqual({
    method: "get",
    path: "",
    col: 0,
    length: 13
  })
  expect(splitCall("{{whatever}}/foo/bar")).toStrictEqual({
    method: "get",
    path: "/foo/bar",
    col: 0,
    length: 20
  })
  expect(splitCall("POST {{whatever}}/foo/bar")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 25
  })
  expect(splitCall("post {{whatever}}/foo/bar?a=1 http 1.1")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 25
  })
})

test("complete", () => {
  expect(splitCall("http://{{whatever}}/")).toStrictEqual({
    method: "get",
    path: "",
    col: 0,
    length: 20
  })
  expect(splitCall("http://{{whatever}}/foo/bar")).toStrictEqual({
    method: "get",
    path: "/foo/bar",
    col: 0,
    length: 27
  })
  expect(splitCall("POST http://{{whatever}}/foo/bar")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 32
  })
  expect(splitCall("post http://{{whatever}}/foo/bar?a=1 http 1.1")).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 32
  })
})

test("extract calls", () => {
  const source = `
POST http://{{whatever}}/foo/bar
POST http://{{whatever}}/foo/baz
###
GET {{whatever}}/bar/foo/
foo: 12

{
  a = 1
}
###
bar`
  const calls = findCalls(source)
  const expected = [
    {
      method: "post",
      path: "/foo/bar",
      line: 1
    },
    {
      method: "get",
      path: "/bar/foo",
      line: 4
    },
    {
      method: "get",
      path: "bar",
      line: 11
    }
  ]
  expect(calls).toStrictEqual(expected)
})

test("terminal split", () => {
  expect(splitCall("/", true)).toBeUndefined()
  expect(splitCall("GET /foo/bar", true)).toStrictEqual({
    method: "get",
    path: "/foo/bar",
    col: 0,
    length: 12
  })
  expect(splitCall("POST /foo/bar", true)).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 13
  })
  expect(splitCall("post /foo/bar?a=1 http 1.1", true)).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 0,
    length: 13
  })
  expect(splitCall("wherever happens to be post /foo/bar?a=1 http 1.1", true)).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 23,
    length: 13
  })
  expect(splitCall("even after another get or post post /foo/bar?a=1 http 1.1", true)).toStrictEqual({
    method: "post",
    path: "/foo/bar",
    col: 31,
    length: 13
  })
  expect(splitCall('2023-05-01T16:40:50.970Z info : "POST /login (1293ms)"', true)).toStrictEqual({
    method: "post",
    path: "/login",
    col: 33,
    length: 11
  })
  expect(splitCall('2023-05-01T16:40:50.970Z http foo"', true)).toBeUndefined()
  expect(splitCall('FooBar"', true)).toBeUndefined()
})
