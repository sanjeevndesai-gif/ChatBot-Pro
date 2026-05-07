import { CreditCardMask } from './credit-card-mask';

describe('CreditCardMask', () => {
  it('should create an instance', () => {
    const directive = new CreditCardMask();
    expect(directive).toBeTruthy();
  });
});
