import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { requireActorMatches } from "@/server/api/actor";
import { getApiContext } from "@/server/api/context";
import { hash32Schema, stellarAddressSchema, stroopAmountSchema } from "@/server/api/domain";
import { submitPostage } from "@/server/api/postage-service";
import { parseJsonBody } from "@/server/api/request";
import { apiSuccess, handleApiRequest } from "@/server/api/response";

const submissionSchema = z.object({
  amount: stroopAmountSchema,
  messageId: hash32Schema,
  paymentHash: hash32Schema,
  recipient: stellarAddressSchema,
  sender: stellarAddressSchema,
});

export const Route = createFileRoute("/api/v1/postage/")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleApiRequest(request, async () => {
          const input = await parseJsonBody(request, submissionSchema);
          requireActorMatches(request, input.sender);
          const postage = await submitPostage(getApiContext().repository, input);
          return apiSuccess(request, postage, { status: 201 });
        }),
    },
  },
});
