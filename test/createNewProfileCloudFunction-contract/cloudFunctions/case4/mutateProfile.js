await lock.self();

var ver = await getProfileNode('ver'),
    profileData = await getProfileNode('profileData');

if(ver === 1 && profileData && profileData.upgrade === 'me'){
    setProfileNode('profileData.upgrade', undefined);
    setProfileNode('profileData.benefit', 'atmosphere');
    setProfileNode('ver', 2);
}

MutateProfileResponse();