import { z } from "zod";

const Example = z.object({
  action: z.enum([""]),
  payload: z.object({
    connectionType: z.enum(["CLIENT", "SERVER"]).optional(),
    ice: z.string().optional(),
  }),
});

const InitLobby = z.object({
  action: z.enum(["INIT_LOBBY"]),
  payload: z.object({
    hostSDP: z.string(),
  }),
});

const NotifLobby = z.object({
  action: z.enum(["NOTIF_LOBBY"]),
  payload: z.object({
    id: z.string()
  }),
});

const ActionConnect = z.object({
  action: z.literal('CONNECT'),
  payload: z.object({
    lobbyId: z.string()
  }),
});

const IceResponse = z.object({
  action: z.literal('ICE_RESPONSE'),
  payload: z.object({
    offer: z.string()
  }),
});

export const RequestZod = z.union([ActionConnect, InitLobby, NotifLobby, IceResponse]);

export type Request = z.infer<typeof RequestZod>;
