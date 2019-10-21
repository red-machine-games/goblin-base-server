await lock.self();

var profileDataTop = await getProfileNode('profileData.formation');
if(profileDataTop){
    profileDataTop[clientParams.arg] = 3;
    setProfileNode('profileData.formation', profileDataTop);
}

FunctionResponse({ val: profileDataTop });