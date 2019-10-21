await lock.some([1, 2]);

var validation1 = await validateStoreReceipt({ receipt: 'A' }),
    validation2 = await validateStoreReceipt({ receipt: 'B' });

FunctionResponse({ validation1, validation2 });