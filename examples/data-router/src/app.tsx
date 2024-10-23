import * as React from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router-dom";
import {
  Await,
  createBrowserRouter,
  defer,
  Form,
  Link,
  Outlet,
  RouterProvider,
  useAsyncError,
  useAsyncValue,
  useFetcher,
  useLoaderData,
  useNavigation,
  useParams,
  useRouteError,
} from "react-router-dom";

import type { Todos } from "./todos";
import { addTodo, deleteTodo, getTodos } from "./todos";

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
        action: todosAction,
        loader: todosLoader,
        Component: TodosList,
        ErrorBoundary: TodosBoundary,
        children: [
          {
            path: ":id",
            loader: todoLoader,
            Component: Todo,
          },
        ],
      },
      {
        path: "deferred",
        loader: deferredLoader,
        Component: DeferredPage,
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

// Todos
export async function todosAction({ request }: ActionFunctionArgs) {
  await sleep();

  let formData = await request.formData();

  // Deletion via fetcher
  if (formData.get("action") === "delete") {
    let id = formData.get("todoId");
    if (typeof id === "string") {
      deleteTodo(id);
      return { ok: true };
    }
  }

  // Addition via <Form>
  let todo = formData.get("todo");
  if (typeof todo === "string") {
    addTodo(todo);
  }

  return new Response(null, {
    status: 302,
    headers: { Location: "/todos" },
  });
}

export async function todosLoader(): Promise<Todos> {
  await sleep();
  return getTodos();
}

export function TodosList() {
  let todos = useLoaderData() as Todos;
  let navigation = useNavigation();
  let formRef = React.useRef<HTMLFormElement>(null);

  // If we add and then we delete - this will keep isAdding=true until the
  // fetcher completes it's revalidation
  let [isAdding, setIsAdding] = React.useState(false);
  React.useEffect(() => {
    if (navigation.formData?.get("action") === "add") {
      setIsAdding(true);
    } else if (navigation.state === "idle") {
      setIsAdding(false);
      formRef.current?.reset();
    }
  }, [navigation]);

  return (
    <>
      <h2>Todos</h2>
      <p>
        This todo app uses a &lt;Form&gt; to submit new todos and a
        &lt;fetcher.form&gt; to delete todos. Click on a todo item to navigate
        to the /todos/:id route.
      </p>
      <ul>
        <li>
          <Link to="/todos/junk">
            Click this link to force an error in the loader
          </Link>
        </li>
        {Object.entries(todos).map(([id, todo]) => (
          <li key={id}>
            <TodoItem id={id} todo={todo} />
          </li>
        ))}
      </ul>
      <Form method="post" ref={formRef}>
        <input type="hidden" name="action" value="add" />
        <input name="todo"></input>
        <button type="submit" disabled={isAdding}>
          {isAdding ? "Adding..." : "Add"}
        </button>
      </Form>
      <Outlet />
    </>
  );
}

export function TodosBoundary() {
  let error = useRouteError() as Error;
  return (
    <>
      <h2>Error 💥</h2>
      <p>{error.message}</p>
    </>
  );
}

interface TodoItemProps {
  id: string;
  todo: string;
}

export function TodoItem({ id, todo }: TodoItemProps) {
  let fetcher = useFetcher();

  let isDeleting = fetcher.formData != null;
  return (
    <>
      <Link to={`/todos/${id}`}>{todo}</Link>
      &nbsp;
      <fetcher.Form method="post" style={{ display: "inline" }}>
        <input type="hidden" name="action" value="delete" />
        <button type="submit" name="todoId" value={id} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </fetcher.Form>
    </>
  );
}

// Todo
export async function todoLoader({
  params,
}: LoaderFunctionArgs): Promise<string> {
  await sleep();
  let todos = getTodos();
  if (!params.id) {
    throw new Error("Expected params.id");
  }
  let todo = todos[params.id];
  if (!todo) {
    throw new Error(`Uh oh, I couldn't find a todo with id "${params.id}"`);
  }
  return todo;
}

export function Todo() {
  let params = useParams();
  let todo = useLoaderData() as string;
  return (
    <>
      <h2>Nested Todo Route:</h2>
      <p>id: {params.id}</p>
      <p>todo: {todo}</p>
    </>
  );
}

// Deferred Data
interface DeferredRouteLoaderData {
  critical1: string;
  critical2: string;
  lazyResolved: Promise<string>;
  lazy1: Promise<string>;
  lazy2: Promise<string>;
  lazy3: Promise<string>;
  lazyError: Promise<string>;
}

const rand = () => Math.round(Math.random() * 100);
const resolve = (d: string, ms: number) =>
  new Promise((r) => setTimeout(() => r(`${d} - ${rand()}`), ms));
const reject = (d: Error | string, ms: number) =>
  new Promise((_, r) =>
    setTimeout(() => {
      if (d instanceof Error) {
        d.message += ` - ${rand()}`;
      } else {
        d += ` - ${rand()}`;
      }
      r(d);
    }, ms)
  );

export async function deferredLoader() {
  return defer({
    critical1: await resolve("Critical 1", 250),
    critical2: await resolve("Critical 2", 500),
    lazyResolved: Promise.resolve("Lazy Data immediately resolved - " + rand()),
    lazy1: resolve("Lazy 1", 1000),
    lazy2: resolve("Lazy 2", 1500),
    lazy3: resolve("Lazy 3", 2000),
    lazyError: reject(new Error("Kaboom!"), 2500),
  });
}

export function DeferredPage() {
  let data = useLoaderData() as DeferredRouteLoaderData;
  return (
    <div>
      {/* Critical data renders immediately */}
      <p>{data.critical1}</p>
      <p>{data.critical2}</p>

      {/* Pre-resolved deferred data never triggers the fallback */}
      <React.Suspense fallback={<p>should not see me!</p>}>
        <Await resolve={data.lazyResolved}>
          <RenderAwaitedData />
        </Await>
      </React.Suspense>

      {/* Deferred data can be rendered using a component + the useAsyncValue() hook */}
      <React.Suspense fallback={<p>loading 1...</p>}>
        <Await resolve={data.lazy1}>
          <RenderAwaitedData />
        </Await>
      </React.Suspense>

      <React.Suspense fallback={<p>loading 2...</p>}>
        <Await resolve={data.lazy2}>
          <RenderAwaitedData />
        </Await>
      </React.Suspense>

      {/* Or you can bypass the hook and use a render function */}
      <React.Suspense fallback={<p>loading 3...</p>}>
        <Await resolve={data.lazy3}>{(data: string) => <p>{data}</p>}</Await>
      </React.Suspense>

      {/* Deferred rejections render using the useAsyncError hook */}
      <React.Suspense fallback={<p>loading (error)...</p>}>
        <Await resolve={data.lazyError} errorElement={<RenderAwaitedError />}>
          <RenderAwaitedData />
        </Await>
      </React.Suspense>
    </div>
  );
}

function RenderAwaitedData() {
  let data = useAsyncValue() as string;
  return <p>{data}</p>;
}

function RenderAwaitedError() {
  let error = useAsyncError() as Error;
  return (
    <p style={{ color: "red" }}>
      Error (errorElement)!
      <br />
      {error.message} {error.stack}
    </p>
  );
}
