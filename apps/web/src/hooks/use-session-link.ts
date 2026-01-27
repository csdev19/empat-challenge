import { useQuery } from "@tanstack/react-query";
import { clientTreaty } from "@/lib/client-treaty";
import { getErrorMessage } from "@/lib/error";
import type { SessionLinkValidationResponse } from "@empat-challenge/domain/schemas";

// Re-export types from domain package
export type { SessionLinkValidationResponse };

// Query keys
const sessionLinkKeys = {
  all: ["sessionLink"] as const,
  validation: (linkToken: string) => [...sessionLinkKeys.all, "validation", linkToken] as const,
};

// Validate session link
export function useValidateSessionLink(linkToken: string) {
  return useQuery({
    queryKey: sessionLinkKeys.validation(linkToken),
    queryFn: async (): Promise<SessionLinkValidationResponse> => {
      const result = await clientTreaty.api.v1["session-link"]
        ["validate"]({
          linkToken,
        })
        .get();

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }

      if (!result.data) {
        throw new Error("No data returned from server");
      }

      const { error, data } = result.data;
      if (error) {
        throw new Error(error?.message || "An error occurred");
      }

      return data;
    },
    enabled: !!linkToken,
    retry: false, // Don't retry on validation failures
  });
}
