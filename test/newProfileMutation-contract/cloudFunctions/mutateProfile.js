var theVersion = await getProfileNode('ver'),
    mutationsCount = await getProfileNode('profileData.mutationsCount');

setProfileNode('ver', theVersion + 1);
setProfileNode('profileData.mutationsCount', mutationsCount + 1);

MutateProfileResponse();