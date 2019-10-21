await lock.self();

var validation = await validateStoreReceipt({ receipt: 'A' });

FunctionResponse(validation);