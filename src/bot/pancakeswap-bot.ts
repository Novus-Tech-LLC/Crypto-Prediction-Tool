import { BigNumber } from "@ethersproject/bignumber";
import { parseEther } from "@ethersproject/units";
import { BaseBot, PlatformType, PredictionContract } from "./base-bot";
import { AppConfig } from "../config";
import { getClaimableEpochs } from "../lib";
import { PancakePredictionV2 } from "../types/typechain";

/**
 * PancakeSwap Prediction Bot implementation
 */
export class PancakeSwapBot extends BaseBot {
  constructor(config: AppConfig, contract: PancakePredictionV2) {
    super(config, contract as PredictionContract, PlatformType.PANCAKESWAP);
  }

  /**
   * Gets round amounts from PancakeSwap contract
   */
  protected async getRoundAmounts(epoch: BigNumber): Promise<{ bullAmount: BigNumber; bearAmount: BigNumber }> {
    return await (this.contract as PancakePredictionV2).rounds(epoch);
  }

  /**
   * Executes a bet on PancakeSwap
   */
  protected async executeBet(
    epoch: BigNumber,
    isBear: boolean
  ): Promise<{ wait: () => Promise<unknown> }> {
    const contract = this.contract as PancakePredictionV2;
    const betAmount = parseEther(this.config.betAmount);

    if (isBear) {
      return await contract.betBear(epoch, {
        value: betAmount,
      });
    } else {
      return await contract.betBull(epoch, {
        value: betAmount,
      });
    }
  }

  /**
   * Gets claimable epochs for PancakeSwap
   */
  protected async getClaimableEpochs(epoch: BigNumber): Promise<BigNumber[]> {
    return await getClaimableEpochs(
      this.contract as PancakePredictionV2,
      epoch,
      this.signer.address
    );
  }

  /**
   * Executes claim transaction on PancakeSwap
   */
  protected async executeClaim(
    epochs: BigNumber[]
  ): Promise<{ wait: () => Promise<unknown> }> {
    return await (this.contract as PancakePredictionV2).claim(epochs);
  }
}

