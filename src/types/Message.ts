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
    id: z.number(),
    initOffer: z.custom<RTCSessionDescriptionInit>(() => true),
  }),
});

const CONNECTION_RESPONSE = z.object({
  action: z.enum(["CONNECTION_RESPONSE"]),
  payload: z.object({
    name: z.string(),
    id: z.number(),
    target: z.number(),
    serverOffer: z.custom<RTCSessionDescriptionInit>(() => true),
  }),
});

const SDP_RESPONSE = z.object({
  action: z.enum(["SDP_RESPONSE"]),
  payload: z.object({
    target: z.number().positive(),
    id: z.number().positive(),
    offer: z.custom<RTCIceCandidateInit>(() => true),
  }),
});

const SERVER_INIT = z.object({
  action: z.enum(["SERVER_INIT"]),
  payload: z.object({
  }),
});

const SERVER_INIT_RESPONSE = z.object({
  action: z.enum(["SERVER_INIT_RESPONSE"]),
  payload: z.object({
    id: z.number().positive(),
  }),
});



export const RequestZod = z.union([CONNECTION_REQUEST, SDP_RESPONSE, SERVER_INIT, SERVER_INIT_RESPONSE, CONNECTION_RESPONSE]);

export type Message = z.infer<typeof RequestZod>;
