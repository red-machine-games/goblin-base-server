await lock.self();
var profileVersion = await getProfileNode('ver');
await relock.self();
var profileData = await getProfileNode('profileData');
await relock.self();
var publicProfileData = await getPublicProfileNode(selfHumanId, 'publicProfileData');