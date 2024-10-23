import { useLoaderData } from "react-router-dom";

function sleep(n: number = 500) {
  return new Promise((r) => setTimeout(r, n));
}

interface HomeLoaderData {
  date: string;
}

export async function clientLoader(): Promise<HomeLoaderData> {
  await sleep();
  return {
    date: new Date().toISOString(),
  };
}

export default function Home() {
  let data = useLoaderData() as HomeLoaderData;
  return (
    <>
      <h2>Home</h2>
      <p>Date from loader: {data.date}</p>
    </>
  );
}
