import { z } from "zod";

const Example = z.object({
  action: z.enum([""]),
  payload: z.object({
    connectionType: z.enum(["CLIENT", "SERVER"]).optional(),
    ice: z.string().optional(),
  }),
});


const Message = z.object({
  message: z.string(),
});



export const RTCMessageZod = z.union([Message, Example]);

export type RTCMessage = z.infer<typeof RTCMessageZod>;