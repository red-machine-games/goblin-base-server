local BOOKING_KEY = KEYS[1]
local QUOTA_LIFETIME_MS = KEYS[2]

local pinx_and_pid = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')

if pinx_and_pid[1] and pinx_and_pid[2] then
    local pair_key = 'pair:' .. pinx_and_pid[1]
    local pair_stat = redis.call('hget', pair_key, 'stat')
    if pair_stat == '4' then
        local opponents_pids_and_stuff = redis.call('hmget', pair_key, 'pida', 'pidb', 'opbot', 'hida', 'hidb')
        local booking_key_a = redis.call('get', 'pidnx:' .. opponents_pids_and_stuff[1])
        if redis.call('get', 'pidnx:' .. opponents_pids_and_stuff[1]) == booking_key_a then
            redis.call('del', 'pidnx:' .. opponents_pids_and_stuff[1])
        end
        if booking_key_a then
            redis.call('del', 'pinx:' .. booking_key_a)
        end
        if opponents_pids_and_stuff[3] ~= '1' then
            local booking_key_b = redis.call('get', 'pidnx:' .. opponents_pids_and_stuff[2])
            if redis.call('get', 'pidnx:' .. opponents_pids_and_stuff[2]) == booking_key_b then
                redis.call('del', 'pidnx:' .. opponents_pids_and_stuff[2])
            end
            redis.call('del', 'pinx:' .. booking_key_b)
        end
        redis.call('incrby', 'the_occupation', 1)
        local pair_model = redis.call('hget', pair_key, 'mdl') or '-1'
        redis.call('del', pair_key)
        redis.call('set', 'qot:' .. pinx_and_pid[1] .. ':2', pair_model, 'px', QUOTA_LIFETIME_MS)
        if opponents_pids_and_stuff[3] ~= '1' then
            local player_lags = pinx_and_pid[2] == opponents_pids_and_stuff[1] and 'MAX;0' or '0;MAX'
            redis.call(
                'publish',
                'gr-pub',
                '-1//2;0;' .. opponents_pids_and_stuff[1] .. ';' .. opponents_pids_and_stuff[2] .. ';' ..
                        opponents_pids_and_stuff[4] .. ';' .. opponents_pids_and_stuff[5] .. ';' ..
                        player_lags .. ';;' .. pinx_and_pid[1]
            )
        else
            redis.call(
                'publish', 'gr-pub', '-1//2;1;' .. opponents_pids_and_stuff[1] .. ';' .. opponents_pids_and_stuff[2] .. ';' ..
                            opponents_pids_and_stuff[4] .. ';' .. opponents_pids_and_stuff[5] .. ';' ..
                            'MAX;-1;;' .. pinx_and_pid[1])
        end
        return '1'
    else
        return nil
    end
else
    return nil
end