import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { loadConfig, CONTRACT_ADDRESSES } from "./config";
import { parseStrategy } from "./lib";
import { PancakeSwapBot } from "./bot/pancakeswap-bot";
import { PancakePredictionV2__factory } from "./types/typechain";

/**
 * Main entry point for PancakeSwap Prediction Bot
 */
async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const provider = new JsonRpcProvider(config.rpcUrl);
    const signer = new Wallet(config.privateKey, provider);
    const contract = PancakePredictionV2__factory.connect(
      CONTRACT_ADDRESSES.PANCAKESWAP_V2,
      signer
    );

    const strategy = parseStrategy(process.argv);
    const bot = new PancakeSwapBot(config, contract);
    bot.start(strategy);
  } catch (error) {
    console.error("Failed to start bot:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
