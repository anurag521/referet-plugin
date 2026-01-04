
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return await login(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return await login(request);
};

export default function Auth() {
  return <div className="">Loading...</div>;
}
