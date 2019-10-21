await lock.self();

var conception = await getProfileNode('profileData.bike');

await relock.some(2);

var letter = await getSomeProfileNode(2, 'profileData.bike');

FunctionResponse({ conception, letter });
