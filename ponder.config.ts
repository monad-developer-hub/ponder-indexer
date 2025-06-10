import { createConfig } from "ponder";
import { ExampleContractAbi } from "./abis/ExampleContractAbi";
import { createPublicClient, http } from 'viem';

// Function to get the latest block number
async function getLatestBlockNumber(rpcUrl: string): Promise<number> {
  const client = createPublicClient({
    transport: http(rpcUrl)
  });
  
  const blockNumber = await client.getBlockNumber();
  return Number(blockNumber);
}

// Get the RPC URL from environment or use default
const rpcUrl = process.env.PONDER_RPC_URL_1 || "https://testnet-rpc.monad.xyz";

// Get start block from environment or fetch latest
const startBlock = process.env.PONDER_START_BLOCK 
  ? parseInt(process.env.PONDER_START_BLOCK) 
  : await getLatestBlockNumber(rpcUrl);

export default createConfig({
  chains: {
    monad_testnet: {
      id: 10143,
      rpc: rpcUrl,
    },
  },
  contracts: {
  },
  blocks: {
    monadBlocks: {
      chain: "monad_testnet",
      startBlock: startBlock,
      interval: 1,
    },
  },
});
