var laVersion = await getProfileNode('ver');

if(laVersion < 2){
    let mutationsCount = await getProfileNode('profileData.mutationsCount');
    setProfileNode('ver', laVersion + 1);
    setProfileNode('profileData.mutationsCount', mutationsCount + 1);
}

MutateProfileResponse();