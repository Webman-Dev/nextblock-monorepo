export type FreemiusTrialMode = 'free' | 'paid';

type TrialCarrier = {
  trial_period_days?: number | string | null;
  trial_requires_payment_method?: boolean | null;
};

export function getTrialPeriodDays(value: TrialCarrier | null | undefined) {
  const parsed = Number(value?.trial_period_days ?? 0);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed);
}

export function getTrialCheckoutMode(
  value: TrialCarrier | null | undefined
): FreemiusTrialMode | null {
  const trialPeriodDays = getTrialPeriodDays(value);

  if (trialPeriodDays === 0) {
    return null;
  }

  return value?.trial_requires_payment_method ? 'paid' : 'free';
}

export function getTrialLabel(value: TrialCarrier | number | null | undefined) {
  const trialPeriodDays =
    typeof value === 'number'
      ? getTrialPeriodDays({ trial_period_days: value })
      : getTrialPeriodDays(value);

  return trialPeriodDays > 0 ? `${trialPeriodDays}-day free trial` : null;
}

export function getTrialPaymentRequirementLabel(
  value: TrialCarrier | null | undefined
) {
  return value?.trial_requires_payment_method
    ? 'Payment method required'
    : 'No credit card required';
}

export function getTrialSummary(value: TrialCarrier | null | undefined) {
  const trialLabel = getTrialLabel(value);

  if (!trialLabel) {
    return null;
  }

  return {
    label: trialLabel,
    paymentRequirementLabel: getTrialPaymentRequirementLabel(value),
    checkoutMode: getTrialCheckoutMode(value),
  };
}
