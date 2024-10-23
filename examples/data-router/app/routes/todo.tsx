import type * as Route from "./+types.todo";
import { useParams } from "react-router";
import sleep from "../sleep";
import { getTodos } from "../todos";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
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

export default function Todo({ loaderData: todo }: Route.ComponentProps) {
  let params = useParams();
  return (
    <>
      <h2>Nested Todo Route:</h2>
      <p>id: {params.id}</p>
      <p>todo: {todo}</p>
    </>
  );
}
