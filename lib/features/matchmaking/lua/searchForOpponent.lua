redis.replicate_commands()

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
local WL_VECTOR = KEYS[2]
local MATCHMAKING_LIMITS = KEYS[3]
local RATING = KEYS[4]
local NOW = tonumber(KEYS[5])
local SEARCH_IN_BOTH_SIDES = (KEYS[6] == '1')
local SEGMENT = KEYS[7]
local PLAYER_UNIQUE_MATCHMAKING_KEY = KEYS[8]
local TIME_FOR_SEARCH = tonumber(KEYS[9])
local N = 10

local room = redis.call('zrevrangebyscore', 'grooms', '+inf', '-inf', 'withscores', 'limit', '0', '1')

if room[1] == nil or room[1] == false or tonumber(room[2]) < 1 then
    return '0'
end

if redis.call('exists', 'qplr:' .. PID) ~= 1 then
    MATCHMAKING_LIMITS = MATCHMAKING_LIMITS:split(';')

    local S_RANGE_UPPER = tonumber(MATCHMAKING_LIMITS[1])
    local S_RANGE_LOWER = tonumber(MATCHMAKING_LIMITS[2])
    local S_RANGE_WL = tonumber(MATCHMAKING_LIMITS[3])

    local function search_forward()
        local return_candidate
        local from_rating = WL_VECTOR == '1' and (S_RANGE_WL == -1 and RATING or S_RANGE_WL) or RATING

        if S_RANGE_UPPER == -1 then
            return nil
        end
        local upper_bound = S_RANGE_UPPER == 0 and '+inf' or S_RANGE_UPPER
        local batch_queue = redis.call('zrangebyscore', 'sq:' .. SEGMENT, from_rating, '+inf', 'LIMIT', 0, N)
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

        local from_queue_pair = redis.call('zrangebyscore', 'sq:' .. SEGMENT, from_rating, upper_bound, 'LIMIT', 0, 2)
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
    local function search_backward()
        local return_candidate
        local from_rating = WL_VECTOR == '0' and (S_RANGE_WL == -1 and RATING or S_RANGE_WL) or RATING

        if S_RANGE_LOWER == -1 then
            return nil
        end
        local lower_bound = S_RANGE_LOWER == 0 and '-inf' or S_RANGE_LOWER
        local batch_queue = redis.call('zrevrangebyscore', 'sq:' .. SEGMENT, from_rating, '-inf', 'LIMIT', 0, N)
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

        local from_queue_pair = redis.call('zrevrangebyscore', 'sq:' .. SEGMENT, from_rating, lower_bound, 'LIMIT', 0, 2)
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

    local opponent_pid
    if WL_VECTOR == '1' then
        if not SEARCH_IN_BOTH_SIDES then
            opponent_pid = search_forward()
        else
            opponent_pid = search_forward()
            if not opponent_pid then opponent_pid = search_backward() end
        end
    else
        if not SEARCH_IN_BOTH_SIDES then
            opponent_pid = search_backward()
        else
            opponent_pid = search_backward()
            if not opponent_pid then opponent_pid = search_forward() end
        end
    end
    if opponent_pid then
        redis.call('hmset', 'qplr:' .. PID, 'stat', '1', 'opp', opponent_pid, 'upd', NOW, 'segm', SEGMENT, 'pid', PID, 'ky', PLAYER_UNIQUE_MATCHMAKING_KEY)
        redis.call('hmset', 'qplr:' .. opponent_pid, 'stat', '1', 'opp', PID, 'upd', NOW, 'segm', SEGMENT)
        redis.call('zrem', 'sq:' .. SEGMENT, PID, opponent_pid)
        redis.call('publish', 'mm-pub', opponent_pid .. '//1')
        return '3'
    else
        redis.call('hmset', 'qplr:' .. PID, 'stat', '0', 'upd', NOW, 'segm', SEGMENT, 'pid', PID, 'ky', PLAYER_UNIQUE_MATCHMAKING_KEY)
        redis.call('zadd', 'sq:' .. SEGMENT, RATING, PID)
        return '2'
    end
else
    return '1'
end