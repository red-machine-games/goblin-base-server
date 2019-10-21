await lock.self();

var validation = await validateStoreReceipt({ receipt: 'C' });

if(validation.isValid){
    if(!(await getProfileNode('profileData.flour'))){
        setProfileNode('profileData.flour', 1);
    } else {
        setProfileNode('profileData.wine', 1);
    }
} else if(!(await getProfileNode('profileData.beach'))){
    setProfileNode('profileData.beach', 1);
} else {
    setProfileNode('profileData.commerce', 1);
}

FunctionResponse({ butDuplicated: validation.butDuplicated, isValid: validation.isValid });