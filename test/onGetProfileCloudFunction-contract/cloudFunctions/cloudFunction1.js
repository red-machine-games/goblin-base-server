var laVer = await getProfileNode('ver'),
    mutationsCount = await getProfileNode('profileData.mutationsCount'),
    laGets = await getProfileNode('profileData.getsCount');

FunctionResponse({ laVer, mutationsCount, laGets })