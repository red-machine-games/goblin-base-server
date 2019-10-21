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
local CUSTOM_MATCHMAKING_LIMITS = KEYS[2]
local TARGET_PLAYER_RATING = KEYS[3]
local NOW = tonumber(KEYS[4])
local SEGMENT = KEYS[5]
local PLAYER_UNIQUE_MATCHMAKING_KEY = KEYS[6]
local TIME_FOR_SEARCH = tonumber(KEYS[7])
local N = 10

local room = redis.call('zrevrangebyscore', 'grooms', '+inf', '-inf', 'withscores', 'limit', '0', '1')

if room[1] == nil or room[1] == false or tonumber(room[2]) < 1 then
    return '0'
end

if redis.call('exists', 'qplr:' .. PID) ~= 1 then
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

        local batch_queue = redis.call(cmd, 'sq:' .. SEGMENT, limits[1], limits[2], 'LIMIT', 0, N)
        for i = 1, #batch_queue, 1 do
            local candidate_from_queue = redis.call('hmget', 'qplr:' .. batch_queue[i], 'stat', 'upd')
            if candidate_from_queue[1] ~= '0' then
                redis.call('zrem', 'sq:' .. SEGMENT, batch_queue[i])
            end
            if candidate_from_queue[1] == '0' and tonumber(candidate_from_queue[2]) + TIME_FOR_SEARCH < NOW then
                redis.call('zrem', 'sq:' .. SEGMENT, batch_queue[i])
                redis.call('del', 'qplr:' .. batch_queue[i])
            end
        end

        local return_candidate
        local from_queue_pair = redis.call(cmd, 'sq:' .. SEGMENT, limits[1], limits[2], 'LIMIT', 0, 2)
        if #from_queue_pair == 0 then
            return nil
        elseif from_queue_pair[1] == PID then
            if #from_queue_pair == 1 then
                return nil
            else
                return_candidate = from_queue_pair[2]
            end
        else
            return_candidate = from_queue_pair[1]
        end

        return return_candidate
    end

    local the_candidate
    CUSTOM_MATCHMAKING_LIMITS = CUSTOM_MATCHMAKING_LIMITS:split(';')
    for i=1, #CUSTOM_MATCHMAKING_LIMITS, 1 do
        the_candidate = doSearch(CUSTOM_MATCHMAKING_LIMITS[i]:split(','))
        if the_candidate then
            break
        end
    end

    if the_candidate then
        redis.call('hmset', 'qplr:' .. PID, 'stat', '1', 'opp', the_candidate, 'upd', NOW, 'segm', SEGMENT, 'pid', PID, 'ky', PLAYER_UNIQUE_MATCHMAKING_KEY)
        redis.call('hmset', 'qplr:' .. the_candidate, 'stat', '1', 'opp', PID, 'upd', NOW, 'segm', SEGMENT)
        redis.call('zrem', 'sq:' .. SEGMENT, PID, the_candidate)
        redis.call('publish', 'mm-pub', the_candidate .. '//1')
        return '3'
    else
        redis.call('hmset', 'qplr:' .. PID, 'stat', '0', 'upd', NOW, 'segm', SEGMENT, 'pid', PID, 'ky', PLAYER_UNIQUE_MATCHMAKING_KEY)
        redis.call('zadd', 'sq:' .. SEGMENT, TARGET_PLAYER_RATING, PID)
        return '2'
    end
else
    return '1'
end