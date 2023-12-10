import { z } from "zod";

const Example = z.object({
  action: z.enum([""]),
  payload: z.object({
    connectionType: z.enum(["CLIENT", "SERVER"]).optional(),
    ice: z.string().optional(),
  }),
});


const RTCMessage = z.object({
  name: z.string(),
  message: z.string(),
  senderId: z.number(),
});



export const RTCMessageZod = z.union([RTCMessage, Example]);

export type RTCMessage = z.infer<typeof RTCMessage>;