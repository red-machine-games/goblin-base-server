await lock.some(2);

FunctionResponse({ mutationsCount: await getSomeProfileNode(2, 'profileData.mutationsCount') });