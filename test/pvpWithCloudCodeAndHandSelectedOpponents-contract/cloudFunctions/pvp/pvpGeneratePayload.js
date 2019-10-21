if(args.isBot){
    await lock.self();
    let thisIsPrivateData = await getProfileNode('profileData.thisIsPrivateData');
    PvpResponse({ some: `bot payload ${thisIsPrivateData} ${selfHumanId}` });
} else if(args.isA){
    PvpResponse({ some: 'payload a' });
} else {
    PvpResponse({ some: 'payload b' });
}