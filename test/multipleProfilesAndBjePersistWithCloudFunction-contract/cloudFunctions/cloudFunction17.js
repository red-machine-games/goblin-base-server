await lock.some([1, 2]);

setSomeProfileNode(1, 'publicProfileData.sphere.silence', 'strike');
setSomeProfileNode(2, 'publicProfileData.sphere.cruelty', 'crosswalk');

var pnode1 = await getPublicProfileNode(1, 'publicProfileData.sphere.silence'),
    pnode2 = await getPublicProfileNode(2, 'publicProfileData.sphere.cruelty');

FunctionResponse({ pnode1, pnode2 });