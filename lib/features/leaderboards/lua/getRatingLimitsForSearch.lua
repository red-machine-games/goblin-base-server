local PID = KEYS[1]
local WL = tonumber(KEYS[2])
local WL_VECTOR = KEYS[3]
local RANGE = tonumber(KEYS[4])
local SEGMENT = KEYS[5]

local target_zset = 'rc:' .. SEGMENT
local target_player_position = redis.call('zrevrank', target_zset, PID)

if target_player_position then
    local target_player_rating = redis.call('zscore', target_zset, PID)
    local leaderboard_size = redis.call('zcount', target_zset, '-inf', '+inf')

    local upper_bound, lower_bound, wl_bound
    if WL_VECTOR == '1' then
        local tpp_minus_wl = target_player_position - WL
        local upper_index = tpp_minus_wl - RANGE
        if upper_index <= 0 then
            upper_bound = (upper_index + RANGE <= 0) and -1 or 0
        elseif upper_index == 0 then
            upper_bound = 0
        end
        if upper_bound ~= -1 and upper_bound ~= 0 then
            upper_bound = redis.call('zrevrange', target_zset, upper_index, upper_index, 'WITHSCORES')[2]
        end
        if upper_bound == -1 or WL == 0 then
            wl_bound = -1
        else
            wl_bound = redis.call('zrevrange', target_zset, tpp_minus_wl - 1, tpp_minus_wl - 1, 'WITHSCORES')[2]
        end
        local lower_index = target_player_position + RANGE
        if lower_index >= leaderboard_size - 1 then
            lower_bound = 0
        else
            lower_bound = redis.call('zrevrange', target_zset, lower_index, lower_index, 'WITHSCORES')
            if #lower_bound == 0 then
                lower_bound = 0
            else
                lower_bound = lower_bound[2]
            end
        end
    elseif WL_VECTOR == '0' then
        local tpp_plus_wl = target_player_position + WL
        local lower_index = tpp_plus_wl + RANGE
        if lower_index >= leaderboard_size - 1 then
            lower_bound = (lower_index - RANGE >= leaderboard_size - 1) and -1 or 0
        end
        if lower_bound ~= -1 and lower_bound ~= 0 then
            lower_bound = redis.call('zrevrange', target_zset, lower_index, lower_index, 'WITHSCORES')[2]
        end
        if lower_bound == -1 or WL == 0 then
            wl_bound = -1
        else
            wl_bound = redis.call('zrevrange', target_zset, tpp_plus_wl + 1, tpp_plus_wl + 1, 'WITHSCORES')[2]
        end
        local upper_index = target_player_position - RANGE
        if upper_index <= 0 then
            upper_bound = 0
        end
        if upper_bound ~= 0 then
            upper_bound = redis.call('zrevrange', target_zset, upper_index, upper_index, 'WITHSCORES')[2]
        end
    end

    return tostring(upper_bound) .. ';' .. tostring(lower_bound) .. ';' .. tostring(wl_bound) .. '/' .. tostring(target_player_rating)
else
    return nil
end