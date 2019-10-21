await lock.self();

var validation = await validateStoreReceipt({ receipt: 'A' });

if(!validation.butDuplicated){
    setProfileNode('profileData.asylum', 1);
} else {
    setProfileNode('profileData.layer', 1);
}

FunctionResponse({ isValid: validation.isValid });