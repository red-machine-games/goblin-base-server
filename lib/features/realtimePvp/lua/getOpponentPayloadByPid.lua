local PID = KEYS[1]

local pid_index = redis.call('get', 'pidnx:' .. PID)

if pid_index then
    local pair_index = redis.call('hget', 'pinx:' .. pid_index, 'prid')
    if pair_index then
        local pair_opponents = redis.call('hmget', 'pair:' .. pair_index, 'pida', 'pidb')
        local is_a_player = PID == pair_opponents[1]
        local opponent_payload = redis.call('hget', 'pair:' .. pair_index, is_a_player and 'pldb' or 'plda')
        return opponent_payload
    else
        return nil
    end
else
    return nil
end