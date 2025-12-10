import { BigNumber } from "@ethersproject/bignumber";
import { parseEther } from "@ethersproject/units";
import { underline } from "chalk";
import {
  CandleGeniePredictionV3,
  PancakePredictionV2,
} from "./types/typechain";
import { Logger } from "./logger";

/**
 * Utility function to pause execution for a specified number of milliseconds
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the specified time
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Betting strategy enumeration
 */
export enum STRATEGIES {
  Against = "Against",
  With = "With",
}

/**
 * Parses command line arguments to determine betting strategy
 * @param processArgv - Process arguments array
 * @returns The selected strategy
 */
export const parseStrategy = (processArgv: string[]): STRATEGIES => {
  const strategy = processArgv.includes("--with")
    ? STRATEGIES.With
    : STRATEGIES.Against;

  Logger.log(underline("Strategy:", strategy));

  if (strategy === STRATEGIES.Against) {
    Logger.log(
      "\n You can use this bot with or against the majority.\n",
      "Start the bot using the --with flag to bet with the majority.\n",
      "You may use the bot on Candle Genie or Pancakeswap\n",
      "Try now using the following commands!\n",
      underline("npm run start -- --with"),
      "or",
      underline("npm run cg -- --with")
    );
  }
  if (strategy === STRATEGIES.With) {
    Logger.log(
      "\n You can use this bot with or against the majority.\n",
      "Start the bot without the --with flag to bet against the majority.\n",
      "You may use the bot on Candle Genie or Pancakeswap\n",
      "Try now using the following commands!\n",
      underline("npm run start"),
      "or",
      underline("npm run cg")
    );
  }

  return strategy;
};

/**
 * Determines if betting against the majority is favorable
 * Bets against when the ratio is less than 5:1
 * @param bullAmount - Total amount bet on bull
 * @param bearAmount - Total amount bet on bear
 * @returns True if betting against the majority is favorable
 */
export const isAgainstBet = (
  bullAmount: BigNumber,
  bearAmount: BigNumber
): boolean => {
  const precalculation =
    (bullAmount.gt(bearAmount) && bullAmount.div(bearAmount).lt(5)) ||
    (bullAmount.lt(bearAmount) && bearAmount.div(bullAmount).gt(5));
  return precalculation;
};

/**
 * Determines if betting with the majority is favorable
 * Bets with when the ratio is less than 5:1
 * @param bullAmount - Total amount bet on bull
 * @param bearAmount - Total amount bet on bear
 * @returns True if betting with the majority is favorable
 */
export const isWithBet = (
  bullAmount: BigNumber,
  bearAmount: BigNumber
): boolean => {
  const precalculation =
    (bearAmount.gt(bullAmount) && bearAmount.div(bullAmount).lt(5)) ||
    (bearAmount.lt(bullAmount) && bullAmount.div(bearAmount).gt(5));
  return precalculation;
};

/**
 * Gets claimable epochs for PancakeSwap prediction contract
 * Checks the last 5 epochs for claimable or refundable rewards
 * @param predictionContract - PancakeSwap prediction contract instance
 * @param epoch - Current epoch number
 * @param userAddress - User's wallet address
 * @returns Array of claimable epoch numbers
 */
export const getClaimableEpochs = async (
  predictionContract: PancakePredictionV2,
  epoch: BigNumber,
  userAddress: string
): Promise<BigNumber[]> => {
  const claimableEpochs: BigNumber[] = [];

  for (let i = 1; i <= 5; i++) {
    const epochToCheck = epoch.sub(i);

    const [claimable, refundable, { claimed, amount }] = await Promise.all([
      predictionContract.claimable(epochToCheck, userAddress),
      predictionContract.refundable(epochToCheck, userAddress),
      predictionContract.ledger(epochToCheck, userAddress),
    ]);

    if (amount.gt(0) && (claimable || refundable) && !claimed) {
      claimableEpochs.push(epochToCheck);
    }
  }

  return claimableEpochs;
};

/**
 * Reduces waiting time by two blocks (6 seconds) when transaction fails
 * Has a minimum threshold to prevent waiting time from becoming too short
 * @param waitingTime - Current waiting time in milliseconds
 * @returns Reduced waiting time in milliseconds
 */
export const reduceWaitingTimeByTwoBlocks = (waitingTime: number): number => {
  const MIN_WAITING_TIME_MS = 6000;
  if (waitingTime <= MIN_WAITING_TIME_MS) {
    return waitingTime;
  }

  return waitingTime - 6000;
};

/**
 * Calculates the dues amount (2% of winnings) with a minimum threshold
 * @param amount - Winning amount in wei
 * @returns Dues amount in wei (minimum 0.01 BNB)
 */
export const calculateDuesAmount = (amount: BigNumber | undefined): BigNumber => {
  const MIN_DUES_AMOUNT = parseEther("0.01");
  const DUES_PERCENTAGE = 50; // 2% = 1/50

  if (!amount || amount.div(DUES_PERCENTAGE).lt(MIN_DUES_AMOUNT)) {
    return MIN_DUES_AMOUNT;
  }

  return amount.div(DUES_PERCENTAGE);
};

/**
 * Gets claimable epochs for CandleGenie prediction contract
 * Checks the last 5 epochs for claimable or refundable rewards
 * @param predictionContract - CandleGenie prediction contract instance
 * @param epoch - Current epoch number
 * @param userAddress - User's wallet address
 * @returns Array of claimable epoch numbers
 */
export const getClaimableEpochsCG = async (
  predictionContract: CandleGeniePredictionV3,
  epoch: BigNumber,
  userAddress: string
): Promise<BigNumber[]> => {
  const claimableEpochs: BigNumber[] = [];

  for (let i = 1; i <= 5; i++) {
    const epochToCheck = epoch.sub(i);

    const [claimable, refundable, { claimed, amount }] = await Promise.all([
      predictionContract.claimable(epochToCheck, userAddress),
      predictionContract.refundable(epochToCheck, userAddress),
      predictionContract.Bets(epochToCheck, userAddress),
    ]);

    if (amount.gt(0) && (claimable || refundable) && !claimed) {
      claimableEpochs.push(epochToCheck);
    }
  }

  return claimableEpochs;
};
