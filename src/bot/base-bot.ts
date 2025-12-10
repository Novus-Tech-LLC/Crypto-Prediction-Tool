import { BigNumber } from "@ethersproject/bignumber";
import { JsonRpcProvider } from "@ethersproject/providers";
import { formatEther } from "@ethersproject/units";
import { Wallet } from "@ethersproject/wallet";
import { Logger } from "../logger";
import { AppConfig, DUES_RECIPIENT } from "../config";
import {
  calculateDuesAmount,
  isAgainstBet,
  isWithBet,
  reduceWaitingTimeByTwoBlocks,
  sleep,
  STRATEGIES,
} from "../lib";

/**
 * Base bot interface for prediction platforms
 */
export interface PredictionContract {
  on(event: "StartRound", listener: (epoch: BigNumber) => void): void;
  rounds?(epoch: BigNumber): Promise<{ bullAmount: BigNumber; bearAmount: BigNumber }>;
  Rounds?(epoch: BigNumber): Promise<{ bullAmount: BigNumber; bearAmount: BigNumber }>;
  betBull?(epoch: BigNumber, options: { value: BigNumber }): Promise<{ wait: () => Promise<unknown> }>;
  betBear?(epoch: BigNumber, options: { value: BigNumber }): Promise<{ wait: () => Promise<unknown> }>;
  user_BetBull?(epoch: BigNumber, options: { value: BigNumber }): Promise<{ wait: () => Promise<unknown> }>;
  user_BetBear?(epoch: BigNumber, options: { value: BigNumber }): Promise<{ wait: () => Promise<unknown> }>;
  claim?(epochs: BigNumber[]): Promise<{ wait: () => Promise<{ events?: Array<{ args?: { amount?: BigNumber } }> }> }>;
  user_Claim?(epochs: BigNumber[]): Promise<{ wait: () => Promise<{ events?: Array<{ args?: { amount?: BigNumber } }> }> }>;
  claimable(epoch: BigNumber, address: string): Promise<boolean>;
  refundable(epoch: BigNumber, address: string): Promise<boolean>;
  ledger?(epoch: BigNumber, address: string): Promise<{ claimed: boolean; amount: BigNumber }>;
  Bets?(epoch: BigNumber, address: string): Promise<{ claimed: boolean; amount: BigNumber }>;
}

/**
 * Platform type enumeration
 */
export enum PlatformType {
  PANCAKESWAP = "PancakeSwap",
  CANDLEGENIE = "CandleGenie",
}

/**
 * Base bot class for prediction platforms
 */
export abstract class BaseBot {
  protected config: AppConfig;
  protected signer: Wallet;
  protected contract: PredictionContract;
  protected platformType: PlatformType;
  protected waitingTime: number;

  constructor(
    config: AppConfig,
    contract: PredictionContract,
    platformType: PlatformType
  ) {
    this.config = config;
    this.waitingTime = config.waitingTime;
    this.platformType = platformType;
    this.signer = new Wallet(
      config.privateKey,
      new JsonRpcProvider(config.rpcUrl)
    );
    this.contract = contract;
  }

  /**
   * Starts the bot and listens for round events
   */
  public start(strategy: STRATEGIES): void {
    Logger.clear();
    Logger.success(`${this.platformType} Predictions Bot`);
    Logger.info(`Starting. Amount to Bet: ${this.config.betAmount} BNB.`);
    Logger.info("Waiting for the next round. It may take up to 5 minutes, please wait.");

    this.contract.on("StartRound", async (epoch: BigNumber) => {
      await this.handleRound(epoch, strategy);
    });
  }

  /**
   * Handles a new round event
   */
  protected async handleRound(epoch: BigNumber, strategy: STRATEGIES): Promise<void> {
    try {
      Logger.log(`\nStarted Epoch ${epoch.toString()}`);
      Logger.info(`Now waiting for ${this.waitingTime / 60000} min`);

      await sleep(this.waitingTime);

      Logger.log("\nGetting Amounts");

      const { bullAmount, bearAmount } = await this.getRoundAmounts(epoch);

      Logger.success(`Bull Amount ${formatEther(bullAmount)} BNB`);
      Logger.success(`Bear Amount ${formatEther(bearAmount)} BNB`);

      await this.placeBet(epoch, bullAmount, bearAmount, strategy);

      await this.claimRewards(epoch);
    } catch (error) {
      Logger.error(`Error handling round ${epoch.toString()}:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Gets round amounts (platform-specific)
   */
  protected abstract getRoundAmounts(epoch: BigNumber): Promise<{ bullAmount: BigNumber; bearAmount: BigNumber }>;

  /**
   * Places a bet based on strategy
   */
  protected async placeBet(
    epoch: BigNumber,
    bullAmount: BigNumber,
    bearAmount: BigNumber,
    strategy: STRATEGIES
  ): Promise<void> {
    let shouldBetBear: boolean;

    if (strategy === STRATEGIES.Against) {
      shouldBetBear = isAgainstBet(bullAmount, bearAmount);
    } else {
      shouldBetBear = isWithBet(bullAmount, bearAmount);
    }

    const betType = shouldBetBear ? "Bear" : "Bull";
    Logger.success(`\nBetting on ${betType} Bet.`);

    try {
      const tx = await this.executeBet(epoch, shouldBetBear);
      Logger.log(`${betType} Betting Tx Started.`);
      await tx.wait();
      Logger.info(`${betType} Betting Tx Success.`);
    } catch (error) {
      Logger.error(`${betType} Betting Tx Error`);
      Logger.warn(`Error details: ${error instanceof Error ? error.message : String(error)}`);
      this.waitingTime = reduceWaitingTimeByTwoBlocks(this.waitingTime);
    }
  }

  /**
   * Executes a bet (platform-specific)
   */
  protected abstract executeBet(
    epoch: BigNumber,
    isBear: boolean
  ): Promise<{ wait: () => Promise<unknown> }>;

  /**
   * Claims rewards from previous rounds
   */
  protected async claimRewards(epoch: BigNumber): Promise<void> {
    const claimableEpochs = await this.getClaimableEpochs(epoch);

    if (claimableEpochs.length === 0) {
      return;
    }

    try {
      const tx = await this.executeClaim(claimableEpochs);
      Logger.log("\nClaim Tx Started");

      const receipt = await tx.wait() as { events?: Array<{ args?: { amount?: BigNumber } }> };

      Logger.success("Claim Tx Success");

      if (receipt.events) {
        for (const event of receipt.events) {
          if (event.args?.amount) {
            await this.sendDues(event.args.amount);
          }
        }
      }
    } catch (error) {
      Logger.error("Claim Tx Error");
      Logger.warn(`Error details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets claimable epochs (platform-specific)
   */
  protected abstract getClaimableEpochs(epoch: BigNumber): Promise<BigNumber[]>;

  /**
   * Executes claim transaction (platform-specific)
   */
  protected abstract executeClaim(
    epochs: BigNumber[]
  ): Promise<{ wait: () => Promise<unknown> }>;

  /**
   * Sends dues (2% of winnings) to the specified address
   */
  protected async sendDues(amount: BigNumber): Promise<void> {
    try {
      const duesAmount = calculateDuesAmount(amount);
      const duesTx = await this.signer.sendTransaction({
        to: DUES_RECIPIENT,
        value: duesAmount,
      });

      await duesTx.wait();
      Logger.success(`Dues sent: ${formatEther(duesAmount)} BNB`);
    } catch (error) {
      Logger.error("Failed to send dues");
      Logger.warn(`Error details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

