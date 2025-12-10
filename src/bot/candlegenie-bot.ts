import { BigNumber } from "@ethersproject/bignumber";
import { parseEther } from "@ethersproject/units";
import { BaseBot, PlatformType, PredictionContract } from "./base-bot";
import { AppConfig } from "../config";
import { getClaimableEpochsCG } from "../lib";
import { CandleGeniePredictionV3 } from "../types/typechain";

/**
 * CandleGenie Prediction Bot implementation
 */
export class CandleGenieBot extends BaseBot {
  constructor(config: AppConfig, contract: CandleGeniePredictionV3) {
    super(config, contract as PredictionContract, PlatformType.CANDLEGENIE);
  }

  /**
   * Gets round amounts from CandleGenie contract
   */
  protected async getRoundAmounts(epoch: BigNumber): Promise<{ bullAmount: BigNumber; bearAmount: BigNumber }> {
    return await (this.contract as CandleGeniePredictionV3).Rounds(epoch);
  }

  /**
   * Executes a bet on CandleGenie
   */
  protected async executeBet(
    epoch: BigNumber,
    isBear: boolean
  ): Promise<{ wait: () => Promise<unknown> }> {
    const contract = this.contract as CandleGeniePredictionV3;
    const betAmount = parseEther(this.config.betAmount);

    if (isBear) {
      return await contract.user_BetBear(epoch, {
        value: betAmount,
      });
    } else {
      return await contract.user_BetBull(epoch, {
        value: betAmount,
      });
    }
  }

  /**
   * Gets claimable epochs for CandleGenie
   */
  protected async getClaimableEpochs(epoch: BigNumber): Promise<BigNumber[]> {
    return await getClaimableEpochsCG(
      this.contract as CandleGeniePredictionV3,
      epoch,
      this.signer.address
    );
  }

  /**
   * Executes claim transaction on CandleGenie
   */
  protected async executeClaim(
    epochs: BigNumber[]
  ): Promise<{ wait: () => Promise<unknown> }> {
    return await (this.contract as CandleGeniePredictionV3).user_Claim(epochs);
  }
}

