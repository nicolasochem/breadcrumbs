/** @jest-environment setup-polly-jest/jest-environment-node */

import _ from "lodash";

import client from "src/client";
import { generateConfig } from "test/helpers";
import { initializeCycleReport, isOverDelegated } from "src/engine/helpers";
import { resolveExcludedDelegators } from "src/engine/steps/resolveExcludedDelegators";

import * as Polly from "test/helpers/polly";
import { resolveBakerRewards } from "src/engine/steps/resolveBakerRewards";
import { resolveDelegatorRewards } from "src/engine/steps/resolveDelegatorRewards";
import { resolveExcludedPayments } from "src/engine/steps/resolveExcludedPayments";
import BigNumber from "bignumber.js";

describe("resolveExcludedPayments", () => {
  Polly.start();

  it("does not exclude payments if minimum payment amount is set at zero", async () => {
    const config = generateConfig({
      minimum_payment_amount: "0",
    });

    const cycleData = await client.getCycleData(config.baking_address, 470);
    const { cycleRewards, cycleShares } = cycleData;

    const numberOfDelegators = cycleShares.length;

    expect(numberOfDelegators).toEqual(9);
    /* Sentry & Legate has 9 delegators in cycle 470 */

    const args = {
      config,
      cycleData,
      cycleReport: initializeCycleReport(470),
      distributableRewards: cycleRewards,
    };

    const input = resolveDelegatorRewards(
      resolveExcludedDelegators(resolveBakerRewards(args))
    );

    const actual = resolveExcludedPayments(input);

    expect(actual.cycleReport.payments).toStrictEqual(
      input.cycleReport.payments
    );

    expect(
      _.find(actual.cycleReport.payments, (payment) =>
        payment.paymentAmount.eq(0)
      )
    ).toBeUndefined();
  });

  it("exclude payments if they are below the specified minimum amount", async () => {
    const minimumPaymentAmount = new BigNumber("2");

    const config = generateConfig({
      minimum_payment_amount: minimumPaymentAmount.toString(),
    });

    const cycleData = await client.getCycleData(config.baking_address, 470);
    const { cycleRewards, cycleShares } = cycleData;

    const numberOfDelegators = cycleShares.length;

    expect(numberOfDelegators).toEqual(9);
    /* Sentry & Legate has 9 delegators in cycle 470 */

    const args = {
      config,
      cycleData,
      cycleReport: initializeCycleReport(470),
      distributableRewards: cycleRewards,
    };

    const input = resolveDelegatorRewards(
      resolveExcludedDelegators(resolveBakerRewards(args))
    );

    const output = resolveExcludedPayments(input);

    const {
      cycleReport: { payments: inputPayments },
    } = input;

    const {
      cycleReport: { payments: outputPayments },
    } = output;

    expect(
      _.filter(outputPayments, (payment) => payment.paymentAmount.eq(0)).length
    ).toBeGreaterThan(0);

    for (let i = 0; i < inputPayments.length; i++) {
      if (
        inputPayments[i].paymentAmount.lt(minimumPaymentAmount.times(1000000))
      ) {
        expect(outputPayments[i].paymentAmount.eq(0));
      } else {
        expect(outputPayments[i]).toStrictEqual(inputPayments[i]);
      }
    }
  });
});