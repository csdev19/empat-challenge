import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { tryCatch, isSuccess, type Result } from "@empat-challenge/domain/types";

/**
 * Check if an error is a network-related error (timeout, fetch failure, etc.)
 */
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError || // Network errors
    error instanceof DOMException || // AbortError
    (error as any)?.name === "AbortError" ||
    (error as any)?.message?.includes("fetch") ||
    (error as any)?.message?.includes("network") ||
    (error as any)?.message?.includes("aborted")
  );
}

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Use AbortController instead of AbortSignal.timeout() for Cloudflare Workers compatibility
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    // Use tryCatch to wrap the session fetch for better error handling
    const sessionResult: Result<
      Awaited<ReturnType<typeof authClient.getSession>>,
      Error
    > = await tryCatch(
      authClient.getSession({
        fetchOptions: {
          headers: request.headers,
          signal: controller.signal,
        },
      }),
    );

    // Always clear the timeout
    clearTimeout(timeoutId);

    // Handle the result using the Result pattern
    if (isSuccess(sessionResult)) {
      const session = sessionResult.data;

      if (!session?.data) {
        throw redirect({ to: "/auth/login" });
      }

      return next({
        context: { session: session.data },
      });
    }

    // Handle error from tryCatch
    const error = sessionResult.error;

    // Check if it's a network error
    if (isNetworkError(error)) {
      // Log the error for debugging
      console.error("⚠️ Auth middleware network error:", {
        name: (error as any)?.name,
        message: (error as any)?.message,
        // Don't log stack in production to avoid exposing internals
        ...(import.meta.env.DEV && { stack: (error as any)?.stack }),
      });

      // In production, allow graceful degradation - let client handle auth
      // This prevents users from being stuck if there's a temporary network issue
      if (import.meta.env.PROD) {
        // Allow request through - client-side will handle auth check
        return next({
          context: { session: undefined },
        });
      }

      // In development, redirect to help catch issues early
      throw redirect({ to: "/auth/login" });
    }

    // For any other error, log and redirect
    console.error("❌ Auth middleware error:", {
      name: (error as any)?.name,
      message: (error as any)?.message,
      ...(import.meta.env.DEV && { stack: (error as any)?.stack }),
    });
    throw redirect({ to: "/auth/login" });
  } catch (error) {
    // Always clear timeout in case of early return
    clearTimeout(timeoutId);

    // If it's already a redirect, rethrow it
    if (error instanceof Response || (error as any)?.redirect) {
      throw error;
    }

    // This shouldn't happen with tryCatch, but handle it just in case
    console.error("❌ Unexpected error in auth middleware:", {
      name: (error as any)?.name,
      message: (error as any)?.message,
      ...(import.meta.env.DEV && { stack: (error as any)?.stack }),
    });
    throw redirect({ to: "/auth/login" });
  }
});
