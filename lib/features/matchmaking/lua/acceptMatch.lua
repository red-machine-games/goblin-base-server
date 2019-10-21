local PID = KEYS[1]
local NOW = tonumber(KEYS[2])
local TIME_FOR_ACCEPTANCE = tonumber(KEYS[3])
local REMEMBER_OPPONENT_FOR_A_WHILE = KEYS[4]

local stat = redis.call('hget', 'qplr:' .. PID, 'stat')

if stat then
    if stat == '0' or stat == '2' then
        return stat
    elseif stat == '1' then
        local qplr = redis.call('hmget', 'qplr:' .. PID, 'upd', 'opp', 'opbot')
        if tonumber(qplr[1]) + TIME_FOR_ACCEPTANCE > NOW then
            if qplr[3] == '1' then
                local room = redis.call('zrevrangebyscore', 'grooms', '+inf', '-inf', 'withscores', 'limit', '0', '1')

                if room[1] == nil or room[1] == false or tonumber(room[2]) < 1 then
                    redis.call('del', 'qplr:' .. PID, 'qplr:' .. qplr[2])
                    return '-1'
                end

                local gameroom_ip_address = room[1]
                local player_unique_key_and_profile_data = redis.call('hmget', 'qplr:' .. PID, 'ky', 'bpd')
                redis.call('hdel', 'qplr:' .. PID, 'bpd')
                redis.call(
                    'hmset', 'grmb:' .. gameroom_ip_address .. ':' .. player_unique_key_and_profile_data[1],
                    'upd', NOW, 'opp', qplr[2], 'stat', '0', 'pid', PID, 'opbot', '1',
                    'bpd', player_unique_key_and_profile_data[2]
                )
                redis.call('zincrby', 'grooms', -1, gameroom_ip_address)
                redis.call('hmset', 'qplr:' .. PID, 'grip', gameroom_ip_address, 'stat', '3', 'upd', NOW)

                if REMEMBER_OPPONENT_FOR_A_WHILE ~= '0' then
                    local bot_human_id = redis.call('hget', 'qplr:' .. PID, 'bhid')
                    if bot_human_id then
                        redis.call('set', 'mmbrem:' .. PID, bot_human_id, 'px', REMEMBER_OPPONENT_FOR_A_WHILE)
                    end
                end

                return '3;' .. gameroom_ip_address .. ';' .. player_unique_key_and_profile_data[1]
            else
                local qopp_stat = redis.call('hget', 'qplr:' .. qplr[2], 'stat')
                if qopp_stat == '1' then
                    redis.call('hset', 'qplr:' .. PID, 'stat', '2')
                    return '2'
                elseif qopp_stat == '2' then
                    local room = redis.call('zrevrangebyscore', 'grooms', '+inf', '-inf', 'withscores', 'limit', '0', '1')

                    if room[1] == nil or room[1] == false or tonumber(room[2]) < 1 then
                        redis.call('del', 'qplr:' .. PID, 'qplr:' .. qplr[2])
                        redis.call('publish', 'mm-pub', qplr[2] .. '//3')
                        return '-1'
                    end

                    local gameroom_ip_address = room[1]
                    local player_a_unique_key = redis.call('hget', 'qplr:' .. PID, 'ky')
                    local player_b_unique_key = redis.call('hget', 'qplr:' .. qplr[2], 'ky')
                    redis.call(
                        'hmset', 'grmb:' .. gameroom_ip_address .. ':' .. player_a_unique_key,
                        'upd', NOW, 'opp', qplr[2], 'stat', '0', 'pid', PID
                    )
                    redis.call(
                        'hmset', 'grmb:' .. gameroom_ip_address .. ':' .. player_b_unique_key,
                        'upd', NOW, 'opp', PID, 'stat', '0', 'pid', qplr[2]
                    )
                    redis.call('zincrby', 'grooms', -1, gameroom_ip_address)
                    redis.call('hmset', 'qplr:' .. PID, 'grip', gameroom_ip_address, 'stat', '3', 'upd', NOW)
                    redis.call('hmset', 'qplr:' .. qplr[2], 'grip', gameroom_ip_address, 'stat', '3', 'upd', NOW)

                    redis.call('publish', 'mm-pub', qplr[2] .. '//4;' .. gameroom_ip_address .. ';' .. player_b_unique_key)

                    return '3;' .. gameroom_ip_address .. ';' .. player_a_unique_key
                else
                    return nil
                end
            end
        else
            return nil
        end
    end
else
    return nil
end