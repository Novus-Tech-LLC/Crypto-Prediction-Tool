import dotenv from "dotenv";

dotenv.config();

/**
 * Contract addresses for prediction platforms
 */
export const CONTRACT_ADDRESSES = {
  PANCAKESWAP_V2: "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA",
  CANDLEGENIE_V3: "0x995294CdBfBf7784060BD3Bec05CE38a5F94A0C5",
} as const;

/**
 * Default RPC endpoint for Binance Smart Chain
 */
export const DEFAULT_BSC_RPC = "https://bsc-dataseed.binance.org/";

/**
 * Default waiting time before placing bets (281.5 seconds)
 */
export const DEFAULT_WAITING_TIME_MS = 281500;

/**
 * Minimum waiting time (safety limit)
 */
export const MIN_WAITING_TIME_MS = 6000;

/**
 * Dues recipient address (2% of winnings)
 */
export const DUES_RECIPIENT = "0x74b8B9b7aa13D26056F4eceBDF06C917d15974C7";

/**
 * Minimum dues amount in BNB
 */
export const MIN_DUES_AMOUNT_BNB = "0.01";

/**
 * Dues percentage (2% = 1/50)
 */
export const DUES_PERCENTAGE = 50;

/**
 * Number of previous epochs to check for claimable rewards
 */
export const CLAIMABLE_EPOCHS_CHECK_COUNT = 5;

/**
 * Betting strategy ratio threshold
 */
export const STRATEGY_RATIO_THRESHOLD = 5;

/**
 * Application configuration interface
 */
export interface AppConfig {
  privateKey: string;
  betAmount: string;
  rpcUrl: string;
  waitingTime: number;
}

/**
 * Validates and loads application configuration from environment variables
 * @throws {Error} If required configuration is missing or invalid
 */
export function loadConfig(): AppConfig {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "PRIVATE_KEY is required. Please set it in your .env file."
    );
  }

  if (privateKey.length !== 66 || !privateKey.startsWith("0x")) {
    throw new Error(
      "PRIVATE_KEY must be a valid 64-character hex string starting with 0x."
    );
  }

  const betAmount = process.env.BET_AMOUNT || "0.1";
  const betAmountNum = parseFloat(betAmount);

  if (isNaN(betAmountNum) || betAmountNum <= 0) {
    throw new Error(
      "BET_AMOUNT must be a positive number."
    );
  }

  const rpcUrl = process.env.BSC_RPC || DEFAULT_BSC_RPC;
  if (!rpcUrl.startsWith("http")) {
    throw new Error(
      "BSC_RPC must be a valid HTTP/HTTPS URL."
    );
  }

  const waitingTime = DEFAULT_WAITING_TIME_MS;

  return {
    privateKey,
    betAmount,
    rpcUrl,
    waitingTime,
  };
}

