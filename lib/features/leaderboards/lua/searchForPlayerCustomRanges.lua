if string.split == nil then
    function string:split(inSplitPattern, outResults)
        if not outResults then
            outResults = {}
        end
        local theStart = 1
        local theSplitStart, theSplitEnd = string.find(self, inSplitPattern, theStart)
        while theSplitStart do
            table.insert(outResults, string.sub(self, theStart, theSplitStart - 1))
            theStart = theSplitEnd + 1
            theSplitStart, theSplitEnd = string.find(self, inSplitPattern, theStart)
        end
        table.insert(outResults, string.sub(self, theStart))
        return outResults
    end
end

local SEARCHER_PID = KEYS[1]
local CUSTOM_MATCHMAKING_LIMITS = KEYS[2]
local STRATEGY_BY_LADDER = KEYS[3] == '1'
local RANDOM_PICK_FROM = KEYS[4]
local FORBID_PID = KEYS[5]
local SEGMENT = KEYS[6]

if not RANDOM_PICK_FROM then
    RANDOM_PICK_FROM = 1
else
    RANDOM_PICK_FROM = tonumber(RANDOM_PICK_FROM)
end

local the_time = redis.call('time')
math.randomseed(tonumber(the_time[1] .. tonumber(the_time[2] / 1000)))

local min_pick = FORBID_PID ~= '0' and 3 or 2

local function pick_from_sample(the_sample)
    if #the_sample == 0 then
        return nil
    elseif #the_sample > 1 then
        if RANDOM_PICK_FROM > 1 then
            local part = math.ceil(#the_sample / min_pick)
            local randoms = {}
            for i=1, math.min(min_pick, #the_sample), 1 do
                table.insert(randoms, the_sample[math.random((i - 1) * part, math.min(i * part, #the_sample))])
            end
            for i=1, #randoms, 1 do
                local the_pick = table.remove(randoms, math.random(#randoms))
                if the_pick ~= FORBID_PID and the_pick ~= SEARCHER_PID then
                    return the_pick
                end
            end
            return nil
        else
            for i=1, #the_sample, 1 do
                if the_sample[i] ~= FORBID_PID and the_sample[i] ~= SEARCHER_PID then
                    return the_sample[i]
                end
            end
            return nil
        end
    elseif the_sample[1] == FORBID_PID or the_sample[1] == SEARCHER_PID then
        return nil
    else
        return the_sample[1]
    end
end

local target_zset = 'rc:' .. SEGMENT
local leaderboard_size
local limit_of_pick

if RANDOM_PICK_FROM < min_pick then
    limit_of_pick = min_pick
else
    limit_of_pick = RANDOM_PICK_FROM
end

if STRATEGY_BY_LADDER then
    leaderboard_size = redis.call('zcount', target_zset, '-inf', '+inf')
end

local function doSearch(limits)
    local cmd

    if (limits[1] == '-inf' and limits[2] == '-inf') or (limits[1] == '+inf' and limits[2] == '+inf') then
        return nil
    elseif limits[1] == '-inf' or limits[2] == '+inf' then
        cmd = 'zrangebyscore'
    elseif limits[1] == '+inf' or limits[2] == '-inf' then
        cmd = 'zrevrangebyscore'
    elseif tonumber(limits[1]) <= tonumber(limits[2]) then
        cmd = 'zrangebyscore'
    else
        cmd = 'zrevrangebyscore'
    end

    return pick_from_sample(redis.call(cmd, target_zset, limits[1], limits[2], 'LIMIT', 0, limit_of_pick))
end

local function doSearchLadderDecorator(limits)
    if limits[1] ~= '+inf' and limits[1] ~= '-inf' then
        local the_place = math.max(math.min(tonumber(limits[1]) - 1, leaderboard_size - 1), 0)
        limits[1] = redis.call('zrevrange', target_zset, the_place, the_place, 'WITHSCORES')[2]
    end
    if limits[2] ~= '+inf' and limits[2] ~= '-inf' then
        local the_place = math.max(math.min(tonumber(limits[2]) - 1, leaderboard_size - 1), 0)
        limits[2] = redis.call('zrevrange', target_zset, the_place, the_place, 'WITHSCORES')[2]
    end

    return doSearch(limits)
end

CUSTOM_MATCHMAKING_LIMITS = CUSTOM_MATCHMAKING_LIMITS:split(';')
for i=1, #CUSTOM_MATCHMAKING_LIMITS, 1 do
    local the_limits = CUSTOM_MATCHMAKING_LIMITS[i]:split(',')
    local the_candidate = STRATEGY_BY_LADDER and doSearchLadderDecorator(the_limits) or doSearch(the_limits)
    if the_candidate then
        return the_candidate
    end
end

return nil