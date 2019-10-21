await lock.self();

var ratingFromSegm1 = await getSelfRating('segm1'),
    ratingFromSegm2 = await getSelfRating('segm2'),
    someProfileNode = await getProfileNode('profileData.grand');

FunctionResponse({
    segm1: ratingFromSegm1,
    segm2: ratingFromSegm2,
    grand: someProfileNode
});