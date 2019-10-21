await lock.self();

var validation = await validateStoreReceipt({ receipt: 'B' });

FunctionResponse(validation);