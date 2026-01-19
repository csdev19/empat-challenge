import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, Outlet, redirect, useNavigate } from "@tanstack/react-router";

// TODO: I have to make this work eventually
// Get current user
// export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async (ctx) => {
//   const request = await getRequest();
//   const headers = await request.headers;

//   const sessionData = await authClient.getSession({
//     fetchOptions: {
//       headers: headers,
//       credentials: "include",
//     },
//   });

//   const { data, error } = sessionData;

//   if (error) {
//     console.log("error", error);
//     return null;
//   }

//   return {
//     user: data?.user,
//     session: data?.session,
//   };
// });

// const authMiddleware = createMiddleware().server(async ({ next, request }) => {
//   const session = await authClient.getSession({
//     fetchOptions: {
//       headers: request.headers,
//       credentials: "include",
//     },
//   });
//   console.log("session middleware ->", session);
//   return next({ context: { session } });
// });

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
  // server: {
  //   middleware: [authMiddleware],
  // },
  // beforeLoad: async () => {
  //   const session = await getCurrentUserFn();
  //   console.log("session before load ->", session);
  //   // console.log("session ->", session);

  //   // if (!session) {
  //   //   // throw redirect({ to: "/auth/login" });
  //   // }

  //   return { session };
  // },
});

function AuthenticatedLayout() {
  const { session, isPending } = useSession();

  if (!session && !isPending) {
    return <Navigate to="/auth/login" />;
  }

  return <Outlet />;
}
