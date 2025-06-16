import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

// TPS calculation configuration
const TPS_WINDOW_BLOCKS = parseInt(process.env.TPS_WINDOW_BLOCKS || '100');

// Block tracking for TPS calculation
interface BlockInfo {
  number: bigint;
  timestamp: bigint;
  transactionCount: number;
}

const recentBlocks: BlockInfo[] = [];

// Function to calculate TPS
function calculateTPS(): number {
  if (recentBlocks.length < 2) return 0;
  
  const oldestBlock = recentBlocks[0];
  const newestBlock = recentBlocks[recentBlocks.length - 1];
  
  if (!oldestBlock || !newestBlock) return 0;
  
  const timeSpan = Number(newestBlock.timestamp - oldestBlock.timestamp);
  if (timeSpan === 0) return 0;
  
  // Calculate total transactions in the window
  const totalTransactions = recentBlocks.reduce((sum, block) => sum + block.transactionCount, 0);
  
  // Calculate TPS: total transactions / time span in seconds
  return totalTransactions / timeSpan;
}

// Function to update block tracking
export function updateBlockTracking(blockNumber: bigint, timestamp: bigint, transactionCount: number) {
  recentBlocks.push({ number: blockNumber, timestamp, transactionCount });
  
  // Keep only the configured window of blocks
  while (recentBlocks.length > TPS_WINDOW_BLOCKS) {
    recentBlocks.shift();
  }
}

// Define event types
export type EventType = 
  | 'block'
  | 'transaction'
  | 'monTransfer'
  | 'monWalletActivity'
  | 'contractUsage'
  | 'walletContractInteraction'
  | 'walletGasUsage'
  | 'networkStats';

// Define event data types
export interface BlockEvent {
  number: bigint;
  hash: string;
  timestamp: bigint;
  transactionCount: number;
  gasUsed: bigint;
  gasLimit: bigint;
}

export interface TransactionEvent {
  hash: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  fromAddress: string;
  toAddress: string;
  value: bigint;
  gasUsed: bigint;
  gasPrice: bigint;
  transactionType: string;
  methodSignature: string;
  success: boolean;
  contractAddress: string;
}

export interface MonTransferEvent {
  transactionHash: string;
  fromAddress: string;
  toAddress: string;
  amount: bigint;
  gasUsed: bigint;
}

export interface MonWalletActivityEvent {
  walletAddress: string;
  totalSent: bigint;
  totalReceived: bigint;
  transferCount: number;
  sentCount: number;
  receivedCount: number;
}

export interface ContractUsageEvent {
  contractAddress: string;
  transactionCount: number;
  gasUsed: bigint;
  avgGasPerTx: bigint;
  transactionType: string;
}

export interface WalletContractInteractionEvent {
  walletAddress: string;
  contractAddress: string;
  transactionCount: number;
  gasUsed: bigint;
  avgGasPerTx: bigint;
  transactionType: string;
}

export interface WalletGasUsageEvent {
  walletAddress: string;
  totalGasUsed: bigint;
  transactionCount: number;
  avgGasPerTx: bigint;
  contractsInteracted: number;
}

export interface NetworkStatsEvent {
  currentBlockHeight: bigint;
  tps: number;
  windowSize: number;
}

export type EventData = 
  | BlockEvent
  | TransactionEvent
  | MonTransferEvent
  | MonWalletActivityEvent
  | ContractUsageEvent
  | WalletContractInteractionEvent
  | WalletGasUsageEvent
  | NetworkStatsEvent;

export interface Event {
  type: EventType;
  data: EventData;
  timestamp: number;
}

// Custom event emitter class
class MonadEventEmitter {
  private listeners: Map<EventType, Set<(event: Event) => void>>;

  constructor() {
    this.listeners = new Map();
  }

  on(eventType: EventType, callback: (event: Event) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);
  }

  off(eventType: EventType, callback: (event: Event) => void) {
    this.listeners.get(eventType)?.delete(callback);
  }

  emit(event: Event) {
    this.listeners.get(event.type)?.forEach(callback => callback(event));
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

// Create event emitter instance
export const eventEmitter = new MonadEventEmitter();

// Helper to serialize BigInt values
function serializeWithBigInt(obj: any): string {
  return JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });

// Track client subscriptions
const clientSubscriptions = new Map<WebSocket, Set<EventType>>();

// Broadcast network stats every second
setInterval(() => {
  if (recentBlocks.length > 0) {
    const latestBlock = recentBlocks[recentBlocks.length - 1];
    if (latestBlock) {
      const networkStats: NetworkStatsEvent = {
        currentBlockHeight: latestBlock.number,
        tps: calculateTPS(),
        windowSize: TPS_WINDOW_BLOCKS
      };

      const event: Event = {
        type: 'networkStats',
        data: networkStats,
        timestamp: Date.now()
      };

      // Broadcast to all clients subscribed to networkStats
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const subscriptions = clientSubscriptions.get(client);
          if (subscriptions?.has('networkStats')) {
            client.send(serializeWithBigInt(event));
          }
        }
      });
    }
  }
}, 1000);

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  // Initialize empty subscriptions set for this client
  clientSubscriptions.set(ws, new Set());

  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle subscription requests
      if (data.type === 'subscribe') {
        const eventTypes = Array.isArray(data.events) ? data.events : [data.events];
        const subscriptions = clientSubscriptions.get(ws) || new Set();
        
        // Add new subscriptions
        eventTypes.forEach((eventType: EventType) => {
          subscriptions.add(eventType);
        });
        
        clientSubscriptions.set(ws, subscriptions);
        
        // Send confirmation
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          events: Array.from(subscriptions)
        }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clientSubscriptions.delete(ws);
  });
});

// Handle events from the indexer
eventEmitter.on('block', (event: Event) => {
  broadcastEvent(event);
});

eventEmitter.on('transaction', (event: Event) => {
  broadcastEvent(event);
});

eventEmitter.on('monTransfer', (event: Event) => {
  broadcastEvent(event);
});

eventEmitter.on('monWalletActivity', (event: Event) => {
  broadcastEvent(event);
});

eventEmitter.on('contractUsage', (event: Event) => {
  broadcastEvent(event);
});

eventEmitter.on('walletContractInteraction', (event: Event) => {
  broadcastEvent(event);
});

eventEmitter.on('walletGasUsage', (event: Event) => {
  broadcastEvent(event);
});

// Helper function to broadcast events to subscribed clients
function broadcastEvent(event: Event) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const subscriptions = clientSubscriptions.get(client);
      if (subscriptions?.has(event.type)) {
        client.send(serializeWithBigInt(event));
      }
    }
  });
}

console.log('WebSocket server started on port 8080'); 