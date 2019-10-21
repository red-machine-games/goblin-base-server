if(args.isBot){
    await lock.self();
    let thisIsPrivateData = await getProfileNode('profileData.thisIsPrivateData'),
        thisIsPublicData = await getPublicProfileNode(selfHumanId, 'publicProfileData.thisIsPublicData');
    PvpResponse({ some: `bot payload ${thisIsPrivateData} ${thisIsPublicData}` });
} else if(args.isA){
    PvpResponse({ some: 'payload a' });
} else {
    PvpResponse({ some: 'payload b' });
}