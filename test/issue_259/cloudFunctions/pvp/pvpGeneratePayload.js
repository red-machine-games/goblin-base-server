if(args.isBot){
    var hero;
    await lock.some(args.fromHid);
    var isBot = await checkIsBot(args.fromHid);
    if(isBot){
        let currentHero = await getPublicProfileNode(args.fromHid, 'publicProfileData.currentHero');
        hero = currentHero;
    } else {
        let profileData = await getSomeProfileNode(args.fromHid, 'profileData');
        hero = profileData.heroes[profileData.currentHeroNum];
        hero.AvatarId = profileData.currentAvatar;
        hero.name = profileData.name;
    }
    PvpResponse({payload: hero, isBot: true, isA: args.isA});
} else {
    let profileData = await getProfileNode('profileData');
    let hero = profileData.heroes[profileData.currentHeroNum];
    hero.AvatarId = profileData.currentAvatar;
    hero.name = profileData.name;
    var campaignData = null;
    if(clientParams !== undefined && clientParams.cId >= 0 && clientParams.oId >= 0)
        campaignData = {campaignId: clientParams.cId, opponentId: clientParams.oId, campaignProgress: profileData.campaignsProgress[clientParams.cId]};

    PvpResponse({payload: hero, isBot: false, campaignData: campaignData, isA: args.isA});
}