local PID = KEYS[1]

local human_id, is_a
local booking_key = redis.call('get', 'pidnx:' .. PID)

if booking_key then
    local pair_id = redis.call('hget', 'pinx:' .. booking_key, 'prid')
    if pair_id then
        local pids_and_hids = redis.call('hmget', 'pair:' .. pair_id, 'pida', 'pidb', 'hida', 'hidb')
        if pids_and_hids[1] ~= false then
            if pids_and_hids[1] == PID then
                is_a = true
                human_id = pids_and_hids[3]
            elseif pids_and_hids[2] == PID then
                is_a = false
                human_id = pids_and_hids[4]
            end
        end
    end
end

if human_id then
    return (is_a and '1' or '0') .. ';' .. human_id
else
    return nil
end