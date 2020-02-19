await lock.self();
var profileVersion = await getProfileNode('ver');
var profileData = await getProfileNode('profileData');
var publicProfileData = await getPublicProfileNode(selfHumanId, 'publicProfileData');