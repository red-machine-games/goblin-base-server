await lock.self();

var validation = await validateStoreReceipt({ receipt: 'B' });

if(!validation.butDuplicated){
    setProfileNode('profileData.policeman', 1);
} else {
    setProfileNode('profileData.imposter', 1);
}

FunctionResponse({ isValid: validation.isValid });