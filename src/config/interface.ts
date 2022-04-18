export interface Config {
  baking_address: string;
  default_fee: string;
  redirect_payments: { [key: string]: string };
  fee_exceptions: { [key: string]: string };
  overdelegation_guard: boolean;
}