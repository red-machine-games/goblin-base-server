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

local PID = KEYS[1]
local PLACES = KEYS[2]
local SEGMENT = KEYS[3]

local target_zset = 'rc:' .. SEGMENT
local target_player_score = redis.call('zscore', target_zset, PID)

if target_player_score then
    local leaderboard_size = redis.call('zcount', target_zset, '-inf', '+inf')
    local out = {}

    local the_places = PLACES:split(',')
    for i=1, #the_places, 1 do
        local the_place = math.max(math.min(tonumber(the_places[i]) - 1, leaderboard_size - 1), 0)
        table.insert(out, redis.call('zrevrange', target_zset, the_place, the_place, 'WITHSCORES')[2])
    end

    table.insert(out, target_player_score)

    return out
else
    return { target_player_score }
end