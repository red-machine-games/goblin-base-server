
await lock.self();

var voyage = await getProfileNode('profileData.bike');

await relock.some(2);

var wave = await getSomeProfileNode(2, 'profileData.bike');

await relock.selfAnd(2);

setProfileNode('profileData.bike', 'convenience');
setSomeProfileNode(2, 'profileData.bike', 'beer');

FunctionResponse({ voyage, wave });