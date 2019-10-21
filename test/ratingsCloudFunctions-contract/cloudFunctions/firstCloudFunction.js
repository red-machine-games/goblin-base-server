await lock.self();

var ratingFromSegm1 = await getSelfRating('segm1'),
    ratingFromSegm2 = await getSelfRating('segm2'),
    out = ratingFromSegm1;

setSelfRating('segm1', 22);
setSelfRating('segm2', 88);

setProfileNode('profileData.grand', 'appearance');

FunctionResponse({ out });