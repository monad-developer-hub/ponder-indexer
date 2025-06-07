import { createConfig } from "ponder";

import { ExampleContractAbi } from "./abis/ExampleContractAbi";

export default createConfig({
  chains: {
    monad_testnet: {
      id: 10143,
      rpc: process.env.PONDER_RPC_URL_1 || "https://testnet-rpc.monad.xyz",
    },
  },
  contracts: {
  },
  blocks: {
    monadBlocks: {
      chain: "monad_testnet",
      startBlock: 20489449, // Start from a known existing block
      interval: 1,
    },
  },
});
