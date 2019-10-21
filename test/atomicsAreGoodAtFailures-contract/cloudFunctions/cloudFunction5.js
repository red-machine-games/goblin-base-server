await lock.self();

var validation = await validateStoreReceipt({ receiptB: selfHumanId });

setProfileNode('profileData.embox', 'evening');

FunctionResponse(validation);