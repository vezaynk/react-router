import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

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

let router = createBrowserRouter([
  {
    path: "/",
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
]);

if (import.meta.hot) {
  import.meta.hot.dispose(() => router.dispose());
}

export default function App() {
  return <RouterProvider router={router} fallbackElement={<Fallback />} />;
}

export function sleep(n: number = 500) {
  return new Promise((r) => setTimeout(r, n));
}

export function Fallback() {
  return <p>Performing initial data load</p>;
}
