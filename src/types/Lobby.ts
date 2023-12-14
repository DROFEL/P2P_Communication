import { WebSocket } from "ws";
import { z } from "zod";

export const LobbyZod = z.object({
//   id: z.string().refine((id) => {}),
  owner: z.custom<WebSocket>(),
  hostSDP: z.string().optional(),
});

export type Lobby = z.infer<typeof LobbyZod>;
