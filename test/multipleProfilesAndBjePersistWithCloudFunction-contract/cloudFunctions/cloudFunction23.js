await lock.self();

setProfileNode('profileData.a.b.c', 2);

var node1 = await getProfileNode('profileData.a.b.c'),
    node2 = await getProfileNode('profileData.a');

FunctionResponse({ node1, node2 });