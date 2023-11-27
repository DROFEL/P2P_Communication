import { z } from "zod";

const Example = z.object({
  action: z.enum([""]),
  payload: z.object({
    connectionType: z.enum(["CLIENT", "SERVER"]).optional(),
    ice: z.string().optional(),
  }),
});


const CONNECTION_REQUEST = z.object({
  action: z.enum(["CONNECTION_REQUEST"]),
  payload: z.object({
    name: z.string(),
  }),
});

const SDP_RESPONSE = z.object({
  action: z.enum(["SDP_RESPONSE"]),
  payload: z.object({
    target: z.string(),
    name: z.string(),
    offer: z.custom<RTCSessionDescriptionInit>(() => true),
  }),
});

const SERVER_INIT = z.object({
  action: z.enum(["SERVER_INIT"]),
  payload: z.object({
  }),
});



export const RequestZod = z.union([CONNECTION_REQUEST, SDP_RESPONSE, SERVER_INIT]);

export type Message = z.infer<typeof RequestZod>;
