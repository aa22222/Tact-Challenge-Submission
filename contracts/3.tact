import "@stdlib/deploy";

/*
  TASK 3 - Dex contract 
  Create a simple jetton dex contract that trades one pair of token A and B.
  The price of tokens depends on amount of tokens that sc have.
  So, if smartcontract have 10 of token A and 2 of token B, then after sending 1 tokens B you will receive 5 of tokens A.
  
  If user will pool dont have enougth tokens to trade
  (for example someone will send 99999 tokens of B and dex pool have only 10 of tokens A),
  then return sended (tokens B in our example) tokens back to user

  Implement a getter that will give the number of tokens in the pool and
  one more to get price of token A or token B.
  
  Note
  Admin can add token A and token B just by sending then to smartcontract (we need to set initial supply for the pool). 
*/

message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forwardPayload: Slice as remaining;
}

message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address? = null;
    customPayload: Cell? = null;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

contract Task3 with Deployable {
  owner: Address;
  a: Int;
  b: Int;
  jAddressA: Address;
  jAddressB: Address;
  const decimal: Int = 1000000000;

  init(admin: Address, newJAddressA: Address, newJAddressB: Address) {
    self.owner = admin;
    self.jAddressA = newJAddressA;
    self.jAddressB = newJAddressB;
    self.a = 0;
    self.b = 0;
  }

  inline fun sendToken(amount: Int, token: Address, dest: Address, queryId: Int) {
    send(SendParameters{
      to: token,
      value: 0,
      mode: SendRemainingValue,
      body: TokenTransfer{
        queryId: queryId,
        amount: amount,
        destination: dest,
        responseDestination: dest,
        forwardTonAmount: 0,
        forwardPayload: emptyCell().asSlice()
      }.toCell()
    });
  }

  receive(msg: TokenNotification) {
    if(sender() == self.jAddressA){
      if(msg.from == self.owner){
        self.a = self.a + msg.amount;
        return;
      }
      let p : Int = msg.amount * self.b / self.a;
      if(p > self.b){
        self.sendToken(msg.amount, self.jAddressA, msg.from, msg.queryId);
      }
      else {
        self.sendToken(p, self.jAddressB, msg.from, msg.queryId);
        self.a = self.a + msg.amount;
        self.b = self.b - p;
      }
    }
    if(sender() == self.jAddressB){
      if(msg.from == self.owner){
        self.b = self.b + msg.amount;
        return;
      }
      let p : Int = msg.amount * self.a / self.b;
      if(p > self.a){
        self.sendToken(msg.amount, self.jAddressB, msg.from, msg.queryId);
      }
      else {
        self.sendToken(p, self.jAddressA, msg.from, msg.queryId);
        self.b = self.b + msg.amount;
        self.a = self.a - p;
      }
    }
  } 
  
  get fun price(token: Address): Int { 
    if(token == self.jAddressA){
      return self.decimal * self.a / self.b;
    }
    if(token == self.jAddressB){
      return self.decimal * self.b / self.a;
    }
    return 0;
  }
  
  get fun balance(token: Address): Int { 
    if(token == self.jAddressA){
      return self.a;
    }
    if(token == self.jAddressB){
      return self.b;
    }
    return 0;
  }
}
