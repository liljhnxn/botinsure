import { http, createConfig } from "wagmi";
import { botchainTestnet, localhost } from "./chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [botchainTestnet, localhost],
  connectors: [
    injected(),
  ],
  transports: {
    [botchainTestnet.id]: http("https://rpc.bohr.life"),
    [localhost.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});
