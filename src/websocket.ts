import { WebSocketServer } from 'ws';

// Define event types
export type EventType = 
  | 'block'
  | 'transaction'
  | 'monTransfer'
  | 'monWalletActivity'
  | 'contractUsage'
  | 'walletContractInteraction'
  | 'walletGasUsage';

// Define event data types
export interface BlockEvent {
  number: bigint;
  hash: string;
  timestamp: bigint;
  transactionCount: number;
  gasUsed: bigint;
  gasLimit: bigint;
  transferCount: number;
  swapCount: number;
  mintCount: number;
  burnCount: number;
  stakeCount: number;
  otherCount: number;
}

export interface TransactionEvent {
  hash: string;
  blockNumber: number;
  blockTimestamp: number;
  transactionIndex: number;
  fromAddress: string;
  toAddress: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  transactionType: string;
  methodSignature: string;
  success: boolean;
  contractAddress: string;
}

export interface MonTransferEvent {
  id: string;
  transactionHash: string;
  fromAddress: string;
  toAddress: string;
  amount: bigint;
  gasUsed: bigint;
}

export interface MonWalletActivityEvent {
  id: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  walletAddress: string;
  totalSent: bigint;
  totalReceived: bigint;
  transferCount: number;
  sentCount: number;
  receivedCount: number;
}

export interface ContractUsageEvent {
  id: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  contractAddress: string;
  transactionCount: number;
  gasUsed: bigint;
  avgGasPerTx: bigint;
  transactionType: string;
}

export interface WalletContractInteractionEvent {
  id: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  walletAddress: string;
  contractAddress: string;
  transactionCount: number;
  gasUsed: bigint;
  avgGasPerTx: bigint;
  transactionType: string;
}

export interface WalletGasUsageEvent {
  id: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  walletAddress: string;
  totalGasUsed: bigint;
  transactionCount: number;
  avgGasPerTx: bigint;
  contractsInteracted: number;
}

export type EventData = 
  | BlockEvent
  | TransactionEvent
  | MonTransferEvent
  | MonWalletActivityEvent
  | ContractUsageEvent
  | WalletContractInteractionEvent
  | WalletGasUsageEvent;

export interface Event {
  type: EventType;
  data: EventData;
  timestamp: number;
}

// Custom JSON serializer that handles BigInt
function serializeWithBigInt(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
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

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle subscription requests
      if (data.type === 'subscribe') {
        const eventTypes = Array.isArray(data.events) ? data.events : [data.events];
        
        // Subscribe to requested event types
        eventTypes.forEach((eventType: EventType) => {
          eventEmitter.on(eventType, (event: Event) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(serializeWithBigInt(event));
            }
          });
        });
        
        ws.send(JSON.stringify({ type: 'subscribed', events: eventTypes }));
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    // Remove all listeners for this client
    eventEmitter.removeAllListeners();
  });
});

console.log('WebSocket server started on port 8080'); 