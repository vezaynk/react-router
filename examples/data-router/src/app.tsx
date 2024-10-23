import {
  createBrowserRouter,
  type RouteObject,
  RouterProvider,
} from "react-router";

import "./index.css";

function convert(m: any) {
  let { clientLoader, clientAction, default: defaultComponent, ...rest } = m;
  return {
    ...rest,
    // Our SPA is entirely client side so these are just normal `loader`/`action`
    // fields on the route.  We export them as `clientLoader`/`clientAction` from
    // our manual route module so they will work properly when we eventually adopt
    // the vite plugin, and then they can be migrated to server `loader`/`action`
    // when/if desired
    loader: clientLoader,
    action: clientAction,
    Component: defaultComponent,
  };
}

const routes: RouteObject[] = [
  {
    path: "/",
    // We include this in the critical bundle so it can render immediately
    // without needing to wait for the lazy() method to download the rest of
    // our layout implementation.  Once we move to the vite plugin and SPA mode,
    // this will be rendered in the initial HTML so it'll show up even faster 🚀
    HydrateFallback() {
      return <p>Performing initial data load</p>;
    },
    lazy: () => import("./routes/layout").then(convert),
    children: [
      {
        index: true,
        lazy: () => import("./routes/home").then(convert),
      },
      {
        path: "todos",
        lazy: () => import("./routes/todos").then(convert),
        children: [
          {
            path: ":id",
            lazy: () => import("./routes/todo").then(convert),
          },
        ],
      },
      {
        path: "deferred",
        lazy: () => import("./routes/defer").then(convert),
      },
    ],
  },
];

let router = createBrowserRouter(routes, {
  future: {
    v7_partialHydration: true,
    v7_normalizeFormMethod: true,
    v7_fetcherPersist: true,
    v7_relativeSplatPath: true,
    v7_skipActionErrorRevalidation: true,
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => router.dispose());
}

export default function App() {
  return <RouterProvider router={router} />;
}
