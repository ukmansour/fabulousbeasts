import { onRequest as __api___path___js_onRequest } from "C:\\Users\\tnara\\OneDrive\\바탕 화면\\유수언 위키\\fabulousbeasts\\functions\\api\\[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]