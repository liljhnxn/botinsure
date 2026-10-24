import { http, createConfig } from "wagmi";
import { botchainMainnet } from "./chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [botchainMainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [botchainMainnet.id]: http("https://rpc.botchain.ai"),
  },
  ssr: true,
});
