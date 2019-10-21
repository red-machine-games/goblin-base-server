await lock.self();

var profileDataTop = await getProfileNode('profileData.motif');
if(_.isArray(profileDataTop)){
    profileDataTop.push(clientParams.arg);
    setProfileNode('profileData.motif', profileDataTop);
}

FunctionResponse({ val: profileDataTop });