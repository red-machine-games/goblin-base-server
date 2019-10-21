await lock.self();

var validation = await validateStoreReceipt({ receiptC: selfHumanId });

setSelfRating('deposit', -1);

FunctionResponse(validation);